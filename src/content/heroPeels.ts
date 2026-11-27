// Hero and god peels: every module in src/content/peels/ exports `peels: HeroPeel[]`.
// Their abilities are added to ABILITIES and their goals to the goal tracker here, so a new file is all it takes.
import type { PeelLook } from '../art/peelArt';
import { ABILITIES, type Ability } from '../game/abilities';
import { registerGoals, type HeroGoal } from '../game/heroGoals';
import { traceData } from '../game/packTrace';

/** The HEROES tab's sections, in order. */
export type HeroSub = 'heroes' | 'greek' | 'norse';
export const HERO_SUBS: [HeroSub, string, string][] = [
  ['heroes', 'HEROES', 'Parody heroes, each with a signature move. Their unlocks tell a little story.'],
  ['greek', 'GREEK GODS', 'Marble and gold, carved with each god’s symbol.'],
  ['norse', 'NORSE GODS', 'Carved wood and iron, with runes that glow.'],
];

export interface HeroPeel {
  /** 'hero:<name>' (gods use the same prefix). */
  id: string;
  name: string;
  sub: HeroSub;
  /** Gods: their pantheon (Act 9's home-ground bonus reads 'greek'). */
  pantheon?: 'greek' | 'norse';
  goal: HeroGoal;
  /** The locker's unlock line. */
  how: string;
  /** Extra detail for the locker's hover tooltip. */
  tip?: string;
  look: () => PeelLook;
  ability: Ability;
  /** A variant (an upgraded hero peel): the peel it sits beside in the locker. */
  after?: string;
}

const mods = import.meta.glob<{ peels: HeroPeel[] }>('./peels/*.ts', { eager: true });
const listed = Object.keys(mods)
  .sort()
  .flatMap((k) => traceData('src/content', k, mods[k].peels));
// variants sit beside their base peel (after any variant already there), so the locker shows them side by side
export const HERO_PEELS: HeroPeel[] = listed.filter((p) => !p.after);
for (const p of listed.filter((q) => q.after)) {
  let i = HERO_PEELS.findIndex((q) => q.id === p.after);
  if (i < 0) {
    HERO_PEELS.push(p);
    continue;
  }
  while (HERO_PEELS[i + 1]?.after === p.after) i++;
  HERO_PEELS.splice(i + 1, 0, p);
}

for (const p of HERO_PEELS) ABILITIES[p.id] = p.ability;
registerGoals(HERO_PEELS.map((p) => ({ peel: p.id, goal: p.goal })));
