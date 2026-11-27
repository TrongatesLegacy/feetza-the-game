// The Legendaries' card moments (docs/pizza-plan.md, section 1's Legendary column), filling the counter's hooks
// (LEGENDARY_COUNTER in src/ui/pizzaDeal.ts) and the reveal every Legendary gets when it becomes yours:
//
// - Dealt at the counter: the counter dims round it, the card flips in under a shaft of light in the pizza's colours,
//   the fanfare plays and "LEGENDARY!" stamps in over its picture; then the light lifts.
// - Bought (at the counter or in the Pizzeria) or won (a milestone): a full-screen reveal. The pie rises in its aura
//   (rays turning behind it, its colours glowing round it) with its name, its own music sting and confetti in its
//   colours. A tap, a key or a few seconds closes it.
//
// Every Legendary has them (its colours from LEGEND_LOOK, src/game/legendary.ts). Reduced motion keeps the light and
// the sounds without the flip, the rise, the turning rays or the confetti. Sounds: sfx_legendfanfare (dealt),
// sfx_legendstamp (the stamp), sfx_legendreveal (the reveal's sting): synthesized, CC0 (scripts/pizza-sfx/legends.py).

import { pizzaPortrait } from '../art/pizzaArt';
import { PIZZA_BY_ID } from '../data/pizzas';
import { ensurePizzaArt, pizzaTops } from '../game/assets';
import { legendLook } from '../game/legendary';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import { LEGENDARY_COUNTER, tierBurst } from './pizzaDeal';

const calm = () => !!save.settings.reducedMotion;

function el(tag: string, cls: string, style = '', text = ''): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (style) e.style.cssText = style;
  if (text) e.textContent = text;
  return e;
}

const vars = (id: string) => {
  const l = legendLook(id);
  return `--la:${l.css};--lb:${l.css2}`;
};

/** A Legendary dealt onto the counter. */
function dealt(card: HTMLElement, id: string): boolean {
  const still = calm();
  card.classList.add('pzl-dealt');
  card.style.cssText += `;${vars(id)}`;
  // the counter dims round the card (once the card is on the page: it's dealt as the counter is drawn)
  const dim = el('i', 'pzl-dim');
  dim.setAttribute('aria-hidden', 'true');
  requestAnimationFrame(() => {
    const host = (card.closest('.shop-sec') as HTMLElement | null) ?? card.parentElement;
    // (one dim at a time, however many Legendaries are dealt at once)
    if (!host || !card.isConnected || host.querySelector(':scope > .pzl-dim')) return;
    if (getComputedStyle(host).position === 'static') host.classList.add('pzl-host');
    host.appendChild(dim);
  });
  // the shaft of light down onto it, and the stamp
  const shaft = el('i', 'pzl-shaft');
  shaft.setAttribute('aria-hidden', 'true');
  card.appendChild(shaft);
  const stamp = el('b', `pzl-stamp${still ? ' still' : ''}`, '', 'LEGENDARY!');
  stamp.setAttribute('aria-hidden', 'true');
  // (over its picture, clear of its name, perk and price)
  (card.querySelector('.offer-pic, .lu-pic') ?? card).appendChild(stamp);
  if (!still) card.classList.add('pzl-flip');
  setTimeout(() => card.isConnected && audio.sfx('sfx_legendfanfare', { volume: 0.75, throttle: 400 }), 140);
  setTimeout(() => {
    if (!card.isConnected) return;
    audio.sfx('sfx_legendstamp', { volume: 0.7, throttle: 300 });
    tierBurst((card.querySelector('.offer-pic, .lu-pic') ?? card).getBoundingClientRect(), 'legendary', 18, 1.4);
  }, 760);
  setTimeout(() => {
    dim.classList.add('out');
    shaft.classList.add('out');
    stamp.classList.add('out');
  }, 2300);
  setTimeout(() => {
    dim.remove();
    shaft.remove();
    stamp.remove();
    card.classList.remove('pzl-flip');
  }, 3000);
  return true;
}

/** A bigger portrait for the reveal (the cards' is 200 px). */
const big = new Map<string, string>();
function bigPortrait(id: string): string {
  let u = big.get(id);
  if (!u) {
    const p = PIZZA_BY_ID[id];
    const top = ensurePizzaArt(id) ?? pizzaTops[id];
    u = pizzaPortrait(p, top, 420);
    big.set(id, u);
  }
  return u;
}

let open: HTMLElement | null = null;
/** Reveals waiting their turn (several Legendaries won at once show one after another; none is lost). */
const queue: { id: string; title: string }[] = [];

/** The full-screen reveal: the pie rises in its aura with its name, a sting and confetti. `title`: what happened.
 *  Queued behind any reveal already showing; `delay` ms first (on the browser's clock, so a paused or closing scene
 *  can't lose it). */
export function legendReveal(id: string, title = 'YOURS FOR GOOD!', delay = 0): void {
  if (!PIZZA_BY_ID[id]) return;
  if (delay > 0) {
    setTimeout(() => legendReveal(id, title), delay);
    return;
  }
  queue.push({ id, title });
  if (!open) showNext();
}

function showNext(): void {
  const next = queue.shift();
  if (!next) return;
  const { id, title } = next;
  const p = PIZZA_BY_ID[id];
  const look = legendLook(id);
  const still = calm();
  const root = el('div', `pzl-reveal${still ? ' still' : ''}`, vars(id));
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', `Legendary pizza: ${p.name}`);
  const stage = el('div', 'pzl-stage');
  stage.append(el('i', 'pzl-rays'), el('i', 'pzl-halo'));
  const img = document.createElement('img');
  img.className = 'pzl-pie';
  img.alt = '';
  img.src = bigPortrait(id);
  stage.append(img);
  const text = el('div', 'pzl-text');
  text.append(el('span', 'pzl-title', '', title), el('span', 'pzl-tag', '', 'LEGENDARY'), el('b', 'pzl-name', '', p.name), el('span', 'pzl-line', '', look.line), el('span', 'pzl-perk', '', p.perkText));
  const hint = el('span', 'pzl-hint', '', 'Tap to carry on');
  root.append(stage, text, hint);
  if (!still) {
    const conf = el('div', 'pzl-confetti');
    for (let i = 0; i < 46; i++) {
      const c = el('i', i % 4 ? '' : 'long', `left:${Math.round(crand() * 100)}%;background:${look.confetti[i % look.confetti.length]};--dx:${Math.round((crand() - 0.5) * 160)}px;--r:${Math.round(crand() * 720 - 360)}deg;animation-delay:${Math.round(300 + crand() * 900)}ms;animation-duration:${Math.round(1800 + crand() * 1400)}ms`);
      conf.append(c);
    }
    root.append(conf);
  }
  document.body.appendChild(root);
  open = root;
  audio.sfx('sfx_legendreveal', { volume: 0.8, throttle: 600 });
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    root.classList.add('out');
    window.removeEventListener('keydown', key, true);
    setTimeout(() => {
      root.remove();
      if (open === root) open = null;
      showNext();
    }, 420);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };
  // (a moment before it can be closed, so the click that bought it doesn't close it)
  setTimeout(() => {
    root.addEventListener('pointerdown', close);
    window.addEventListener('keydown', key, true);
  }, 500);
  setTimeout(close, 5200);
}

LEGENDARY_COUNTER.dealt = dealt;
LEGENDARY_COUNTER.bought = (_rect, id) => {
  legendReveal(id, 'YOURS FOR GOOD!');
  return true;
};
