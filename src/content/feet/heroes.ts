// Two feet that hero unlocks lean on (art in src/content/art/heroFeet.ts, behaviour in src/game/heroFeet.ts).
// Both belong to Act 7 (Comics): common there, rare afterwards (see planWave). Weight 4 (was 5): new in Act 7
// they also get the fresh and home bonuses, and at 5 they crowded its opening waves (their peels need 25 kills).

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'batfeet',
    name: 'Bat Feet',
    desc: 'Hangs high at the top of the screen with its wings folded, then swoops down in zig-zags. Slippery mid-swoop, but every swoop ends in a little hang where it’s wide open.',
    hp: 30, speed: 1.1, armor: 0, stompDmg: 1, coins: 6, score: 220, scale: 0.95, minWave: 61, weight: 4,
    traits: ['zigzag', 'burst'],
    home: 'doomlab',
    howTo: 'Smack it at the bottom of a swoop (double damage), not mid-swoop (half)',
    tell: 'Its wings snap open just before each swoop',
    art: { kind: 'h_bat', skin: '#6e5a82', nails: '#efe3c0', primary: '#3a2d4a', secondary: '#c84a6a', leg: 'tights', legColor: '#2e2438' },
  },
  {
    id: 'spidersocks',
    name: 'Spider Socks',
    desc: 'Drops in on a silk thread, and webs the pizza it lands on: the pizza’s perk stops for a few seconds. Cut the thread and it tumbles.',
    hp: 26, speed: 1.1, armor: 0, stompDmg: 1, coins: 5, score: 200, scale: 0.95, minWave: 61, weight: 4,
    traits: [],
    home: 'metropizza',
    howTo: 'Smack the thread (it falls, stunned and hurt) or the sock before it lands',
    tell: 'A silk thread runs up from it to the top of the screen',
    art: { kind: 'h_spider', skin: '#efc0a0', primary: '#5a2a8a', secondary: '#7be04a', leg: 'sock', legColor: '#5a2a8a' },
  },
];
