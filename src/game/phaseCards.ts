// Phase intro cards: the first time a player reaches each phase of each boss and mini-boss, the fight pauses on
// a card that says what's happening, what to hit and what happens if you don't, with pictures of the boss and
// the actual targets drawn from the fight's own textures (src/ui/phaseCard.ts draws it). The words and picture
// picks live with each fight, in its brain's `cards` (src/game/bosses/*.ts); a phase without one gets a card
// made from its `info`.

import type { HeatId } from '../data/difficulty';
import { FOOT_BY_ID } from '../data/feet';
import { PHASE_CARDS_OFF, phaseCardsMuted, save } from '../systems/save';
import { ENRAGED_INFO, bossPhaseInfo } from './bosses';
import { heatScale } from './bosses/kit';

export { PHASE_CARDS_OFF };

/** In `save.seenIntros`: this phase of this boss has had its card. */
export const phaseSeenKey = (id: string, phase: number): string => `phase:${id}:${phase}`;

export function phaseCardsOn(): boolean {
  return !phaseCardsMuted.on && !save.seenIntros.includes(PHASE_CARDS_OFF);
}

export interface CardShow {
  key: string;
  label: string;
  hits?: number;
  watch?: boolean;
  tint?: number;
}

export interface ResolvedPhaseCard {
  id: string;
  bossName: string;
  mini: boolean;
  phase: number;
  phases: number;
  name: string;
  what: string;
  hit: string;
  miss?: string;
  show: CardShow[];
  icon: string;
  /** Textures the fight draws once it starts, for pictures that aren't in the texture manager yet. */
  art: Record<string, () => HTMLCanvasElement>;
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

/** The card for phase `phase` (of `phases`) of boss `id` on a heat, or null for a foot with no fight. */
export function phaseCardFor(id: string, phase: number, phases: number, heat: HeatId): ResolvedPhaseCard | null {
  // a fresh brain, set up for this many phases (some fights' phase lists depend on it)
  const b = bossPhaseInfo(id, phases);
  const t = FOOT_BY_ID[id];
  if (!b || !t) return null;
  const h = heatScale(heat);
  const enraged = phase > b.names.length;
  const name = b.names[phase - 1] ?? 'ENRAGED';
  const info = b.info[phase - 1] ?? ENRAGED_INFO;
  const [does, answer] = info.split(' · ');
  // past the written phases (ENRAGED): the last phase's targets, everything faster
  const own = b.cards?.[phase - 1];
  const last = b.cards?.[b.cards.length - 1];
  const c = own ?? (enraged && last ? { ...last, what: 'Everything it does comes faster now', hit: last.hit, miss: last.miss, icon: '🔥' } : null);
  return {
    id,
    bossName: t.name,
    mini: !!t.mini,
    phase,
    phases,
    name,
    what: clean(c?.what ?? does ?? info),
    hit: clean(c?.hit ?? answer ?? 'Keep smacking it'),
    miss: c?.miss ? clean(c.miss) : undefined,
    show: (c?.show ?? []).map((s) => ({ key: s.key, label: s.label, hits: typeof s.hits === 'function' ? s.hits(h) : s.hits, watch: s.watch, tint: s.tint })),
    icon: c?.icon ?? (enraged ? '🔥' : '⚔️'),
    art: b.cardArt?.() ?? {},
  };
}
