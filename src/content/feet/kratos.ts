// Kratos's nemesis bosses (src/game/nemesis.ts): with the Kratos Peel (or Kratos, Ghost of Sparta) equipped,
// Tartarus keeps its place and its regular feet, but its two bosses change. Kronos the Titan King (mini, wave 88)
// replaces Cerberus: the Titan king locked in Tartarus, a colossal stone-and-bronze foot in chains. Zeus (wave 90)
// replaces Hades: a towering marble-and-gold foot that hurls lightning and calls in the Olympians. Their fights are
// in src/game/bosses/kratos.ts and their art in src/content/art/kratos.ts. Hades's own Titan (id 'kronos') is a
// different, smaller foot.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'titanking',
    name: 'KRONOS THE TITAN KING',
    desc: 'Mini-boss. The Titan king, chained in Tartarus since the dawn of time: an ancient foot of stone split by great gashes of molten Tartarus, a clock ticking in its bronze shackle, iron chains from ankle to toe and heavier ones holding it to the roof of Tartarus. He eats time, and he eats pizza, and if he tears his chains free he takes Tartarus down with him.',
    hp: 3300, speed: 0.6, armor: 5, stompDmg: 2, coins: 170, score: 14000, scale: 1.5, minWave: 88, weight: 0,
    traits: ['heavy'],
    mini: true,
    home: 'tartarus',
    howTo: 'Smash the hourglass before its sand runs out, and whack his stone head until it spits out the pizza it’s chewing. When he hauls on his chains, smash the glowing link on each one before time runs out (and break the rocks that fall); then smack his broken chains’ blades through his shield and hit him while it’s down.',
    tell: 'The hourglass flips with a grinding boom and ticks; the table rumbles before his head rises behind a pizza; the walls crack and a rock’s shadow grows on a pizza before it lands; a broken chain rattles as it swings in beside him.',
    quips: ['I DEVOURED MY OWN CHILDREN. YOUR PIZZA IS NOTHING.', 'TIME IS MY FOOD.', 'THE AGE OF TITANS RETURNS!', 'SPARTAN. HOW SMALL YOU ARE.'],
    art: { kind: 'nz_titanking', skin: '#8e8a84', primary: '#5c5852', secondary: '#c9873a', leg: 'skin', legColor: '#7e7a74', extra: { sand: '#f0c860' } },
  },
  {
    id: 'zeus',
    name: 'ZEUS',
    desc: 'Boss. The king of Olympus, in a towering sandal of white marble and gold. He hurls thunderbolts, and phase by phase he calls in the Olympians: Poseidon’s wave, Ares’s war cry and Hera’s crown.',
    hp: 8900, speed: 0.6, armor: 5, stompDmg: 3, coins: 440, score: 54000, scale: 2.2, minWave: 90, weight: 0,
    traits: [],
    boss: true,
    home: 'tartarus',
    howTo: 'Smack a crackling storm cloud away before it strikes, and bat his thunderbolts back at him. Knock away the Olympians’ gifts: the trident, the war horn, the crown’s gems.',
    tell: 'A cloud crackles blue over a pizza before a strike; he winds back with a bolt before he hurls it; each Olympian arrives with their own fanfare.',
    quips: ['KNEEL, SPARTAN.', 'I AM THE STORM.', 'OLYMPUS, TO ME!', 'YOU WERE ALWAYS MY PAWN.'],
    art: { kind: 'nz_zeus', skin: '#f2ede4', primary: '#e8e2d6', secondary: '#e8b23a', leg: 'suit', legColor: '#ece6da', legAccent: '#e8b23a', extra: { bolt: '#9fd8ff' } },
  },
];
