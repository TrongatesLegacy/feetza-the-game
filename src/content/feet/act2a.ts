// Stage 7–9 boss adds. The Gargoyle's storm calls these instead of pigeons (see src/game/bosses/act2a.ts).
// They reuse the Gargoyle's own art kind, but small and in warm sandstone with terracotta wings and bright
// moss, so they read as the gutters' little imps next to the boss's cold grey granite. Weight 0: they only
// ever come from the boss.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'gargoylet',
    name: 'Little Gargoyle',
    desc: 'A pocket-sized stone imp off the cathedral gutters. Flocks around the Gargoyle and guards it.',
    hp: 16, speed: 1.3, armor: 0, stompDmg: 1, coins: 4, score: 160, scale: 0.66, minWave: 40, weight: 0,
    traits: [],
    home: 'oldtown',
    howTo: 'One or two smacks each; clear the flock to expose the Gargoyle',
    tell: 'Grit falls as the flock swoops in',
    art: { kind: 'gargoyle', skin: '#d8bf8e', primary: '#b4603a', secondary: '#7fb04a', leg: 'scales', legColor: '#c4a676' },
  },
];
