// Shop toppings: 20 that bend the shop itself (5 per rarity), one trade-off in each rarity.
// Discounts stack additively up to 60% off; "one fewer card" never takes the shop below 1 card; free
// items carry a FREE tag. Prices and cards are worked out in src/game/shopDeals.ts.

import type { Rarity, Upgrade } from './upgrades';
import { Effect, Op, Stat, Unit, type EffectData } from '../effects';

function shop(id: string, name: string, icon: string, rarity: Rarity, max: number, desc: string, effects: EffectData[] = [], extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc: () => desc, effects, ...extra };
}

function deal(id: string, name: string, icon: string, rarity: Rarity, up: string, down: string, effects: EffectData[]): Upgrade {
  return { id, name, icon, rarity, max: 1, desc: () => up, downside: down, effects };
}

export const SHOP_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  shop('couponclipper', 'Coupon Clipper', '✂️', 'common', 3, 'Rerolls cost 2 tips less (never below 1)', [Effect.Stat(Stat.RerollLess, Op.Add(Unit.Amount(2)))]),
  shop('bulkbuy', 'Bulk Buy', '🛒', 'common', 2, 'The 3rd topping you buy in each shop is 20% off'),
  shop('happyhour', 'Happy Hour', '🍹', 'common', 1, 'Every 5th wave’s shop: all toppings 25% off'),
  shop('dayold', 'Day-Old Deals', '🧇', 'common', 2, 'One-use toppings cost 20% less', [Effect.Stat(Stat.ConsumableDiscount, Op.Add(Unit.Percent(20)))]),
  deal('discountbin', 'Discount Bin', '🗑️', 'common', 'All toppings 15% cheaper', 'One fewer topping card per shop', [Effect.Stat(Stat.ShopDiscount, Op.Add(Unit.Percent(15))), Effect.Stat(Stat.CardDelta, Op.Sub(Unit.Count(1)))]),

  // ——— Rare ———
  shop('freedelivery', 'Free Delivery', '🚚', 'rare', 1, 'One pizza from the counter is free, once this run', [], { kind: 'unique' }),
  shop('extrashelf', 'Extra Shelf', '🪜', 'rare', 2, 'Every shop deals one more topping card', [Effect.Stat(Stat.CardDelta, Op.Add(Unit.Count(1)))]),
  shop('haggler', 'Haggler', '🤝', 'rare', 1, 'Each topping bought takes 10% off the next (up to 30%)'),
  shop('freerefill', 'Free Refill', '🔄', 'rare', 2, 'One free reroll in every shop', [Effect.Stat(Stat.FreeRerolls, Op.Add(Unit.Count(1)))]),
  deal('rushorder', 'Rush Order', '⏩', 'rare', 'Counter pizzas cost 30% less', 'Rerolls cost double', [Effect.Stat(Stat.CounterDiscount, Op.Add(Unit.Percent(30))), Effect.Stat(Stat.RerollMult, Op.Mul(Unit.Mult(2)))]),

  // ——— Epic ———
  shop('bogo', 'Buy One Get One', '✌️', 'epic', 1, 'The next topping you level up gets a free extra level', [], { kind: 'unique', onPick: 'bogo' }),
  shop('goldenticket', 'Golden Ticket', '🎫', 'epic', 1, 'Golden Menu items cost 30% fewer Golden Crusts', [Effect.Stat(Stat.GoldenDiscount, Op.Add(Unit.Percent(30)))]),
  shop('chefsfav', 'Chef’s Favourite', '💝', 'epic', 1, 'A Chef’s Special is always on the counter, 25% cheaper'),
  shop('clearance', 'Clearance Rack', '📉', 'epic', 1, 'One topping card in every shop is half price'),
  deal('premiummenu', 'Premium Menu', '💎', 'epic', '+2 topping cards in every shop', 'Toppings and pizzas cost 20% more', [Effect.Stat(Stat.CardDelta, Op.Add(Unit.Count(2))), Effect.Stat(Stat.ShopDiscount, Op.Sub(Unit.Percent(20))), Effect.Stat(Stat.CounterMult, Op.Mul(Unit.Mult(1.2)))]),

  // ——— Legendary ———
  shop('freelunch', 'Free Lunch', '🥪', 'legendary', 1, 'Once every 10 waves, take any one topping card free'),
  shop('ownersdiscount', 'Owner’s Discount', '🏷️', 'legendary', 1, 'Everything in the shop is 25% off', [Effect.Stat(Stat.ShopDiscount, Op.Add(Unit.Percent(25))), Effect.Stat(Stat.GoldenDiscount, Op.Add(Unit.Percent(25)))]),
  shop('bottomless', 'Bottomless Pizza', '♾️', 'legendary', 1, 'One free counter pizza every 10 waves'),
  shop('stockroom', 'Stockroom Key', '🔑', 'legendary', 1, 'The first card you buy in each shop restocks'),
  deal('exclusivemenu', 'Exclusive Menu', '🎩', 'legendary', 'Every card is one rarity higher', 'Two fewer topping cards per shop', [Effect.Stat(Stat.CardDelta, Op.Sub(Unit.Count(2)))]),
];
