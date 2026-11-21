// The Persian army: five feet that march with the Persian Elephant Feet in Act 9 (Greek myths), alone or in a
// war band (see planWave in src/game/Run.ts). Art in src/content/art/persianFeet.ts, behaviour in
// src/game/acts/persians.ts, peel abilities in ABILITIES (src/game/abilities.ts). All of them are `persian`:
// King Leonidas's unlock counts them, and a Satrap's Slipper armours them.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'immortal',
    name: 'Immortal Sandals',
    desc: 'An elite of the Persian king’s guard: a chrome war mask and a black head-scarf over a foot made of living black smoke. When one falls, another steps out of the smoke to take its place, once.',
    hp: 52, speed: 0.95, armor: 2, stompDmg: 1, coins: 16, score: 520, scale: 1.02, minWave: 81, weight: 3,
    traits: [],
    persian: true,
    home: 'tartarus',
    howTo: 'Set it burning before the last smack and it stays down; otherwise another Immortal takes its place',
    tell: 'Smoke streams from the mask’s eyes; when one falls, a black cloud boils up where it stood',
    quips: ['WE ARE TEN THOUSAND.', 'ANOTHER TAKES MY PLACE.', 'NEVER FEWER.'],
    art: { kind: 'p_immortal', skin: '#c9d0da', primary: '#3a3f47', secondary: '#c9d0da', leg: 'chrome', legColor: '#c9d0da', legAccent: '#3a3f47', extra: { curl: '120,112,135' } },
  },
  {
    id: 'archer',
    name: 'Archer Slippers',
    desc: 'Soft saffron slippers with a quiver strapped to the ankle. They hang back near the top and loose arrows at your peel: each one that hits pins it for a moment.',
    hp: 34, speed: 1, armor: 0, stompDmg: 1, coins: 16, score: 500, scale: 0.95, minWave: 81, weight: 3,
    traits: [],
    persian: true,
    home: 'labyrinth',
    howTo: 'Smack the arrow as it flies to bat it back at the archer, or rush the archer: it is fragile',
    tell: 'The bow bends back and its tip glints just before it looses',
    quips: ['LOOSE!', 'THE SKY GOES DARK!', 'DRAW!'],
    art: { kind: 'p_archer', skin: '#d6a074', primary: '#e8a030', secondary: '#2a7a6a', leg: 'suit', legColor: '#2a6a5e' },
  },
  {
    id: 'cavalry',
    name: 'Cavalry Hooves',
    desc: 'A Persian warhorse’s hoof, shod in bronze under a fringed saddle cloth. It gallops sideways along the top to another pizza, then charges straight down without stopping.',
    hp: 42, speed: 1.2, armor: 1, stompDmg: 1, coins: 17, score: 540, scale: 1.08, minWave: 82, weight: 3,
    traits: ['rush'],
    persian: true,
    home: 'labyrinth',
    howTo: 'Smack it mid-gallop: it trips, is stunned and loses its charge',
    tell: 'It rears and whinnies, then dust flies as it gallops across',
    quips: ['CHARGE!', 'HYAAH!', 'RIDE THEM DOWN!'],
    art: { kind: 'p_cavalry', skin: '#7a4e2e', nails: '#2e2420', primary: '#b8202a', secondary: '#e8b43a', leg: 'fur', legColor: '#6e4428' },
  },
  {
    id: 'chariot',
    name: 'Chariot Wheel',
    desc: 'A bronze-booted charioteer riding a scythed war wheel. Now and then it drops to the table and rolls the whole row, chipping a slice off every pizza it passes.',
    hp: 70, speed: 0.85, armor: 3, stompDmg: 1, coins: 20, score: 640, scale: 1.1, minWave: 83, weight: 2,
    traits: ['heavy'],
    persian: true,
    home: 'tartarus',
    howTo: 'Smack the gold hub while it revs or rolls: one good hit breaks the wheel and the charioteer with it',
    tell: 'The wheel spins up, dust kicks off it and a red line runs along the pizzas before it rolls',
    quips: ['CLEAR THE ROAD!', 'WHEELS OF WAR!', 'ROLL OUT!'],
    art: { kind: 'p_chariot', skin: '#c99068', primary: '#8a4a24', secondary: '#c9873a', leg: 'suit', legColor: '#6a2a2a', extra: { cloth: '#b8202a' } },
  },
  {
    id: 'satrap',
    name: 'Satrap’s Slipper',
    desc: 'A provincial governor’s slipper: crimson silk, gold embroidery, pearls and a curled toe. While it lives, the Persian feet near it march with +1 armour.',
    hp: 60, speed: 0.8, armor: 1, stompDmg: 1, coins: 24, score: 700, scale: 1.05, minWave: 84, weight: 2,
    traits: [],
    persian: true,
    home: 'labyrinth',
    howTo: 'Take it out first: the gold lines show which feet it is armouring',
    tell: 'Gold lines run from it to the Persian feet it armours, and their armour glints',
    quips: ['KNEEL!', 'BY ORDER OF THE KING!', 'GUARDS!'],
    art: { kind: 'p_satrap', skin: '#e0b088', primary: '#a8182e', secondary: '#f0c040', leg: 'suit', legColor: '#5a1a4a', extra: { pearl: '#fff4e8' } },
  },
];
