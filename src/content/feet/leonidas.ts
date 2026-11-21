// King Leonidas's nemesis (src/game/nemesis.ts): with Leonidas equipped, the Labyrinth (stage 17, waves 81–85) becomes
// the Hot Gates, and its bosses change. The Immortal Brute (mini, wave 83) leads the Immortal Horde: waves of masked
// Immortal Sandals, then the giant champion himself, a hulking masked brute with a blade on a chain. Xerxes (wave 85)
// is a towering god-king sandal in gold, chains and piercings who darkens the sky with arrows and sends in his war
// rhino and war elephants. Our own names and designs. Their fights are in src/game/bosses/leonidas.ts and their art
// in src/content/art/leonidas.ts. The stage's regular feet are the Labyrinth's.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'immortalbrute',
    name: 'THE IMMORTAL BRUTE',
    desc: 'Mini-boss. The champion of the Immortal Horde: a hulking masked brute in iron scale, swinging a great blade on a chain. His horde marches first; he waits behind it.',
    hp: 3200, speed: 0.6, armor: 5, stompDmg: 2, coins: 170, score: 14000, scale: 1.6, minWave: 83, weight: 0,
    traits: ['heavy'],
    mini: true,
    home: 'hotgates',
    howTo: 'Beat his Immortals: he can’t be hurt while two or more of them march. When he whirls his blade, smack it to snag the chain before it slams down.',
    tell: 'A war horn blows before each wave of the horde; the chain whistles as the blade whirls over a pair of pizzas.',
    quips: ['NO ONE LEAVES THE PASS.', 'WE ARE MANY. YOU ARE FEW.', 'THE BLADE IS HUNGRY.', 'RRRAAAGH!'],
    art: { kind: 'lx_brute', skin: '#8a6a5a', primary: '#3a3440', secondary: '#c9c4bc', leg: 'armor', legColor: '#3a3440', extra: { mask: '#e8e4dc' } },
  },
  {
    id: 'xerxes',
    name: 'XERXES',
    desc: 'Boss. The self-made god-king: a towering sandal of gold, hung with chains and rings, on a foot that has never once touched the ground. He darkens the sky with arrows and sends in his war beasts.',
    hp: 8800, speed: 0.6, armor: 5, stompDmg: 3, coins: 440, score: 54000, scale: 2.2, minWave: 85, weight: 0,
    traits: [],
    boss: true,
    home: 'hotgates',
    howTo: 'Bat the falling arrows away before they land. Smack the war rhino before it charges. While his elephants stand, he can’t be hurt: beat them first.',
    tell: 'The sky goes dark before the arrows fall; the rhino paws the ground at the top of its lane; a trumpet blares before the elephants come.',
    quips: ['I AM GENEROUS.', 'KNEEL, AND YOU MAY KEEP YOUR PIZZA.', 'MY ARROWS WILL BLOT OUT THE SUN.', 'A GOD-KING DOES NOT BLEED.'],
    art: { kind: 'lx_xerxes', skin: '#b8865a', primary: '#e8b23a', secondary: '#c9873a', leg: 'skin', legColor: '#b8865a', extra: { gem: '#c8102e' } },
  },
];
