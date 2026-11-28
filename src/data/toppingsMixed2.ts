// Mixed toppings: 20 more (5 per rarity). Each rarity has a Pick (choose 1 of 3 random toppings of that
// rarity, free); several throw the shared projectiles. Toppings with no stat change are run by the scene
// through src/game/toppingKit.ts, keyed by id.

import { P, TRIG } from '../game/abilities';
import type { Upgrade } from './upgrades';
import { OnPick, UpgradeKind } from './itemKinds';
import { Rarity } from './rarity';
import { KitTopping, PickTopping, ProcTopping } from './toppingDefs';
import { procGrowth } from '../game/cardText';

const { hit, front, rnd, tough, K, ST, TH } = P;
const { every, stomp } = TRIG;

export const MIXED_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  PickTopping({
    id: 'pickcommon', name: 'Common Pick', icon: '🎁',
    rarity: Rarity.Common,
  }),
  ProcTopping({
    id: 'anchovytoss', name: 'Anchovy Toss', icon: '🐠',
    rarity: Rarity.Common,
    maxLevel: 4,
    proc: { trigger: every(6), fx: [TH('anchovy', 'straight', 1.5, front(1))], color: 0x8fb8d8, vfx: 'burst' },
  }),
  ProcTopping({
    id: 'crustbumper', name: 'Crust Bumper', icon: '🎳',
    rarity: Rarity.Common,
    maxLevel: 3,
    proc: { trigger: stomp, fx: [K(1000, hit()), ST(0.4, hit())], color: 0xd9a066, vfx: 'wind' },
  }),
  KitTopping({
    id: 'sparenapkin', name: 'Spare Napkin', icon: '🩹',
    rarity: Rarity.Common,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? 'The first slice lost each wave grows back after it' : 'The first 2 slices lost each wave grow back after it (was 1)') },
  }),
  KitTopping({
    id: 'tiedlaces', name: 'Tied Laces', icon: '🪢',
    rarity: Rarity.Common,
    maxLevel: 3,
    text: { up: (l) => (l <= 1 ? 'Every 8s: ties 2 feet together; smack one, the other takes 0.5×' : `Every ${(8 / (1 + 0.2 * (l - 1))).toFixed(1)}s: ties 2 feet together; smack one, the other takes ${0.5 + 0.25 * (l - 1)}× (LV 1: every 8s, 0.5×)`) },
  }),

  // ——— Rare ———
  PickTopping({
    id: 'pickrare', name: 'Rare Pick', icon: '🎀',
    rarity: Rarity.Rare,
  }),
  ProcTopping({
    id: 'meatballbounce', name: 'Meatball Bounce', icon: '🍝',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: { trigger: every(6), fx: [TH('meatball', 'bounce', 2, rnd(1), { more: [1.5, 1] })], color: 0xb0603a, vfx: 'burst' },
    text: { up: (l) => (l <= 1 ? 'Every 6s: a meatball bounces through 3 feet (2×, 1.5×, 1×)' : procGrowth(l)) },
  }),
  ProcTopping({
    id: 'pizzacutter', name: 'Pizza Cutter', icon: '💿',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: { trigger: every(7), fx: [TH('pizzacutter', 'boomerang', 2, front(1), { more: [2] })], color: 0xc7ccd4, vfx: 'burst' },
    text: { up: (l) => (l <= 1 ? 'Every 7s: a pizza cutter boomerang hits out and back (2× each)' : procGrowth(l)) },
  }),
  KitTopping({
    id: 'deliveryrush', name: 'Delivery Rush', icon: '🛵',
    rarity: Rarity.Rare,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? 'Clear a wave in under 20s for +30 tips (big waves get longer)' : 'Clear a wave in under 20s for +60 tips (was +30; big waves get longer)') },
  }),
  KitTopping({
    id: 'foldover', name: 'Fold Over', icon: '🌮',
    rarity: Rarity.Rare,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? 'Every 4th smack hits twice' : 'Every 3rd smack hits twice (was every 4th)') },
  }),

  // ——— Epic ———
  PickTopping({
    id: 'pickepic', name: 'Epic Pick', icon: '🪅',
    rarity: Rarity.Epic,
  }),
  ProcTopping({
    id: 'calzonecannon', name: 'Calzone Cannon', icon: '🌯',
    rarity: Rarity.Epic,
    maxLevel: 3,
    proc: { trigger: every(9), fx: [TH('calzone', 'explode', 4, tough(1), { r: 210, splash: 2 })], color: 0xe8a040, vfx: 'burst' },
    text: { up: (l) => (l <= 1 ? 'Every 9s: a calzone lob that explodes (4×, 2× nearby)' : procGrowth(l)) },
  }),
  KitTopping({
    id: 'ovenmitts', name: 'Oven Mitts', icon: '🥊',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { up: "Your peel can't be stunned, slowed, frozen or snatched" },
  }),
  KitTopping({
    id: 'tipinterest', name: 'Tip Interest', icon: '🏦',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { up: '+5% of your unspent tips after every wave (up to 40)' },
  }),
  KitTopping({
    id: 'mozzweb', name: 'Mozzarella Web', icon: '🕸️',
    rarity: Rarity.Epic,
    maxLevel: 3,
    text: { up: (l) => (l <= 1 ? '25% of smacks string cheese to 2 nearby feet: 50% slow, 3s' : `${25 + 10 * (l - 1)}% of smacks string cheese to 2 nearby feet: 50% slow, 3s (LV 1: 25%)`) },
  }),

  // ——— Legendary ———
  PickTopping({
    id: 'picklegendary', name: 'Legendary Pick', icon: '🎖️',
    rarity: Rarity.Legendary,
  }),
  KitTopping({
    id: 'peelroulette', name: 'Peel Roulette', icon: '🎡',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Choose 1 of 3 of your other peels to play the rest of the run' },
    kind: UpgradeKind.Unique,
    onPick: OnPick.Roulette,
    offerIf: (env) => env.otherPeels >= 3,
  }),
  KitTopping({
    id: 'headchef', name: 'Head Chef', icon: '👩‍🍳',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Every throw (peel or topping) fires 1 extra prop' },
    offerIf: (env) => env.throws,
  }),
  KitTopping({
    id: 'secondoven', name: 'Second Oven', icon: '🏭',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Once a run, if your last pizza goes, all come back on 3 slices' },
    kind: UpgradeKind.Unique,
  }),
  KitTopping({
    id: 'pizzaparty', name: 'Pizza Party', icon: '🥳',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Stomps are shared: half on the pizza, a quarter on each neighbour' },
  }),
];

