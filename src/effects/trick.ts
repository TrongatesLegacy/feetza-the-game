// Effect.Trick: one of the scene's own tricks, which the topping turns on (docs/effects-plan.md, step 3). The trick
// itself is the scene's (src/game/toppingKit.ts, src/scenes/GameScene.ts): it asks the run how strongly it's on
// (Run.trick: the levels of every topping declaring it), never which topping it is. A new topping can declare an
// existing trick and it works with no game code changed.
//
//   KitTopping({ id: 'foldover', …, effects: [Effect.Trick(Trick.FoldOver)] })
//
// Its card text is the topping's own (a kit topping's words are written by hand: quiet).

import { effectKind } from './kind';
import { Tag, type TagId } from './tags';

/** Every trick a topping can turn on, with what it is (`auto`: it does damage by itself, with no smack: the STATS
 *  tab's and the sim bot's automatic toppings). */
export const TRICK_DEFS = {
  pizzaStone: { what: 'the first stomp(s) each wave on the middle pizza are blocked' },
  midnightSnack: { what: 'from wave 50: more smack damage and tips' },
  deliveryRush: { what: 'tips for a wave cleared quickly' },
  tipInterest: { what: 'interest on unspent tips after every wave' },
  tiedLaces: { what: 'feet tied together: smack one and the other takes a share', auto: true },
  sixthSense: { what: 'feet about to stomp glow and take more damage' },
  doorbell: { what: 'a foot’s spot glows before it arrives; its first smack crits' },
  coldFeet: { what: 'feet move at half speed for the first seconds of every wave' },
  ovenMitts: { what: 'your peel can’t be stunned, slowed, frozen or snatched' },
  napkinNinja: { what: 'misses fling a napkin at a foot', auto: true },
  doubleCheese: { what: 'combos regrow slices on your weakest pizza' },
  foldOver: { what: 'every few smacks hit twice' },
  woodFired: { what: 'every few smacks are a fireball that burns', auto: true },
  mozzWeb: { what: 'smacks string cheese to nearby feet, slowing them' },
  echoChamber: { what: 'smacks echo: the same spot is smacked again' },
  lastSlice: { what: 'down to one pizza: more damage, and smacks hit all in range' },
  headChef: { what: 'every throw fires an extra prop' },
  garlicDip: { what: 'feet drop dip pots to smack for tips' },
  crustCrumbs: { what: 'kills drop crumbs that make Golden Crusts' },
  spareNapkin: { what: 'the first slices lost each wave grow back' },
  pizzaParty: { what: 'stomps are shared with the neighbours' },
  secondOven: { what: 'once a run, if your last pizza goes, all come back' },
  partyPopper: { what: 'a boss changing phase sets off confetti that stuns every foot' },
  rainbowRoad: { what: 'a shiny foot turns up before wave 20' },
  doughSpinner: { what: 'swirling the peel in circles charges the meter' },
  pizzaDrone: { what: 'a drone zaps feet', auto: true },
  crustArmour: { what: 'stomp shields on every pizza in boss waves' },
  areaSmack: { what: 'smacks hit every foot in range' },
  leftovers: { what: 'the next pizza to go stale stays fresh longer (armed)' },
  lastDough: { what: 'a pizza that drops to 1 slice regains some, once (armed)' },
  guardianAngel: { what: 'the next pizza destroyed rises again (armed)' },
} as const satisfies Record<string, { what: string; auto?: boolean }>;
export type TrickId = keyof typeof TRICK_DEFS;

/** Every trick's name, typed. */
export const Trick = Object.fromEntries(Object.keys(TRICK_DEFS).map((k) => [k[0].toUpperCase() + k.slice(1), k])) as {
  readonly [K in TrickId as Capitalize<K>]: K;
};

/** Is this trick one that does damage by itself (TRICK_DEFS auto)? */
export const isAutoTrick = (t: TrickId): boolean => 'auto' in TRICK_DEFS[t] && !!(TRICK_DEFS[t] as { auto?: boolean }).auto;

export interface TrickData {
  readonly kind: 'trick';
  trick: TrickId;
}

const make = (trick: TrickId): TrickData => ({ kind: 'trick', trick });

export const TrickEffect = effectKind('trick', make, {
  // (read by the scene through Run.trick; nothing to apply)
  apply: () => {},
  describe: (e) => TRICK_DEFS[e.trick].what,
  scale: (e) => e,
  tags: (e): TagId[] => [Tag.Trick(e.trick)],
  quiet: true,
});
