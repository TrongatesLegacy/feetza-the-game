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
    desc: 'Leather-strapped and bronze-greaved, they march in pairs behind a round bronze shield that blocks smacks for a second at a time. Bring one to a quarter of its health and it flies into a rage: faster, and quicker to stomp.',
    hp: 44, speed: 1, armor: 1, stompDmg: 1, coins: 10, score: 320, scale: 1, minWave: 81, weight: 3,
    traits: ['guard'],
    home: 'tartarus',
    howTo: 'Smack between shield raises; burst it down from 30% so it never gets to rage, or stun it the moment it flips',
    tell: 'The bronze shield glints as it rises; at a quarter health it flashes red and roars',
    quips: ['SHIELDS!', 'HOLD THE LINE!', 'PHALANX!'],
    art: { kind: 'g_spartan', skin: '#d99a6c', primary: '#7a4a24', secondary: '#c8102e', leg: 'skin', legColor: '#d99a6c', extra: { bronze: '#c9873a' } },
  },
];
