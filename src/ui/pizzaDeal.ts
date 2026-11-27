// The counter's tier moments (docs/pizza-plan.md, "When it's dealt" and "When it's bought or unlocked"):
// - dealt: a Common comes in as any card does; a Rare's frame catches the light with a soft chime; an Epic flips in
//   with a burst of sparkles and a rising note; a Legendary's is a hook (LEGENDARY_COUNTER) that step 5 fills in,
//   showing the Epic's moment in gold until then;
// - bought: a Common's is the buy's own pop; a Rare bursts into sparkles; an Epic bursts and plays a short sting;
//   a Legendary's is a hook, showing the Epic's in gold until then.
// The bursts are drawn in a layer of their own over the screen, so they outlive the shop redrawing the card away. The
// motion is in style.css (.pzd-*); reduced motion keeps the light and the sound, without the flip or the burst.
import type { PizzaRarity } from '../data/pizzaRarity';
import { TIER_LOOK } from '../data/pizzaRarity';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';

/** Step 5's legendary counter moments (the counter dims, a light shaft, a fanfare, "LEGENDARY!" stamping in; the
 *  full-screen reveal when bought). Each returns true when it has played its own moment. */
export const LEGENDARY_COUNTER: { dealt?: (card: HTMLElement, id: string) => boolean; bought?: (rect: DOMRect, id: string) => boolean } = {};

const calm = () => !!save.settings.reducedMotion;

let layer: HTMLElement | null = null;
function burstLayer(): HTMLElement {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'pzd-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

/** Sparkles bursting from a rect's middle, in the tier's colours. */
export function tierBurst(rect: DOMRect, r: PizzaRarity, n: number, spread = 1): void {
  if (calm() || !rect.width) return;
  const t = TIER_LOOK[r];
  const host = burstLayer();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.5;
  const reach = Math.max(rect.width, rect.height) * 0.75 * spread;
  // a flash of light where it bursts
  const flash = document.createElement('i');
  flash.className = `pzd-flash pzd-${r}`;
  flash.style.cssText = `left:${cx}px;top:${cy}px;--c:${t.b}`;
  host.appendChild(flash);
  const made: HTMLElement[] = [flash];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + crand() * 0.5;
    const d = reach * (0.55 + crand() * 0.5);
    const s = document.createElement('i');
    s.className = `pzd-spark${i % 3 === 0 ? ' big' : ''}`;
    s.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d * 0.8 - 20}px;--c:${i % 2 ? t.a : t.gem};--rot:${Math.round(crand() * 180)}deg;animation-delay:${Math.round(crand() * 80)}ms`;
    host.appendChild(s);
    made.push(s);
  }
  setTimeout(() => made.forEach((e) => e.remove()), 1200);
}

/** A counter card dealt (first drawn this shop): its tier's entrance, `order` cards after the first. */
export function dealCard(card: HTMLElement, r: PizzaRarity, id: string, order: number): void {
  if (r === 'common') return;
  const delay = 120 + order * 160;
  if (r === 'legendary' && LEGENDARY_COUNTER.dealt?.(card, id)) return;
  card.classList.add(`pzd-deal-${r === 'legendary' ? 'epic' : r}`);
  if (r === 'legendary') card.classList.add('pzd-gold');
  card.style.setProperty('--pzd-delay', `${delay}ms`);
  setTimeout(() => {
    if (!card.isConnected) return;
    if (r === 'rare') audio.sfx('sfx_tierchime', { volume: 0.55, throttle: 120 });
    else {
      audio.sfx('sfx_tierrise', { volume: 0.6, throttle: 120 });
      // the sparkles burst as the card lands face up
      setTimeout(() => card.isConnected && tierBurst((card.querySelector('.offer-pic') ?? card).getBoundingClientRect(), r, 14, 1.3), 260);
    }
  }, delay);
}

/** A pizza bought from the counter (its card's last place on screen): its tier's moment. */
export function boughtCard(rect: DOMRect | null, r: PizzaRarity, id: string): void {
  if (!rect || r === 'common') return;
  if (r === 'legendary' && LEGENDARY_COUNTER.bought?.(rect, id)) return;
  if (r === 'rare') {
    tierBurst(rect, r, 10, 0.9);
    audio.sfx('sfx_smack_tail_glint', { volume: 0.5 });
    return;
  }
  tierBurst(rect, r, 16, 1.1);
  audio.sfx('sfx_tiersting', { volume: 0.7 });
}
