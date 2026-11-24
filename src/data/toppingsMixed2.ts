// Mixed toppings: 20 more (5 per rarity). Each rarity has a Pick (choose 1 of 3 random toppings of that
// rarity, free); several throw the shared projectiles. Toppings with no stat change are run by the scene
// through src/game/toppingKit.ts, keyed by id.

import { P, TRIG, describeProc, scaleProc, type Proc } from '../game/abilities';
import type { Rarity, Upgrade } from './upgrades';

const { hit, front, rnd, tough, K, ST, TH } = P;
const { every, stomp } = TRIG;

const RARITY_NAME: Record<Rarity, string> = { common: 'common', rare: 'rare', epic: 'epic', legendary: 'legendary' };

function pick(id: string, name: string, rarity: Rarity, icon: string): Upgrade {
  return {
    id, name, icon, rarity, max: 1, kind: 'consumable', pick: rarity, onPick: 'pick',
    desc: () => `Choose 1 of 3 random ${RARITY_NAME[rarity]} toppings, free`,
    apply: () => {},
  };
}

/** short: card text when the generated one runs long; later levels say what grows. */
function proc(id: string, name: string, icon: string, rarity: Rarity, max: number, p: Proc, short?: string): Upgrade {
  return {
    id, name, icon, rarity, max, proc: p,
    desc: (l) => (short ? (l <= 1 ? short : `Hits ${Math.round(50 * (l - 1))}% harder, more often`) : l <= 1 ? describeProc(p) : `${describeProc(scaleProc(p, l))}`),
    apply: () => {},
  };
}

/** A topping the scene runs itself (see toppingKit.ts). desc(l) may differ by level. */
function kit(id: string, name: string, icon: string, rarity: Rarity, max: number, desc: (l: number) => string, extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc, apply: () => {}, ...extra };
}

export const MIXED_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  pick('pickcommon', 'Common Pick', 'common', '🎁'),
  proc('anchovytoss', 'Anchovy Toss', '🐠', 'common', 4, { trigger: every(6), fx: [TH('anchovy', 'straight', 1.5, front(1))], color: 0x8fb8d8, vfx: 'burst' }),
  proc('crustbumper', 'Crust Bumper', '🎳', 'common', 3, { trigger: stomp, fx: [K(1000, hit()), ST(0.4, hit())], color: 0xd9a066, vfx: 'wind' }),
  kit('sparenapkin', 'Spare Napkin', '🩹', 'common', 2, (l) => (l <= 1 ? 'The first slice lost each wave grows back after it' : 'The first 2 slices lost each wave grow back after it (was 1)')),
  kit('tiedlaces', 'Tied Laces', '🪢', 'common', 3, (l) => (l <= 1 ? 'Every 8s: ties 2 feet together; smack one, the other takes 0.5×' : `Every ${(8 / (1 + 0.2 * (l - 1))).toFixed(1)}s: ties 2 feet together; smack one, the other takes ${0.5 + 0.25 * (l - 1)}× (LV 1: every 8s, 0.5×)`)),

  // ——— Rare ———
  pick('pickrare', 'Rare Pick', 'rare', '🎀'),
  proc('meatballbounce', 'Meatball Bounce', '🍝', 'rare', 4, { trigger: every(6), fx: [TH('meatball', 'bounce', 2, rnd(1), { more: [1.5, 1] })], color: 0xb0603a, vfx: 'burst' }, 'Every 6s: a meatball bounces through 3 feet (2×, 1.5×, 1×)'),
  proc('pizzacutter', 'Pizza Cutter', '💿', 'rare', 4, { trigger: every(7), fx: [TH('pizzacutter', 'boomerang', 2, front(1), { more: [2] })], color: 0xc7ccd4, vfx: 'burst' }, 'Every 7s: a pizza cutter boomerang hits out and back (2× each)'),
  kit('deliveryrush', 'Delivery Rush', '🛵', 'rare', 2, (l) => (l <= 1 ? 'Clear a wave in under 20s for +30 tips (big waves get longer)' : 'Clear a wave in under 20s for +60 tips (was +30; big waves get longer)')),
  kit('foldover', 'Fold Over', '🌮', 'rare', 2, (l) => (l <= 1 ? 'Every 4th smack hits twice' : 'Every 3rd smack hits twice (was every 4th)')),

  // ——— Epic ———
  pick('pickepic', 'Epic Pick', 'epic', '🪅'),
  proc('calzonecannon', 'Calzone Cannon', '🌯', 'epic', 3, { trigger: every(9), fx: [TH('calzone', 'explode', 4, tough(1), { r: 210, splash: 2 })], color: 0xe8a040, vfx: 'burst' }, 'Every 9s: a calzone lob that explodes (4×, 2× nearby)'),
  kit('ovenmitts', 'Oven Mitts', '🥊', 'epic', 1, () => "Your peel can't be stunned, slowed, frozen or snatched"),
  kit('tipinterest', 'Tip Interest', '🏦', 'epic', 1, () => '+5% of your unspent tips after every wave (up to 40)'),
  kit('mozzweb', 'Mozzarella Web', '🕸️', 'epic', 3, (l) => (l <= 1 ? '25% of smacks string cheese to 2 nearby feet: 50% slow, 3s' : `${25 + 10 * (l - 1)}% of smacks string cheese to 2 nearby feet: 50% slow, 3s (LV 1: 25%)`)),

  // ——— Legendary ———
  pick('picklegendary', 'Legendary Pick', 'legendary', '🎖️'),
  kit('peelroulette', 'Peel Roulette', '🎡', 'legendary', 1, () => 'Choose 1 of 3 of your other peels to play the rest of the run', {
    kind: 'unique', onPick: 'roulette', offerIf: (env) => env.otherPeels >= 3,
  }),
  kit('headchef', 'Head Chef', '👩‍🍳', 'legendary', 1, () => 'Every throw (peel or topping) fires 1 extra prop', { offerIf: (env) => env.throws }),
  kit('secondoven', 'Second Oven', '🏭', 'legendary', 1, () => 'Once a run, if your last pizza goes, all come back on 3 slices', { kind: 'unique' }),
  kit('pizzaparty', 'Pizza Party', '🥳', 'legendary', 1, () => 'Stomps are shared: half on the pizza, a quarter on each neighbour'),
];

