// Hero and god peels: every module in src/content/peels/ exports `peels: HeroPeel[]`.
// Their abilities are added to ABILITIES and their goals to the goal tracker here, so a new file is all it takes.
import type { PeelLook } from '../art/peelArt';
import { ABILITIES, type Ability } from '../game/abilities';
import { registerGoals, type HeroGoal } from '../game/heroGoals';

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
  look: () => PeelLook;
  ability: Ability;
}

const mods = import.meta.glob<{ peels: HeroPeel[] }>('./peels/*.ts', { eager: true });
export const HERO_PEELS: HeroPeel[] = Object.keys(mods)
  .sort()
  .flatMap((k) => mods[k].peels);

for (const p of HERO_PEELS) ABILITIES[p.id] = p.ability;
registerGoals(HERO_PEELS.map((p) => ({ peel: p.id, goal: p.goal })));
