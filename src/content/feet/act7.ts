// Act 7 · Comics (waves 61–70): the feet's villains. Metropizza Rooftops (61–65) and The Doom Lab (66–70).
// Regular villain feet: Henchman Spats (gangs of 4), Jetpack Jackboots (fly in sideways) and Goon Galoshes
// (bombs that land on pizzas unless smacked mid-air); their behaviours live in src/game/acts/act7.ts.
// Ultoe Drones only come from the Ultoe fight. Bosses: Lex Lugtoe (mini, 63), Doomstomp (65), Ultoe (mini, 68)
// and Thanfoot (70); their fights are in src/game/bosses/act7.ts. Art kinds are drawn in src/content/art/act7.ts.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  // ——— Villain feet ———
  {
    id: 'henchman',
    name: 'Henchman Spats',
    desc: 'Cheap suits, matching spats, numbered 1 to 4. They never work alone, and they dive in numbered order.',
    hp: 26, speed: 1.05, armor: 1, stompDmg: 1, coins: 6, score: 220, scale: 0.84, minWave: 61, weight: 3,
    traits: [],
    home: 'metropizza',
    howTo: 'They come in gangs of four: smack number 1 first, they dive in order',
    tell: 'The gang lines up under one speech bubble, then dives 1, 2, 3, 4',
    quips: ['GET THE PIZZA, BOYS!', 'YOU HEARD THE BOSS!', 'NOTHING PERSONAL!', 'NUMBER 2, YOU\'RE UP!'],
    art: { kind: 'a7_spats', skin: '#efc0a0', primary: '#2b2d36', secondary: '#f1ede2', leg: 'suit', legColor: '#3a3d48', extra: { band: '#c8323a' } },
  },
  {
    id: 'jetpack',
    name: 'Jetpack Jackboots',
    desc: 'Hobnailed jackboots with rocket heels. They fly in from the side of the screen instead of dropping from above.',
    hp: 40, speed: 1.15, armor: 2, stompDmg: 1, coins: 13, score: 420, scale: 0.95, minWave: 62, weight: 4,
    traits: ['flutter'],
    home: 'metropizza',
    howTo: 'Watch the edges: catch them while they cruise in sideways',
    tell: 'A jet roar and a vapour trail from the side of the screen; the heel jets sputter before it dives',
    quips: ['INCOMING!', 'AIR SUPPORT!', 'TALLY HO!'],
    art: { kind: 'a7_jetboot', skin: '#d99a6c', primary: '#3b3f2e', secondary: '#ff8a1c', leg: 'boot', legColor: '#2e3124' },
  },
  {
    id: 'goon',
    name: 'Goon Galoshes',
    desc: 'Rubber overshoes on a heavy. Each one carries a round black bomb and drops it on a pizza.',
    hp: 52, speed: 0.85, armor: 2, stompDmg: 1, coins: 16, score: 520, scale: 1.02, minWave: 66, weight: 4,
    traits: ['heavy'],
    home: 'doomlab',
    howTo: 'Smack the bomb while it falls; a bomb that lands takes a slice',
    tell: 'It lights the fuse (a fizzing spark) before it lets go of the bomb',
    quips: ['SPECIAL DELIVERY!', 'CATCH!', 'TICK TOCK!'],
    art: { kind: 'a7_galosh', skin: '#d99a6c', primary: '#f2c230', secondary: '#2a2a32', leg: 'jeans', legColor: '#4a4f5e' },
  },
  {
    id: 'ultodrone',
    name: 'Ultoe Drone',
    desc: 'A spare robot sneaker body Ultoe can upload into. Flimsy, endless and all identical, except for one.',
    hp: 14, speed: 1.2, armor: 0, stompDmg: 1, coins: 3, score: 120, scale: 0.72, minWave: 68, weight: 0,
    traits: [],
    home: 'doomlab',
    howTo: 'One smack each; the drone with the glowing core is Ultoe himself',
    tell: 'Its grey core flickers as it boots up',
    quips: ['BEEP.', 'UPLOAD ACCEPTED.', 'SERVING ULTOE.'],
    // same shell, stripes and leg as Ultoe's own body: only the core tells them apart
    art: { kind: 'a7_robosneaker', skin: '#c7ccd4', primary: '#c9d0da', secondary: '#7a2230', leg: 'robot', legColor: '#9aa3b0', extra: { core: '#7d8694', drone: true } },
  },

  // ——— Bosses ———
  {
    id: 'lexlugtoe',
    name: 'LEX LUGTOE',
    desc: 'Mini-boss. A bald billionaire in a power-armour brogue. He buys the table: every pizza gets a price tag, and he locks the ones he acquires in glass.',
    // (2200, was 2600: the act's first fight, and the one that ended the most Regular runs)
    hp: 2200, speed: 0.8, armor: 4, stompDmg: 2, coins: 150, score: 12800, scale: 1.6, minWave: 63, weight: 0,
    traits: ['heavy'],
    mini: true,
    home: 'metropizza',
    howTo: 'Smack the lock on a glass case to break it and get your pizza (and its perk) back.',
    tell: 'A price tag flips to SOLD and a cash register rings before the glass case drops.',
    quips: ['EVERYTHING HAS A PRICE.', 'I\'LL TAKE THE LOT.', 'SOLD! TO THE BALD MAN.'],
    art: { kind: 'a7_lexbrogue', skin: '#efc0a0', primary: '#2f8a4a', secondary: '#7a3fb0', leg: 'armor', legColor: '#2c6a3c', legAccent: '#7a3fb0' },
  },
  {
    id: 'doomstomp',
    name: 'DOOMSTOMP',
    desc: 'Boss. A bone-spiked monster boot that comes back bigger every time you knock it out. Three lives, and the last one only ends with your signature move.',
    hp: 7200, speed: 0.6, armor: 5, stompDmg: 3, coins: 380, score: 46000, scale: 1.9, minWave: 65, weight: 0,
    traits: ['heavy'],
    boss: true,
    home: 'metropizza',
    howTo: 'Knock it out three times. On its last life, smack it to fill your meter, then finish it with your Peel Slam or peel ability.',
    tell: 'Its bone spikes glow red and it paws the table before a rampage.',
    quips: ['DOOMSTOMP SMASH!', 'DOOMSTOMP NOT DONE!', 'MORE PIZZA FOR DOOMSTOMP!'],
    art: { kind: 'a7_doomboot', skin: '#8a9a7a', primary: '#5d6b4a', secondary: '#efe6cf', leg: 'scales', legColor: '#55644a' },
  },
  {
    id: 'ultoe',
    name: 'ULTOE',
    desc: 'Mini-boss. A robot sneaker that copies itself. Every few seconds it uploads into a fresh drone body; only the real one has a glowing core.',
    hp: 2500, speed: 0.95, armor: 3, stompDmg: 2, coins: 160, score: 13600, scale: 1.5, minWave: 68, weight: 0,
    traits: [],
    mini: true,
    home: 'doomlab',
    howTo: 'Find the sneaker with the glowing red core and hit that one. The plain drones are decoys.',
    tell: 'An UPLOADING bar fills over it, then every body glitches at once.',
    quips: ['THERE ARE NO STRINGS ON ME. ONLY LACES.', 'UPLOAD COMPLETE.', 'I AM EVERY SHOE.'],
    art: { kind: 'a7_robosneaker', skin: '#c7ccd4', primary: '#c9d0da', secondary: '#7a2230', leg: 'robot', legColor: '#9aa3b0', extra: { core: '#ff3a3a' } },
  },
  {
    id: 'thanfoot',
    name: 'THANFOOT',
    desc: 'Boss. A purple titan of a foot in the Infinity Sock. He collects six stones; if all six sit in the sock at once, he snaps and every pizza loses half its slices.',
    hp: 8000, speed: 0.58, armor: 5, stompDmg: 3, coins: 420, score: 50000, scale: 2.0, minWave: 70, weight: 0,
    traits: ['heavy'],
    boss: true,
    home: 'doomlab',
    howTo: 'Knock every stone out of the sock before he fills all six. Each one you leave in gives him its power.',
    tell: 'A stone streaks across the sky and clicks into the sock; the sock glows as the Snap winds up.',
    quips: ['I AM INEVITABLE.', 'PERFECTLY BALANCED. HALF THE SLICES.', 'DREAD IT. RUN FROM IT.'],
    art: { kind: 'a7_thanfoot', skin: '#8a5fb0', primary: '#e3b23c', secondary: '#4a2a6a', leg: 'armor', legColor: '#c9982e', legAccent: '#e3b23c' },
  },
];
