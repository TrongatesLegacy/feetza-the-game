// Two feet that hero unlocks lean on (art in src/content/art/heroFeet.ts, behaviour in src/game/heroFeet.ts).
// Both join the regular pool from their first stage on, with the usual lanes and tells.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'batfeet',
    name: 'Bat Feet',
    desc: 'Hangs high at the top of the screen with its wings folded, then swoops down in zig-zags. Slippery mid-swoop, but every swoop ends in a little hang where it’s wide open.',
    hp: 30, speed: 1.1, armor: 0, stompDmg: 1, coins: 6, score: 220, scale: 0.95, minWave: 36, weight: 5,
    traits: ['zigzag', 'burst'],
    home: 'oldtown',
    howTo: 'Smack it at the bottom of a swoop (double damage), not mid-swoop (half)',
    tell: 'Its wings snap open just before each swoop',
    art: { kind: 'h_bat', skin: '#6e5a82', nails: '#efe3c0', primary: '#3a2d4a', secondary: '#c84a6a', leg: 'tights', legColor: '#2e2438' },
  },
  {
    id: 'spidersocks',
    name: 'Spider Socks',
    desc: 'Drops in on a silk thread, and webs the pizza it lands on: the pizza’s perk stops for a few seconds. Cut the thread and it tumbles.',
    hp: 26, speed: 1.1, armor: 0, stompDmg: 1, coins: 5, score: 200, scale: 0.95, minWave: 16, weight: 5,
    traits: [],
    home: 'diner',
    howTo: 'Smack the thread (it falls, stunned and hurt) or the sock before it lands',
    tell: 'A silk thread runs up from it to the top of the screen',
    art: { kind: 'h_spider', skin: '#efc0a0', primary: '#5a2a8a', secondary: '#7be04a', leg: 'sock', legColor: '#5a2a8a' },
  },
];
