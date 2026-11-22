// The comic heroes' nemesis bosses (src/game/nemesis.ts): each turns up only with its hero equipped, in place of that
// stage's mini-boss. The Doom Lab's Ultoe (wave 68) gives way to the Red Sole for Captain Pizzeria and to Venomnom for
// Spider-Pan; Metropizza's Lex Lugtoe (wave 63) gives way to the Cheetoe for Wonder Wedge. Parodies with looks of our
// own. Their fights are in src/game/bosses/comics.ts and their art in src/content/art/comics.ts.

import type { FootType } from '../../data/feet';

export const feet: FootType[] = [
  {
    id: 'redsole',
    name: 'THE RED SOLE',
    desc: 'Mini-boss. A black military jackboot with a crimson skull for a toe cap, and the head of HYDRANT. He has stolen the Cosmic Crouton, a cube of pure power, and he means to use it on your pizzas.',
    hp: 2800, speed: 0.75, armor: 4, stompDmg: 2, coins: 160, score: 13200, scale: 1.5, minWave: 68, weight: 0,
    traits: ['heavy'],
    mini: true,
    home: 'doomlab',
    howTo: 'Smack the Cosmic Crouton while it charges and its beam backfires into him. Cap the hydrant turrets. When he marches, smack him on each stomp to stop him.',
    tell: 'The cube hums and glows blue over a lane before it fires; a turret rattles before it sprays; his heels click before each stomp.',
    quips: ['HAIL HYDRANT!', 'THE CRUMB SHALL RISE!', 'I HAVE SEEN THE FUTURE, CAPTAIN. YOU ARE NOT IN IT.', 'CUT OFF ONE SLICE…'],
    art: { kind: 'cm_redsole', skin: '#c8402e', primary: '#1e1c20', secondary: '#c8102e', leg: 'boot', legColor: '#2a2a2e', extra: { band: '#c8102e' } },
  },
  {
    id: 'venomnom',
    name: 'VENOMNOM',
    desc: 'Mini-boss. A sneaker swallowed by a hungry black symbiote: all teeth, tongue and goo. It wants your slices, and it wants Spider-Pan. It hates loud noises.',
    hp: 2800, speed: 0.85, armor: 3, stompDmg: 2, coins: 160, score: 13200, scale: 1.5, minWave: 68, weight: 0,
    traits: [],
    mini: true,
    home: 'doomlab',
    howTo: 'Smack its tongue before it reaches a pizza. Break the goo that binds a pizza, and smack a sonic emitter on the lab wall to make it shriek and shed its goo.',
    tell: 'It drools and growls before the tongue lashes out; goo bubbles round a pizza before it binds; the emitters glow when they’re ready.',
    quips: ['WE ARE HUNGRY.', 'EYES. LUNGS. PIZZA.', 'WE ARE VENOMNOM!', 'TASTY LITTLE SLICES…'],
    art: { kind: 'cm_venomnom', skin: '#1a1a22', primary: '#14141c', secondary: '#f4f4f8', leg: 'scales', legColor: '#16161e', extra: { tongue: '#e0507a' } },
  },
  {
    id: 'cheetoe',
    name: 'THE CHEETOE',
    desc: 'Mini-boss. A cursed cat-sneaker, cheese-dust orange with black rosettes, claws out and tail lashing. The fastest thing on the rooftops, and she hunts at night.',
    hp: 2600, speed: 1.1, armor: 3, stompDmg: 2, coins: 160, score: 13000, scale: 1.45, minWave: 63, weight: 0,
    traits: [],
    mini: true,
    home: 'metropizza',
    howTo: 'When she crouches over a pizza, smack her twice to spoil the pounce. Keep your peel off the red claw lines. In the hunt, smack the amber eyes in the leaves, not the green ones.',
    tell: 'She crouches with her tail lashing and eyes glowing before a pounce; red lines flash before her claws rake; her eyes glint amber in the leaves.',
    quips: ['HERE, KITTY KITTY? I THINK NOT.', 'NINE LIVES. HOW MANY HAVE YOU?', 'SSSSST!', 'FASTER THAN YOUR PEEL, PRINCESS.'],
    art: { kind: 'cm_cheetoe', skin: '#f0a040', primary: '#f09a2a', secondary: '#2a1810', leg: 'fur', legColor: '#e8902a', extra: { claw: '#fff6e8' } },
  },
];
