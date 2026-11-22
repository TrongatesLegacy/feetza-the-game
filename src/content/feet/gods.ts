// The two feet that come with the Kratos Peel (art in src/content/art/godFeet.ts, behaviour in
// src/game/acts/gods.ts). Both belong to Act 9 (Greek myths): common there, rare afterwards (see planWave).
// Their peels' abilities are in ABILITIES (src/game/abilities.ts).

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'elephant',
    name: 'Persian Elephant Feet',
    desc: 'A war elephant’s foot in a gold-fringed Persian caparison and bronze plates. Huge, slow and tough (half as tough again as the feet around it). Its trunk swings down with every stomp and hits the pizza next door too, and after a smack it raises its armour for a moment, then has to lower it again.',
    // (64, was 96: Act 9 is now full of them, and at 96 with its guard each one cost Regular more than a slice)
    hp: 64, speed: 0.6, armor: 2, stompDmg: 1, coins: 15, score: 480, scale: 1.4, minWave: 81, weight: 4,
    traits: ['heavy'],
    persian: true,
    home: 'labyrinth',
    howTo: 'Space your smacks to land between its shield-ups, or freeze it',
    tell: 'Its trunk curls up and it trumpets just before it stomps; gold plates flash up when it shields',
    quips: ['HRRRRUMPH!', 'MAKE WAY!', 'TRAMPLE!'],
    art: { kind: 'g_elephant', skin: '#8e8a86', nails: '#efe6d0', primary: '#b8202a', secondary: '#e8b43a', leg: 'skin', legColor: '#8e8a86' },
  },
  {
    id: 'spartan',
    name: 'Spartan Sandals',
    desc: 'Leather-strapped and bronze-greaved, they march in pairs behind a round bronze shield that is up for a second, then swings down to their side for a moment. Land a hit while it’s down and they slam it straight back up for twice as long. Smacks on the shield crack it until it breaks (6 on Regular), and 9 seconds later (on Regular) they fetch a new one. Stunned, they drop their guard. Bring one to a quarter of its health and it flies into a rage: it hurls its shield at your peel (smack it away, or your peel is stunned), then comes on faster and quicker to stomp, with nothing left to block.',
    hp: 44, speed: 1, armor: 1, stompDmg: 1, coins: 10, score: 320, scale: 1, minWave: 81, weight: 3,
    traits: ['guard'],
    // its shield's own rhythm: up for a second, down for 1.2 s; a hit while it's down slams it up for 2 s
    guard: { up: [1, 1], down: 1.2, warn: 0.5, react: 2 },
    home: 'tartarus',
    howTo: 'One hit per opening (OPEN! on the badge): it slams its shield up for twice as long after each hit. Or break the shield: 6 smacks (4 on Mild, 8 from Extra Hot; a Peel Slam takes 3). When it rages it throws the shield at your peel: smack it away',
    tell: 'The shield trembles and its rim glows just before it swings down, and the badge’s blue ring runs out; at a quarter health it roars, its badge flashes RAGE and it rears back to throw',
    quips: ['SHIELDS!', 'HOLD THE LINE!', 'PHALANX!'],
    art: { kind: 'g_spartan', skin: '#d99a6c', primary: '#7a4a24', secondary: '#c8102e', leg: 'skin', legColor: '#d99a6c', extra: { bronze: '#c9873a' } },
  },
];
