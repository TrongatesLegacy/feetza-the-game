// Small shared UI pieces for the Feetza 2.0 screens.

import { pizzaStateURL } from '../game/assets';
import { h } from './ui';

/** A pizza drawn with its eaten slices missing, so slice count reads at a glance at any size. `charred`: a dead
 *  pizza drawn whole and burnt (the shop's table, under its oven door), not as an empty plate. */
export function pizzaThumb(id: string, slices: number, max: number, size: number, stale = false, dead = false, charred = false): HTMLElement {
  if (dead && charred) return h('img', { class: 'pthumb charred', src: pizzaStateURL(id, max, max, size), alt: '' });
  return h('img', { class: `pthumb${stale ? ' stale' : ''}${dead ? ' dead' : ''}`, src: pizzaStateURL(id, dead ? 0 : slices, max, size), alt: '' });
}

/** A pizza that never goes stale: the bar full, ∞ for its number. */
export function freshForever(): HTMLElement {
  return h('div', { class: 'fresh forever', title: 'Never goes stale' }, h('span', { class: 'fl' }, 'FRESH'), h('span', { class: 'fbar' }, h('i', { style: 'width:100%' })), h('span', { class: 'fn' }, '∞'));
}

export function freshBar(fresh: number, max: number): HTMLElement {
  const f = Math.max(0, Math.min(1, fresh / Math.max(1, max)));
  return h(
    'div',
    { class: 'fresh' },
    h('span', { class: 'fl' }, 'FRESH'),
    h('span', { class: 'fbar' }, h('i', { style: `width:${f * 100}%`, class: f <= 0.3 ? 'low' : '' })),
    h('span', { class: `fn${f <= 0.3 ? ' low' : ''}` }, `${Math.max(0, Math.round(fresh))}`),
  );
}

export const INTROS: Record<string, { tag: string; title: string; lines: string[] }> = {
  kinds: {
    tag: 'NEW: UPGRADE KINDS',
    title: 'Three kinds of topping',
    lines: ['PERMANENT toppings level up and stack.', 'ONCE PER RUN toppings can only be bought once.', 'ONE USE toppings work once, then come back to the shop a few waves later.'],
  },
  swap: {
    tag: 'NEW: SWAPPING',
    title: 'Your table is full',
    lines: ['Pick a pizza to swap out. It leaves the table, and its perk goes with it.', 'Stale and destroyed pizzas are listed first.'],
  },
  freshness: {
    tag: 'NEW: FRESHNESS',
    title: 'Pizzas go stale',
    lines: ['Each pizza loses 1 freshness every wave. At 0 it goes stale and it’s lost, just like a stomped pizza: even the feet won’t touch it.', 'Reheat it from its card in the shop before it runs out. Once it’s stale, only a Rebake brings it back.'],
  },
  phases: {
    tag: 'NEW: BOSS PHASES',
    title: 'Bosses change as they weaken',
    lines: ['At 66% and 33% health a boss changes phase: it rears up, glows amber, then red, and switches to new moves.', 'Each move has a warning before it lands. The banner and the line under the boss bar say what to do about it.'],
  },
  mini: {
    tag: 'NEW: MINI-BOSSES',
    title: 'A mini-boss joins the wave',
    lines: ['Beat it for a pile of tips and a free one-use topping.'],
  },
  events: {
    tag: 'NEW: WAVE EVENTS',
    title: 'Something flew in',
    lines: ['Flyers and chests pay out tips, slices, Peel Slam charge or even a Golden Crust.', 'A smack only goes to them when no foot is closer, so chasing loot never costs you a save.'],
  },
  golden: {
    tag: 'NEW: GOLDEN MENU',
    title: 'Spend crusts mid-run',
    lines: ['The Golden menu in the shop is paid from your banked Golden Crusts.', 'It is a permanent spend: those crusts are gone, not invested.'],
  },
  tiers: {
    tag: 'NEW: PIZZA RARITY',
    title: 'Common, Rare, Epic',
    lines: ['Every pizza has a tier, shown by its frame: plain wood for Common, silver for Rare, purple and gold for Epic. Legendaries are coming.', 'Rarer pizzas turn up less often and cost more at the counter. Now and then a Pizzeria pizza turns up as a Chef’s Special too.'],
  },
  rebake: {
    tag: 'NEW: REBAKE',
    title: 'Back from the ashes',
    lines: ['Tap the oven door on a toasted pizza to rebake it: back with half its slices, fully fresh.', 'It costs one and a half times that pizza’s counter price the first time in a run, then twice its price after that. Not on Inferno.'],
  },
};
