// Shop toppings: 20 that bend the shop itself (5 per rarity), one trade-off in each rarity.
// Discounts stack additively up to 60% off; "one fewer card" never takes the shop below 1 card; free
// items carry a FREE tag. Prices and cards are worked out in src/game/shopDeals.ts.

import type { Upgrade } from './upgrades';
import { OnPick, UpgradeKind } from './itemKinds';
import { Rarity } from './rarity';
import { Effect, Op, Stat, Unit } from '../effects';
import { KitTopping, Topping } from './toppingDefs';

export const SHOP_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  Topping({
    id: 'couponclipper', name: 'Coupon Clipper', icon: '✂️',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.RerollLess,
        Op.Add(Unit.Amount(2)),
      ),
    ],
  }),
  KitTopping({
    id: 'bulkbuy', name: 'Bulk Buy', icon: '🛒',
    rarity: Rarity.Common,
    maxLevel: 2,
    text: { up: 'The 3rd topping you buy in each shop is 20% off' },
  }),
  KitTopping({
    id: 'happyhour', name: 'Happy Hour', icon: '🍹',
    rarity: Rarity.Common,
    maxLevel: 1,
    text: { up: 'Every 5th wave’s shop: all toppings 25% off' },
  }),
  Topping({
    id: 'dayold', name: 'Day-Old Deals', icon: '🧇',
    rarity: Rarity.Common,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.ConsumableDiscount,
        Op.Add(Unit.Percent(20)),
      ),
    ],
  }),
  Topping({
    id: 'discountbin', name: 'Discount Bin', icon: '🗑️',
    rarity: Rarity.Common,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.ShopDiscount,
        Op.Add(Unit.Percent(15)),
      ),
      Effect.Stat(
        Stat.CardDelta,
        Op.Sub(Unit.Count(1)),
      ),
    ],
  }),

  // ——— Rare ———
  KitTopping({
    id: 'freedelivery', name: 'Free Delivery', icon: '🚚',
    rarity: Rarity.Rare,
    maxLevel: 1,
    text: { up: 'One pizza from the counter is free, once this run' },
    kind: UpgradeKind.Unique,
  }),
  Topping({
    id: 'extrashelf', name: 'Extra Shelf', icon: '🪜',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.CardDelta,
        Op.Add(Unit.Count(1)),
      ),
    ],
  }),
  KitTopping({
    id: 'haggler', name: 'Haggler', icon: '🤝',
    rarity: Rarity.Rare,
    maxLevel: 1,
    text: { up: 'Each topping bought takes 10% off the next (up to 30%)' },
  }),
  Topping({
    id: 'freerefill', name: 'Free Refill', icon: '🔄',
    rarity: Rarity.Rare,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.FreeRerolls,
        Op.Add(Unit.Count(1)),
      ),
    ],
  }),
  Topping({
    id: 'rushorder', name: 'Rush Order', icon: '⏩',
    rarity: Rarity.Rare,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.CounterDiscount,
        Op.Add(Unit.Percent(30)),
      ),
      Effect.Stat(
        Stat.RerollMult,
        Op.Mul(Unit.Mult(2)),
      ),
    ],
  }),

  // ——— Epic ———
  KitTopping({
    id: 'bogo', name: 'Buy One Get One', icon: '✌️',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { up: 'The next topping you level up gets a free extra level' },
    kind: UpgradeKind.Unique,
    onPick: OnPick.Bogo,
  }),
  Topping({
    id: 'goldenticket', name: 'Golden Ticket', icon: '🎫',
    rarity: Rarity.Epic,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.GoldenDiscount,
        Op.Add(Unit.Percent(30)),
      ),
    ],
  }),
  KitTopping({
    id: 'chefsfav', name: 'Chef’s Favourite', icon: '💝',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { up: 'A Chef’s Special is always on the counter, 25% cheaper' },
  }),
  KitTopping({
    id: 'clearance', name: 'Clearance Rack', icon: '📉',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { up: 'One topping card in every shop is half price' },
  }),
  Topping({
    id: 'premiummenu', name: 'Premium Menu', icon: '💎',
    rarity: Rarity.Epic,
    maxLevel: 1,
    text: { down: 'Toppings and pizzas cost 20% more' },
    effects: [
      Effect.Stat(
        Stat.CardDelta,
        Op.Add(Unit.Count(2)),
      ),
      Effect.Stat(
        Stat.ShopDiscount,
        Op.Sub(Unit.Percent(20)),
      ),
      Effect.Stat(
        Stat.CounterMult,
        Op.Mul(Unit.Mult(1.2)),
      ),
    ],
  }),

  // ——— Legendary ———
  KitTopping({
    id: 'freelunch', name: 'Free Lunch', icon: '🥪',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Once every 10 waves, take any one topping card free' },
  }),
  Topping({
    id: 'ownersdiscount', name: 'Owner’s Discount', icon: '🏷️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'Everything in the shop is 25% off' },
    effects: [
      Effect.Stat(
        Stat.ShopDiscount,
        Op.Add(Unit.Percent(25)),
      ),
      Effect.Stat(
        Stat.GoldenDiscount,
        Op.Add(Unit.Percent(25)),
      ),
    ],
  }),
  KitTopping({
    id: 'bottomless', name: 'Bottomless Pizza', icon: '♾️',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'One free counter pizza every 10 waves' },
  }),
  KitTopping({
    id: 'stockroom', name: 'Stockroom Key', icon: '🔑',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    text: { up: 'The first card you buy in each shop restocks' },
  }),
  // (each level sets the Exclusive card's discount outright, not on top; LV1's catch stays the same at every level)
  Topping({
    id: 'exclusivemenu', name: 'Exclusive Menu', icon: '🎩',
    rarity: Rarity.Legendary,
    maxLevel: 4,
    text: { down: (_l, _auto, autoAt) => `${autoAt(1).down} (not per level)` },
    effects: [
      Effect.Stat(
        Stat.GuaranteedEpic,
        Op.Add(Unit.Count(1)),
        { atLevel: 1 },
      ),
      Effect.Stat(
        Stat.CardDelta,
        Op.Sub(Unit.Count(2)),
        { atLevel: 1 },
      ),
      Effect.Stat(
        Stat.ExclusiveDiscount,
        Op.Set(Unit.Percent(10)),
        { atLevel: 2 },
      ),
      Effect.Stat(
        Stat.ExclusiveDiscount,
        Op.Set(Unit.Percent(20)),
        { atLevel: 3 },
      ),
      Effect.Stat(
        Stat.ExclusiveDiscount,
        Op.Set(Unit.Percent(40)),
        { atLevel: 4 },
      ),
    ],
  }),
];
