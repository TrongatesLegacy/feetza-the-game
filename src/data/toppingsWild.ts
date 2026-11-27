// Wildcard toppings: 20 deliberately varied ones (5 per rarity). Some play with how you move the peel,
// some with timing, some are just fun. Most are run by the scene through src/game/toppingKit.ts, keyed by id.

import { P, TRIG, describeProc, scaleProc, type Proc } from '../game/abilities';
import type { Rarity, Upgrade } from './upgrades';
import { Effect, Op, Stat, Unit } from '../effects';
import { superStartText } from '../game/slamMode';

const { rnd, TH } = P;
const { every } = TRIG;

function kit(id: string, name: string, icon: string, rarity: Rarity, max: number, desc: (l: number) => string, extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc, ...extra };
}

function proc(id: string, name: string, icon: string, rarity: Rarity, max: number, p: Proc, short?: string): Upgrade {
  return {
    id, name, icon, rarity, max, proc: p,
    desc: (l) => (short ? (l <= 1 ? short : `Hits ${Math.round(50 * (l - 1))}% harder, more often`) : l <= 1 ? describeProc(p) : `${describeProc(scaleProc(p, l))}`),
  };
}

export const WILD_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  kit('napkinninja', 'Napkin Ninja', '🥷', 'common', 3, (l) => (l <= 1 ? '20% of misses fling a napkin at a foot (0.5s stun)' : `${20 + 10 * (l - 1)}% of misses fling a napkin at a foot: 0.5s stun (LV 1: 20%)`)),
  kit('extracrispy', 'Extra Crispy', '🥓', 'common', 3, () => '+1 max slice on your smallest pizza, right now', { onPick: 'crispy' }),
  kit('pizzastone', 'Pizza Stone', '🟫', 'common', 2, (l) => (l <= 1 ? 'The first stomp each wave on your middle pizza is blocked' : 'The first 2 stomps each wave on your middle pizza are blocked (was 1)')),
  kit('garlicdip', 'Garlic Dip', '🥣', 'common', 3, (l) => (l <= 1 ? 'Feet sometimes drop a dip pot: smack it for +5 tips' : `${6 + 3 * (l - 1)}% of kills drop a dip pot: smack it for +5 tips (LV 1: 6%)`)),
  kit('crustcrumbs', 'Crust Crumbs', '🍪', 'common', 2, (l) => (l <= 1 ? '5% of kills drop a crumb; 10 crumbs make a Golden Crust' : '10% of kills drop a crumb; 10 crumbs make a Golden Crust (was 5%)')),

  // ——— Rare ———
  proc('rollingcutter', 'Rolling Cutter', '☸️', 'rare', 4, { trigger: every(6), fx: [TH('wheelcutter', 'roll', 2, rnd(1), { r: 90 })], color: 0xc7ccd4, vfx: 'burst' }, 'Every 6s: a cutter wheel rolls through a lane (2× each foot)'),
  kit('doublecheese', 'Double Cheese', '🧈', 'rare', 2, (l) => (l <= 1 ? 'Every 25 combo regrows a slice on your weakest pizza' : 'Every 15 combo regrows a slice on your weakest pizza (was every 25)')),
  kit('doorbell', 'Doorbell', '🔔', 'rare', 1, () => 'A foot’s spot glows 1s before it arrives; its first smack crits'),
  kit('doughspinner', 'Dough Spinner', '🍥', 'rare', 2, (l) => (l <= 1 ? 'Swirl the peel in circles to charge the meter' : 'Swirl the peel in circles: each full swirl charges the meter 9% (was 6%)'), { needsMeter: 'tank' }),
  { id: 'crustarmour', name: 'Crust Armour', icon: '🦺', rarity: 'rare', max: 2, desc: () => '+1 stomp shield on every pizza in boss waves' },

  // ——— Epic ———
  kit('pizzadrone', 'Pizza Drone', '🛸', 'epic', 3, (l) => (l <= 1 ? 'A little drone follows your peel, zapping a foot every 2s for 25% of a smack, up to twice your smack reach away' : `The drone zaps a foot every 2s for ${25 * l}% of a smack (LV 1: 25%)`)),
  kit('woodfired', 'Wood-Fired', '🏕️', 'epic', 2, (l) => (l <= 1 ? 'Every 10th smack is a fireball: 4× and it burns' : 'Every 7th smack is a fireball: 4× and it burns (was every 10th)')),
  kit('echochamber', 'Echo Chamber', '📣', 'epic', 2, (l) => (l <= 1 ? '20% of smacks echo: the same spot is smacked again 0.5s later' : '30% of smacks echo: the same spot is smacked again 0.5s later (was 20%)')),
  kit('partypopper', 'Party Popper', '🎊', 'epic', 1, () => 'When a boss changes phase, confetti stuns every foot for 1s'),
  { id: 'midnightsnack', name: 'Midnight Snack', icon: '🌙', rarity: 'epic', max: 1, desc: () => 'From wave 50 on: +25% smack damage and tips' },

  // ——— Legendary ———
  kit('lastslice', 'The Last Slice', '☝️', 'legendary', 1, () => 'Down to one pizza: +100% damage, and smacks hit all in range'),
  kit('sixthsense', 'Sixth Sense', '👁️', 'legendary', 1, () => 'Feet about to stomp glow red and take +25% damage'),
  { id: 'fulltank', name: 'Full Tank', icon: '⛽', rarity: 'legendary', max: 1, desc: () => superStartText(100), effects: [Effect.Stat(Stat.SuperStart, Op.Set(Unit.Percent(100)))], needsMeter: 'tank' },
  kit('coldfeet', 'Cold Feet', '🧦', 'legendary', 1, () => 'For the first 5s of every wave, feet move at half speed'),
  { id: 'infiniteoven', name: 'Infinite Oven', icon: '🌡️', rarity: 'legendary', max: 1, desc: () => 'Every topping that levels up can go 2 levels higher', effects: [Effect.Stat(Stat.CapBonus, Op.Add(Unit.Count(2)))] },
];
