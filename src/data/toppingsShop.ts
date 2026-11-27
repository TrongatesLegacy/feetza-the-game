// Shop toppings: 20 that bend the shop itself (5 per rarity), one trade-off in each rarity.
// Discounts stack additively up to 60% off; "one fewer card" never takes the shop below 1 card; free
// items carry a FREE tag. Prices and cards are worked out in src/game/shopDeals.ts.

import type { Rarity, Stats, Upgrade } from './upgrades';

function shop(id: string, name: string, icon: string, rarity: Rarity, max: number, desc: string, apply: (s: Stats) => void = () => {}, extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc: () => desc, apply, ...extra };
}

function deal(id: string, name: string, icon: string, rarity: Rarity, up: string, down: string, apply: (s: Stats) => void): Upgrade {
  return { id, name, icon, rarity, max: 1, desc: () => up, downside: down, apply };
}

export const SHOP_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  shop('couponclipper', 'Coupon Clipper', '✂️', 'common', 3, 'Rerolls cost 2 tips less (never below 1)', (s) => { s.rerollLess += 2; }),
  shop('bulkbuy', 'Bulk Buy', '🛒', 'common', 2, 'The 3rd topping you buy in each shop is 20% off'),
  shop('happyhour', 'Happy Hour', '🍹', 'common', 1, 'Every 5th wave’s shop: all toppings 25% off'),
  shop('dayold', 'Day-Old Deals', '🧇', 'common', 2, 'One-use toppings cost 20% less', (s) => { s.consumableDiscount += 0.2; }),
  deal('discountbin', 'Discount Bin', '🗑️', 'common', 'All toppings 15% cheaper', 'One fewer topping card per shop', (s) => { s.shopDiscount += 0.15; s.cardDelta -= 1; }),

  // ——— Rare ———
  shop('freedelivery', 'Free Delivery', '🚚', 'rare', 1, 'One pizza from the counter is free, once this run', () => {}, { kind: 'unique' }),
  shop('extrashelf', 'Extra Shelf', '🪜', 'rare', 2, 'Every shop deals one more topping card', (s) => { s.cardDelta += 1; }),
  shop('haggler', 'Haggler', '🤝', 'rare', 1, 'Each topping bought takes 10% off the next (up to 30%)'),
  shop('freerefill', 'Free Refill', '🔄', 'rare', 2, 'One free reroll in every shop', (s) => { s.freeRerolls += 1; }),
  deal('rushorder', 'Rush Order', '⏩', 'rare', 'Counter pizzas cost 30% less', 'Rerolls cost double', (s) => { s.counterDiscount += 0.3; s.rerollMult *= 2; }),

  // ——— Epic ———
  shop('bogo', 'Buy One Get One', '✌️', 'epic', 1, 'The next topping you level up gets a free extra level', () => {}, { kind: 'unique', onPick: 'bogo' }),
  shop('goldenticket', 'Golden Ticket', '🎫', 'epic', 1, 'Golden Menu items cost 30% fewer Golden Crusts', (s) => { s.goldenDiscount += 0.3; }),
  shop('chefsfav', 'Chef’s Favourite', '💝', 'epic', 1, 'A Chef’s Special is always on the counter, 25% cheaper'),
  shop('clearance', 'Clearance Rack', '📉', 'epic', 1, 'One topping card in every shop is half price'),
  deal('premiummenu', 'Premium Menu', '💎', 'epic', '+2 topping cards in every shop', 'Toppings and pizzas cost 20% more', (s) => { s.cardDelta += 2; s.shopDiscount -= 0.2; s.counterMult *= 1.2; }),

  // ——— Legendary ———
  shop('freelunch', 'Free Lunch', '🥪', 'legendary', 1, 'Once every 10 waves, take any one topping card free'),
  shop('ownersdiscount', 'Owner’s Discount', '🏷️', 'legendary', 1, 'Everything in the shop is 25% off', (s) => { s.shopDiscount += 0.25; s.goldenDiscount += 0.25; }),
  shop('bottomless', 'Bottomless Pizza', '♾️', 'legendary', 1, 'One free counter pizza every 10 waves'),
  shop('stockroom', 'Stockroom Key', '🔑', 'legendary', 1, 'The first card you buy in each shop restocks'),
  deal('exclusivemenu', 'Exclusive Menu', '🎩', 'legendary', 'Every card is one rarity higher', 'Shops deal 2 cards (Extra Shelf and Premium Menu still add theirs)', () => {}),
];
