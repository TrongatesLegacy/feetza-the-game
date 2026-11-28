// Dev checks for the generated card text (docs/effects-plan.md, "Item declarations and card text"), run by
// `npm run golden` (and so by `npm run check`) at desktop and phone size, and by hand from the console:
//
//   F.cardTextAudit()  every hand-written override's numbers against what the topping declares (src/game/cardText.ts)
//   F.cardTextFit()    with the shop open: every topping's text, at every level it can reach, on both heats and with
//                      every peel's meter wording, fits a shop card's fixed 4-line text block, in every layout the shop
//                      deals (3 and 4 cards, a row of 5, many)

import { UPGRADES } from './data/upgrades';
import { abilityFor, type Ability } from './game/abilities';
import { cardText, cardTextAudit, cardTextSources, topLevel } from './game/cardText';
import { setRunHeat, runHeat } from './game/heatRules';
import { PEELS } from './game/peels';
import { withSlamMode } from './game/slamMode';
import { h } from './ui/ui';

export function audit(): { problems: string[]; generated: number; overridden: string[]; scene: number } {
  const src = cardTextSources(UPGRADES);
  return { problems: cardTextAudit(UPGRADES), generated: src.generated.length, overridden: src.overridden, scene: src.scene.length };
}

/** The meter wordings to try: the Peel Slam's, and for each kind of ability (active, auto, every-n-seconds, on a smack
 *  or a kill…) the one with the longest name, the longest text it can put on a card. */
function meterWordings(): (Ability | null)[] {
  const longest = new Map<string, Ability>();
  for (const p of PEELS) {
    let a: Ability | null = null;
    try {
      a = abilityFor(p.id);
    } catch {
      continue;
    }
    if (!a) continue;
    const key = a.trigger.t;
    const was = longest.get(key);
    if (!was || a.name.length > was.name.length) longest.set(key, a);
  }
  return [null, ...longest.values()];
}

/** Texts that don't fit (empty: all fit). Needs the shop open (F.startGame({ upgrades: {}, coins: 0 })). */
export async function fit(): Promise<{ id: string; lvl: number; heat: string; meter: string; cards: number; lines: number }[]> {
  const cards = document.querySelector<HTMLElement>('.shop2 .cards');
  const real = cards?.querySelector<HTMLElement>('.card');
  if (!cards || !real) throw new Error('cardTextFit: open the shop first');
  const kids = [...cards.children];
  const cls = cards.className;
  const out: { id: string; lvl: number; heat: string; meter: string; cards: number; lines: number }[] = [];
  const heat = runHeat();
  const meters = meterWordings();
  try {
    // (the shop's layouts: 3 or 4 cards side by side, a row of 5, then many: narrower cards and smaller text)
    for (const n of [3, 4, 5, 6, 8]) {
      cards.className = `cards${n > 4 ? ' row' : ''}${n > 5 ? ' many' : ''}`;
      const clones = Array.from({ length: n }, () => real.cloneNode(true) as HTMLElement);
      for (const c of clones) c.classList.add('dealt');
      cards.replaceChildren(...clones);
      const block = clones[0].querySelector<HTMLElement>('.ctext');
      if (!block) throw new Error('cardTextFit: no .ctext on the shop card');
      const lh = parseFloat(getComputedStyle(block).lineHeight);
      for (const hId of ['regular', 'mild'] as const) {
        setRunHeat(hId);
        for (const m of meters) {
          const seen = new Set<string>();
          withSlamMode(m, () => {
            for (const u of UPGRADES) {
              for (let l = 1; l <= topLevel(u, UPGRADES); l++) {
                const t = cardText(u, l);
                const key = `${t.up}|${t.down}`;
                if (seen.has(key)) continue;
                seen.add(key);
                block.replaceChildren(h('div', { class: 'desc' }, t.up), ...(t.down ? [h('div', { class: 'down' }, `▼ ${t.down}`)] : []));
                const used = [...block.children].reduce((s, e) => s + (e as HTMLElement).offsetHeight, 0);
                if (used > block.clientHeight + 1) out.push({ id: u.id, lvl: l, heat: hId, meter: m?.name ?? 'Peel Slam', cards: n, lines: Math.round(used / lh) });
              }
            }
          });
        }
      }
    }
  } finally {
    setRunHeat(heat);
    cards.className = cls;
    cards.replaceChildren(...kids);
  }
  return out;
}
