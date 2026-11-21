// Small shared UI pieces for the Feetza 2.0 screens.

import { pizzaStateURL } from '../game/assets';
import { h } from './ui';

/** A pizza drawn with its eaten slices missing, so slice count reads at a glance at any size. */
export function pizzaThumb(id: string, slices: number, max: number, size: number, stale = false, dead = false): HTMLElement {
  return h('img', { class: `pthumb${stale ? ' stale' : ''}${dead ? ' dead' : ''}`, src: pizzaStateURL(id, dead ? 0 : slices, max, size), alt: '' });
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
  shop: {
    tag: 'NEW: THE SHOP',
    title: 'Toppings cost tips now',
    lines: ['Buy as many toppings as you can afford between waves, or save up for a pizza at the counter.', 'Boss loot still gives you one epic pick for free.'],
  },
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
    lines: ['Each pizza loses 1 freshness every wave. At 0 it goes stale: its perk switches off and it loses a slice every wave.', 'Reheat it with the button on its card in the shop, or swap in a fresh pizza.'],
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
};
