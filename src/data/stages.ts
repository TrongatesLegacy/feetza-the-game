// The journey: stages of 5 waves, each a location (waves 1–4 of the stage) and a boss arena (wave 5).
// A mini-boss arrives partway through wave 3 of every stage, inside the location.
// Every two stages make an act of 10 waves; the act number comes from the stage.

import type { ArenaId, LocationId } from '../art/backdrops';

export interface Stage {
  location: LocationId;
  /** Main boss id; its arena backdrop has the same id. */
  boss: ArenaId;
  mini: string;
  /** Dev only: a stand-in stage repeating a real one (see ?fakeStages below). Gets no peel of its own. */
  dev?: boolean;
}

export const STAGES: Stage[] = [
  { location: 'trattoria', mini: 'headwaiter', boss: 'bigfoot' },
  { location: 'rooftop', mini: 'sweep', boss: 'ironheel' },
  { location: 'beach', mini: 'sandcastle', boss: 'clownking' },
  { location: 'diner', mini: 'shortorder', boss: 'trex' },
  { location: 'lodge', mini: 'iceskate', boss: 'colossus' },
  { location: 'space', mini: 'ufotoe', boss: 'cosmiccroc' },
  { location: 'kitchen', mini: 'doughboy', boss: 'nonna' },
  { location: 'oldtown', mini: 'pigeonking', boss: 'gargoyle' },
  { location: 'pier', mini: 'jellyfish', boss: 'kraken' },
  { location: 'rink', mini: 'milkshake', boss: 'rinkqueen' },
  { location: 'slopes', mini: 'lumberjack', boss: 'yeti' },
  { location: 'cellar', mini: 'poltergeist', boss: 'phantomking' },
  // ——— Act 7 · Comics ———
  { location: 'metropizza', mini: 'lexlugtoe', boss: 'doomstomp' },
  { location: 'doomlab', mini: 'ultoe', boss: 'thanfoot' },
  // ——— Act 8 · Norse (waves 71–80) ———
  { location: 'jotunheim', mini: 'fenrir', boss: 'thrym' },
  { location: 'bifrost', mini: 'jormungandr', boss: 'surtr' },
  // ——— Act 9 · Greek myths (waves 81–90) ———
  { location: 'labyrinth', mini: 'minotaur', boss: 'medusa' },
  { location: 'tartarus', mini: 'cerberus', boss: 'hades' },
  // ——— Act 10 · Finale (stages 19–20; src/game/bosses/act10.ts) ———
  { location: 'oven', mini: 'mirrorpeel', boss: 'soleprop' },
  { location: 'firstpizzeria', mini: 'ghostfuture', boss: 'soleunbound' },
];

/** The acts, in order: two stages each. Acts 7–10 are named ahead of their stages, so new stages slot in. */
export const ACTS: { name: string }[] = [
  { name: 'Opening Night' },
  { name: 'Summer Rush' },
  { name: 'Out of This World' },
  { name: 'Home Cooking' },
  { name: 'Sea and Skates' },
  { name: 'Cold and Dark' },
  { name: 'Comics' },
  { name: 'Norse' },
  { name: 'Greek Myths' },
  { name: 'Finale' },
];

// Dev only: ?dev&fakeStages=8 repeats the later real stages as stand-ins for acts not built yet, so the
// long journey (acts 7–10, wave 100) can be played end to end. Never in a production build.
if (import.meta.env.DEV && typeof location !== 'undefined') {
  const fake = Math.min(40, Number(new URLSearchParams(location.search).get('fakeStages')) || 0);
  // the Finale always closes the journey: stand-ins go in before it (its stages stay 19–20 with 6 fakes)
  const end = STAGES.findIndex((s) => s.location === 'oven');
  const at = end >= 0 ? end : STAGES.length;
  const real = at;
  for (let i = 0; i < fake; i++) STAGES.splice(at + i, 0, { ...STAGES[(4 + i) % real], dev: true });
}

export const WAVES_PER_STAGE = 5;
export const STAGES_PER_ACT = 2;
export const WAVES_PER_ACT = WAVES_PER_STAGE * STAGES_PER_ACT; // 10 (ACT_WAVES, the old 30, is gone on purpose)
export const JOURNEY_WAVES = STAGES.length * WAVES_PER_STAGE; // 60 today, 100 once acts 7–10 land
/** Acts in the journey (the last may be a single stage while new stages are being added). */
export const ACT_COUNT = Math.ceil(STAGES.length / STAGES_PER_ACT);
export const MINI_WAVE = 3; // wave within a stage
/** Beating this wave on a heat unlocks the next heat (save.act1Cleared, from when it was the end of Act 1). */
export const HEAT_UNLOCK_WAVE = 30;

/** Wave n's place in the journey (1 … JOURNEY_WAVES), whichever endless loop it's on. */
export function waveInJourney(n: number): number {
  return ((Math.max(1, n) - 1) % JOURNEY_WAVES) + 1;
}

/** Act number (1-based) for wave n, taken from its stage. */
export function actOf(n: number): number {
  const stage = Math.floor((waveInJourney(n) - 1) / WAVES_PER_STAGE);
  return Math.floor(stage / STAGES_PER_ACT) + 1;
}

export function actName(act: number): string {
  return ACTS[act - 1]?.name ?? `Act ${act}`;
}

/** "Act 3 · Out of This World" */
export function actLabel(act: number): string {
  return `Act ${act} · ${actName(act)}`;
}

/** Waves of an act on the first time through: [first, last]. */
export function actWaves(act: number): [number, number] {
  return [(act - 1) * WAVES_PER_ACT + 1, Math.min(JOURNEY_WAVES, act * WAVES_PER_ACT)];
}

/** The first wave of wave n's act (on the same endless loop). */
export function actStartWave(n: number): number {
  return Math.max(1, n) - ((waveInJourney(n) - 1) % WAVES_PER_ACT);
}

/** Does wave n begin an act? */
export function isActStart(n: number): boolean {
  return (waveInJourney(n) - 1) % WAVES_PER_ACT === 0;
}

/** Does wave n end an act (its boss wave closes the act's last stage)? */
export function isActEnd(n: number): boolean {
  const j = waveInJourney(n);
  return j % WAVES_PER_ACT === 0 || j === JOURNEY_WAVES;
}

/** Minion each boss summons (regular foot ids). */
export const BOSS_MINION: Record<string, string> = {
  bigfoot: 'baby',
  ironheel: 'robo',
  clownking: 'clown',
  trex: 'dino',
  colossus: 'stompalot',
  phantomking: 'ghost',
  cosmiccroc: 'alienal',
  nonna: 'doughtoes',
  gargoyle: 'pigeon',
  kraken: 'tidepool',
  rinkqueen: 'skateboard',
  yeti: 'skier',
  // ——— Act 7 · Comics ———
  doomstomp: 'henchman',
  thanfoot: 'jetpack',
  // ——— Act 8 · Norse ———
  fenrir: 'troll',
  thrym: 'frostgiant',
  jormungandr: 'draugr',
  surtr: 'valkyrie',
  // ——— Act 9 · Greek myths ———
  minotaur: 'satyr',
  medusa: 'gorgonsnake',
  cerberus: 'hoplite',
  hades: 'hoplite',
  // ——— Act 10 · Finale ———
  soleprop: 'echobot',
  soleunbound: 'echoclown',
  // ——— Nemesis stages (src/game/nemesis.ts): Batpeel's Gotham ———
  bunion: 'henchman',
  jokester: 'clown',
};
