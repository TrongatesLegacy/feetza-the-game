// Nemesis stages: a hero peel equipped as the run's ability peel swaps one stage of the journey for its own
// nemesis place, mini-boss and boss. Batpeel turns Metropizza Rooftops (stage 13, waves 61–65) into Goth-Ham
// Rooftops with Bunion (63) and the Jokester (65); more heroes add a row to NEMESES (Kratos against Kronos and
// Zeus in Tartarus, and so on).
//
// How it applies: locationFor / bossFor / miniFor (src/game/Run.ts) pass every stage through applyNemesis, which
// swaps the stage's own place, mini-boss and boss ids for the nemesis ones. Matching by id rather than by wave
// keeps it right on Endless loops (the same stage again) and on Endless+ (the shuffled decks deal the original
// ids wherever they land, and they're swapped there). The run's peel is set by the game scene at the start of a
// run, from the snapshot's peel on a resumed one, so a saved run keeps its swap.

import type { ArenaId, LocationId } from '../art/backdrops';
import { MINI_WAVE, STAGES, WAVES_PER_STAGE } from '../data/stages';

export interface Nemesis {
  /** Ability peels that bring it: the hero and its variants. */
  peels: string[];
  /** The hero's name, for the locker's unlock text. */
  hero: string;
  /** The STAGES index it takes over (its first time through is waves stage × 5 + 1 … + 5). */
  stage: number;
  location?: LocationId;
  mini?: string;
  boss?: ArenaId;
}

export const NEMESES: Nemesis[] = [
  { peels: ['hero:batpeel', 'hero:darkkneader'], hero: 'Batpeel', stage: 12, location: 'gotham', mini: 'bunion', boss: 'jokester' },
];

/** The run's ability peel, as far as nemesis stages are concerned ('' outside a run). */
const run = { peel: '' };

export function setNemesisPeel(id: string): void {
  run.peel = id;
}

/** The nemesis the run's peel brings, if any. */
export function activeNemesis(): Nemesis | null {
  return run.peel ? (NEMESES.find((n) => n.peels.includes(run.peel)) ?? null) : null;
}

type StageIds = { location: LocationId; boss: ArenaId; mini: string };

/** A stage as this run meets it: the nemesis's ids in place of the ones it swaps. */
export function applyNemesis(st: StageIds): StageIds {
  const n = activeNemesis();
  const base = n ? STAGES[n.stage] : null;
  if (!n || !base) return st;
  return {
    location: n.location && st.location === base.location ? n.location : st.location,
    mini: n.mini && st.mini === base.mini ? n.mini : st.mini,
    boss: n.boss && st.boss === base.boss ? n.boss : st.boss,
  };
}

/** The nemesis a place, mini-boss or boss id belongs to (null for the journey's own). */
export function nemesisOf(id: string): Nemesis | null {
  return NEMESES.find((n) => n.location === id || n.mini === id || n.boss === id) ?? null;
}

/** The journey place a nemesis place stands in for (the place itself otherwise): its regular feet still come. */
export function homeOf(loc: string): string {
  const n = nemesisOf(loc);
  return n && n.location === loc ? (STAGES[n.stage]?.location ?? loc) : loc;
}

/** First-time-through waves of a nemesis's mini-boss and boss. */
export function nemesisWaves(n: Nemesis): { first: number; mini: number; boss: number } {
  const first = n.stage * WAVES_PER_STAGE + 1;
  return { first, mini: first + MINI_WAVE - 1, boss: first + WAVES_PER_STAGE - 1 };
}
