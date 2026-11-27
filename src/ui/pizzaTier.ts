// A pizza card's tier frame (docs/pizza-plan.md): the same everywhere a pizza card appears (the shop's counter and
// table, the Pizzeria, the new-run lineup and its Rare Find, the Pizzapedia, the Peel Locker's pizza peels).
//
// A card is framed by adding tierFrame() as its first child and tierAttrs() to its class and style: a ring inside its
// border in the tier's materials (plain wood, silver with a sheen, purple and gold with sparkles, gold with a living
// border), and a small label. The colours come from TIER_LOOK (src/data/pizzaRarity.ts); the portraits' plates use
// the same ones (src/art/pizzaArt.ts). The motion is in style.css (.pzr-*), and stops for reduced motion.
import { TIER_LOOK, type PizzaRarity } from '../data/pizzaRarity';
import { LEGEND_LOOK } from '../game/legendary';
import { h } from './ui';

/** The class and the colour variables a framed card needs (a Legendary's own colours too, given its id: its pie glows
 *  in them and its border's light turns through them). */
export function tierAttrs(r: PizzaRarity, id?: string): { cls: string; style: string } {
  const t = TIER_LOOK[r];
  const l = r === 'legendary' && id ? LEGEND_LOOK[id] : undefined;
  return { cls: `pzr pzr-${r}`, style: `--ta:${t.a};--tb:${t.b};--te:${t.edge};--tg:${t.gem};--tl:${t.label};--ti:${t.ink}${l ? `;--la:${l.css};--lb:${l.css2}` : ''}` };
}

/** The frame (first child of the card): its ring and moving light, and its tier's label. `label` false leaves the
 *  label off (a card too small for one). */
export function tierFrame(r: PizzaRarity, label = true): HTMLElement[] {
  const fx = h('span', { class: 'pzr-fx', 'aria-hidden': 'true' });
  if (r === 'epic' || r === 'legendary') for (let i = 0; i < 4; i++) fx.append(h('i', { class: `pzr-spark s${i}` }));
  const out = [fx];
  if (label) out.push(tierLabel(r));
  return out;
}

/** The tier's small label (COMMON, RARE…). */
export function tierLabel(r: PizzaRarity): HTMLElement {
  return h('span', { class: 'pzr-tag', title: `${TIER_LOOK[r].name} pizza` }, TIER_LOOK[r].name.toUpperCase());
}

/** A small gem in the tier's colour (the Peel Locker's pizza peels). */
export function tierGem(r: PizzaRarity): HTMLElement {
  return h('span', { class: `pz-gem pzr-${r}`, style: tierAttrs(r).style, title: `${TIER_LOOK[r].name} pizza`, 'aria-label': `${TIER_LOOK[r].name} pizza` });
}
