// The 60-wave journey: 12 stages, each a location (waves 1–4 of the stage) and a boss arena (wave 5).
// A mini-boss arrives partway through wave 3 of every stage, inside the location.

import type { ArenaId, LocationId } from '../art/backdrops';

export interface Stage {
  location: LocationId;
  /** Main boss id; its arena backdrop has the same id. */
  boss: ArenaId;
  mini: string;
  act: 1 | 2;
}

export const STAGES: Stage[] = [
  { location: 'trattoria', mini: 'headwaiter', boss: 'bigfoot', act: 1 },
  { location: 'rooftop', mini: 'sweep', boss: 'ironheel', act: 1 },
  { location: 'beach', mini: 'sandcastle', boss: 'clownking', act: 1 },
  { location: 'diner', mini: 'shortorder', boss: 'trex', act: 1 },
  { location: 'lodge', mini: 'iceskate', boss: 'colossus', act: 1 },
  { location: 'space', mini: 'ufotoe', boss: 'cosmiccroc', act: 1 },
  { location: 'kitchen', mini: 'doughboy', boss: 'nonna', act: 2 },
  { location: 'oldtown', mini: 'pigeonking', boss: 'gargoyle', act: 2 },
  { location: 'pier', mini: 'jellyfish', boss: 'kraken', act: 2 },
  { location: 'rink', mini: 'milkshake', boss: 'rinkqueen', act: 2 },
  { location: 'slopes', mini: 'lumberjack', boss: 'yeti', act: 2 },
  { location: 'cellar', mini: 'poltergeist', boss: 'phantomking', act: 2 },
];

export const WAVES_PER_STAGE = 5;
export const JOURNEY_WAVES = STAGES.length * WAVES_PER_STAGE; // 60
export const ACT_WAVES = JOURNEY_WAVES / 2; // 30
export const MINI_WAVE = 3; // wave within a stage

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
};
