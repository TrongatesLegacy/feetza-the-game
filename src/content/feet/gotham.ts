// Batpeel's Gotham (a nemesis stage, src/game/nemesis.ts): with Batpeel equipped, Metropizza Rooftops becomes
// Goth-Ham Rooftops and its two bosses change. Bunion (mini, wave 63) is a hulking wrestling boot pumped with
// Venom; the Jokester (wave 65) is a prankster's winklepicker. Parodies with looks of our own. Their fights are in
// src/game/bosses/gotham.ts and their art in src/content/art/gotham.ts. The stage's regular feet are Metropizza's.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'bunion',
    name: 'BUNION',
    desc: 'Mini-boss. A hulking wrestling boot pumped full of Venom. Three Venom vials clipped to it feed it through green hoses; the fuller they get, the harder it hits. At half health it tries to break a pizza.',
    hp: 2700, speed: 0.75, armor: 4, stompDmg: 2, coins: 160, score: 13200, scale: 1.65, minWave: 63, weight: 0,
    traits: ['heavy'],
    mini: true,
    home: 'gotham',
    howTo: 'Smack a glowing vial to drain it before all three fill. When he grabs a pizza, smack him fast to make him let go.',
    tell: 'A vial glows and gurgles as it fills; with all three full he roars, veins lit, before the Venom Surge.',
    quips: ['NOBODY CARED WHO I WAS UNTIL I PUT ON THE BOOT.', 'I WILL BREAK YOUR PIZZA.', 'THE OVEN RISES!', 'YOU MERELY ADOPTED THE CRUST.'],
    art: { kind: 'gt_bunion', skin: '#b88262', primary: '#2c2e36', secondary: '#7dff6a', leg: 'skin', legColor: '#b88262' },
  },
  {
    id: 'jokester',
    name: 'THE JOKESTER',
    desc: 'Boss. The Clown Prince of Crust: a curly-toed winklepicker with a painted grin. His joke boxes land on your pizzas (some are gifts, some are bombs), his laughing gas makes feet dance out of reach, and his finale is a gauntlet of trick props.',
    hp: 7600, speed: 0.7, armor: 4, stompDmg: 3, coins: 400, score: 48000, scale: 1.75, minWave: 65, weight: 0,
    traits: [],
    boss: true,
    home: 'gotham',
    howTo: 'Smack the ticking boxes before they blow and leave the ones with bows alone. Smack gas clouds away. In the finale, beat each trick prop to open his guard.',
    tell: 'Bombs tick and shake under a red fuse; gifts sparkle under a gold bow. Gas hisses out of his lapel flower first.',
    quips: ['WHY SO SOLEMN?', 'HA! HA! HA-HA-HA!', 'HERE\'S MY CARD.', 'JUST A LITTLE PRANK!'],
    art: { kind: 'gt_jokester', skin: '#f4ece0', primary: '#5b2a86', secondary: '#9be23a', leg: 'suit', legColor: '#4a2470', legAccent: '#9be23a', extra: { grin: '#e0202a' } },
  },
];
