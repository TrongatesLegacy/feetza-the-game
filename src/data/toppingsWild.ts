// Wildcard toppings: 20 deliberately varied ones (5 per rarity). Some play with how you move the peel,
// some with timing, some are just fun. Most are run by the scene through src/game/toppingKit.ts, keyed by id.

import { P, TRIG } from '../game/abilities';
import type { Upgrade } from './upgrades';
import { NeedsMeter, OnPick } from './itemKinds';
import { Rarity } from './rarity';
import { Effect, Op, Stat, Trick, Unit } from '../effects';
import { KitTopping, ProcTopping, Topping } from './toppingDefs';
import { procGrowth } from '../game/cardText';

const { rnd, TH } = P;
const { every } = TRIG;

export const WILD_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  KitTopping({
    id: 'napkinninja', name: 'Napkin Ninja', icon: '🥷',
    rarity: Rarity.Common,
    maxLevel: 3,
    text: { up: (l) => (l <= 1 ? '20% of misses fling a napkin at a foot (0.5s stun)' : `${20 + 10 * (l - 1)}% of misses fling a napkin at a foot: 0.5s stun (LV 1: 20%)`) },
    effects: [
      Effect.Trick(Trick.NapkinNinja),
    ],
  }),
  KitTopping({
    id: 'extracrispy', name: 'Extra Crispy', icon: '🥓',
    rarity: Rarity.Common,
    maxLevel: 3,
    text: { up: '+1 max slice on your smallest pizza, right now' },
    effects: [
      Effect.OnPick(OnPick.Crispy),
    ],
  }),
  KitTopping({
    id: 'pizzastone', name: 'Pizza Stone', icon: '🟫',
    rarity: Rarity.Common,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? 'The first stomp each wave on your middle pizza is blocked' : 'The first 2 stomps each wave on your middle pizza are blocked (was 1)') },
    effects: [
      Effect.Trick(Trick.PizzaStone),
    ],
  }),
  KitTopping({
    id: 'garlicdip', name: 'Garlic Dip', icon: '🥣',
    rarity: Rarity.Common,
    maxLevel: 3,
    text: { up: (l) => (l <= 1 ? 'Feet sometimes drop a dip pot: smack it for +5 tips' : `${6 + 3 * (l - 1)}% of kills drop a dip pot: smack it for +5 tips (LV 1: 6%)`) },
    effects: [
      Effect.Trick(Trick.GarlicDip),
    ],
  }),
  KitTopping({
    id: 'crustcrumbs', name: 'Crust Crumbs', icon: '🍪',
    rarity: Rarity.Common,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? '5% of kills drop a crumb; 10 crumbs make a Golden Crust' : '10% of kills drop a crumb; 10 crumbs make a Golden Crust (was 5%)') },
    effects: [
      Effect.Trick(Trick.CrustCrumbs),
    ],
  }),

  // ——— Rare ———
  ProcTopping({
    id: 'rollingcutter', name: 'Rolling Cutter', icon: '☸️',
    rarity: Rarity.Rare,
    maxLevel: 4,
    proc: { trigger: every(6), fx: [TH('wheelcutter', 'roll', 2, rnd(1), { r: 90 })], color: 0xc7ccd4, vfx: 'burst' },
    text: { up: (l) => (l <= 1 ? 'Every 6s: a cutter wheel rolls through a lane (2× each foot)' : procGrowth(l)) },
  }),
  KitTopping({
    id: 'doublecheese', name: 'Double Cheese', icon: '🧈',
    rarity: Rarity.Rare,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? 'Every 25 combo regrows a slice on your weakest pizza' : 'Every 15 combo regrows a slice on your weakest pizza (was every 25)') },
    effects: [
      Effect.Trick(Trick.DoubleCheese),
    ],
  }),
  KitTopping({
    id: 'doorbell', name: 'Doorbell', icon: '🔔',
    rarity: Rarity.Rare,
    maxLevel: 1,
    text: { up: 'A foot’s spot glows 1s before it arrives; its first smack crits' },
    effects: [
      Effect.Trick(Trick.Doorbell),
    ],
  }),
  KitTopping({
    id: 'doughspinner', name: 'Dough Spinner', icon: '🍥',
    rarity: Rarity.Rare,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? 'Swirl the peel in circles to charge the meter' : 'Swirl the peel in circles: each full swirl charges the meter 9% (was 6%)') },
    needsMeter: NeedsMeter.Tank,
    effects: [
      Effect.Trick(Trick.DoughSpinner),
    ],
  }),
  KitTopping({
    id: 'crustarmour', name: 'Crust Armour', icon: '🦺',
    rarity: Rarity.Rare,
    maxLevel: 2,
    text: { up: '+1 stomp shield on every pizza in boss waves' },
    effects: [
      Effect.Trick(Trick.CrustArmour),
    ],
  }),

  // ——— Epic ———
  KitTopping({
    id: 'pizzadrone', name: 'Pizza Drone', icon: '🛸',
    rarity: Rarity.Epic,
    maxLevel: 3,
    text: { up: (l) => (l <= 1 ? 'A drone zaps a foot every 2s for 25% of a smack (range: twice your smack reach)' : `The drone zaps a foot every 2s for ${25 * l}% of a smack (LV 1: 25%)`) },
    effects: [
      Effect.Trick(Trick.PizzaDrone),
    ],
  }),
  KitTopping({
    id: 'woodfired', name: 'Wood-Fired', icon: '🏕️',
    rarity: Rarity.Epic,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? 'Every 10th smack is a fireball: 4× and it burns' : 'Every 7th smack is a fireball: 4× and it burns (was every 10th)') },
    effects: [
      Effect.Trick(Trick.WoodFired),
    ],
  }),
  KitTopping({
    id: 'echochamber', name: 'Echo Chamber', icon: '📣',
    rarity: Rarity.Epic,
    maxLevel: 2,
    text: { up: (l) => (l <= 1 ? '20% of smacks echo: the same spot is smacked again 0.5s later' : '30% of smacks echo: the same spot is smacked again 0.5s later (was 20%)') },
    effects: [
      Effect.Trick(Trick.EchoChamber),
    ],
  }),
  KitTopping({
    id: 'partypopper', name: 'Party Popper', icon: '🎊',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { up: 'When a boss changes phase, confetti stuns every foot for 1s' },
    effects: [
      Effect.Trick(Trick.PartyPopper),
    ],
  }),
  KitTopping({
    id: 'midnightsnack', name: 'Midnight Snack', icon: '🌙',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { up: 'From wave 50 on: +25% smack damage and tips' },
    effects: [
      Effect.Trick(Trick.MidnightSnack),
    ],
  }),

  // ——— Legendary ———
  KitTopping({
    id: 'lastslice', name: 'The Last Slice', icon: '☝️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Down to one pizza: +100% damage, and smacks hit all in range' },
    effects: [
      Effect.Trick(Trick.LastSlice),
    ],
  }),
  KitTopping({
    id: 'sixthsense', name: 'Sixth Sense', icon: '👁️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Feet about to stomp glow red and take +25% damage' },
    effects: [
      Effect.Trick(Trick.SixthSense),
    ],
  }),
  Topping({
    id: 'fulltank', name: 'Full Tank', icon: '⛽',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.SuperStart,
        Op.Set(Unit.Percent(100)),
      ),
    ],
    needsMeter: NeedsMeter.Tank,
  }),
  KitTopping({
    id: 'coldfeet', name: 'Cold Feet', icon: '🧦',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'For the first 5s of every wave, feet move at half speed' },
    effects: [
      Effect.Trick(Trick.ColdFeet),
    ],
  }),
  Topping({
    id: 'infiniteoven', name: 'Infinite Oven', icon: '🌡️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.CapBonus,
        Op.Add(Unit.Count(2)),
      ),
    ],
  }),
];
