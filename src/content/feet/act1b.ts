// Feet that only appear inside the Stage 4–6 boss fights (src/game/bosses/act1b.ts).
// Weight 0: they never spawn in normal waves. Art kinds are drawn in src/content/art/act1b.ts.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'blacksmith',
    name: 'Blacksmith Boot',
    desc: 'The Colossus\'s armourer. Hammers fresh plates back onto him unless you stop it first.',
    hp: 52, speed: 0.8, armor: 1, stompDmg: 1, coins: 6, score: 240, scale: 1.05, minWave: 25, weight: 0,
    traits: ['heavy'],
    howTo: 'Smack it down before it reaches The Colossus',
    tell: 'It raises its hammer, then swings over to him',
    quips: ['FRESH PLATE!', 'HAMMER TIME!', 'GOOD AS NEW!'],
    art: { kind: 'blacksmith', skin: '#d99a6c', primary: '#3a2c24', secondary: '#9a5a2a', leg: 'jeans', legColor: '#3d3a40' },
  },
];
