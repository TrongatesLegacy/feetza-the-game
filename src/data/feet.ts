// The foot roster. Every foot has gameplay stats, traits and art parameters.

export type FootTrait =
  | 'dodge' // sidesteps when hit
  | 'feint' // fake descents
  | 'stink' // damages the pizza below while hovering
  | 'phase' // periodically intangible
  | 'revive' // gets back up once
  | 'burst' // descends in rocket bursts
  | 'zigzag' // weaves side to side
  | 'flee' // leaves after a while (bonus foot)
  | 'immuneSlow'
  | 'immuneBurn'
  | 'swarm' // spawns in groups
  | 'flutter' // recovers quickly from knockback
  | 'wide' // stomps neighbouring pizzas too
  | 'split' // splits into baby feet on death
  | 'teleport' // blinks to another pizza
  | 'heavy' // shrugs off knockback
  | 'floaty' // huge knockback, slow recovery
  | 'glossy' // first smack slips off
  | 'soggy' // stomped pizza takes +1 from the next stomp
  | 'rush' // barely hovers
  | 'enrage' // faster below half HP
  | 'crack' // each smack strips 1 armour
  | 'pierce' // ignores shields, traps and shrugs
  | 'parry' // blocks the first smack of each dive
  | 'cheer' // nearby feet move faster
  | 'double' // stomps twice
  | 'regen' // regenerates HP
  | 'switch' // changes pizza mid-dive
  | 'clumsy' // sometimes trips back up
  | 'woolly' // absorbs the first 15 damage
  | 'tender' // every smack is a crit
  | 'scorch' // stomped pizza burns another slice
  | 'tiny'; // narrow hitbox (informational)

export type FootKind =
  | 'bare'
  | 'sock'
  | 'toesock'
  | 'sneaker'
  | 'boot'
  | 'clown'
  | 'ballet'
  | 'skate'
  | 'flipper'
  | 'robot'
  | 'flipflop'
  | 'cowboy'
  | 'bigfoot'
  | 'heel'
  | 'slipper'
  | 'roller'
  | 'sandal'
  | 'clog'
  | 'wellie'
  | 'moonboot'
  | 'knight'
  | 'elf'
  | 'peg'
  | 'dino'
  | 'alien'
  | 'mummy'
  | 'cast'
  | 'dadsandal'
  | 'tap'
  | 'platform'
  | 'cleat'
  | 'webbed';

export type LegKind =
  | 'skin'
  | 'jeans'
  | 'sock'
  | 'tights'
  | 'clown'
  | 'robot'
  | 'fur'
  | 'boot'
  | 'ribbon'
  | 'suit'
  | 'armor'
  | 'bandage'
  | 'cast'
  | 'scales'
  | 'wood'
  | 'puffy';

export interface FootArt {
  kind: FootKind;
  skin: string;
  nails?: string; // polish colour (undefined = natural)
  hair?: boolean;
  primary?: string; // shoe/sock main colour
  secondary?: string; // accent colour
  leg: LegKind;
  legColor?: string;
  legAccent?: string;
  ghost?: boolean;
  lava?: boolean;
  gold?: boolean;
  zombie?: boolean;
  stink?: boolean;
  chubby?: boolean;
  steelToe?: boolean;
  tattoo?: boolean;
  bandaids?: boolean;
  argyle?: boolean;
  toeRing?: boolean;
  sunburn?: boolean;
  frost?: boolean;
}

export interface FootType {
  id: string;
  name: string;
  desc: string;
  hp: number;
  speed: number;
  armor: number;
  stompDmg: number;
  coins: number;
  score: number;
  scale: number;
  minWave: number;
  weight: number;
  traits: FootTrait[];
  art: FootArt;
  boss?: boolean;
  quips?: string[];
}

const SKIN = {
  pale: '#f6d3bf',
  light: '#efc0a0',
  tan: '#d99a6c',
  brown: '#a86b45',
  dark: '#6e4329',
};

export const FEET: FootType[] = [
  {
    id: 'bob',
    name: 'Barefoot Bob',
    desc: 'The classic. Hasn\'t worn shoes since 1997 and won\'t start now.',
    hp: 24, speed: 1, armor: 0, stompDmg: 1, coins: 2, score: 100, scale: 1, minWave: 1, weight: 10,
    traits: [],
    art: { kind: 'bare', skin: SKIN.light, leg: 'jeans', legColor: '#3d5a8a' },
  },
  {
    id: 'patty',
    name: 'Pedicure Patty',
    desc: 'Fresh coat of polish. Very fast. Very rude. The wet polish makes your first smack slip right off.',
    hp: 18, speed: 1.25, armor: 0, stompDmg: 1, coins: 3, score: 120, scale: 0.95, minWave: 1, weight: 7,
    traits: ['glossy'],
    art: { kind: 'bare', skin: SKIN.tan, nails: '#ff3d7f', leg: 'skin' },
  },
  {
    id: 'sock',
    name: 'Sweaty Sock',
    desc: 'Worn three days straight. Leaves pizzas soggy, so the next stomp hits harder.',
    hp: 32, speed: 0.85, armor: 0, stompDmg: 1, coins: 3, score: 120, scale: 1, minWave: 2, weight: 7,
    traits: ['soggy'],
    art: { kind: 'sock', skin: SKIN.light, primary: '#f4f1ea', secondary: '#d8343f', leg: 'sock' },
  },
  {
    id: 'baby',
    name: 'Baby Toes',
    desc: 'Tiny. Chubby. Arrives with siblings. One smack does it.',
    hp: 8, speed: 1.5, armor: 0, stompDmg: 1, coins: 1, score: 60, scale: 0.6, minWave: 2, weight: 5,
    traits: ['swarm'],
    art: { kind: 'bare', skin: '#ffd2c2', chubby: true, leg: 'skin' },
  },
  {
    id: 'flipflop',
    name: 'Flip-Flop Phil',
    desc: 'Beach-bodied and in a hurry. Barely hovers before diving in.',
    hp: 18, speed: 1.4, armor: 0, stompDmg: 1, coins: 3, score: 130, scale: 1, minWave: 3, weight: 6,
    traits: ['rush'],
    art: { kind: 'flipflop', skin: SKIN.brown, primary: '#18b5c9', secondary: '#ffcc33', leg: 'skin' },
  },
  {
    id: 'tina',
    name: 'Toe-Sock Tina',
    desc: 'Five toes, five colours. Sidesteps when smacked.',
    hp: 26, speed: 1.05, armor: 0, stompDmg: 1, coins: 4, score: 150, scale: 1, minWave: 3, weight: 5,
    traits: ['dodge'],
    art: { kind: 'toesock', skin: SKIN.pale, leg: 'sock', primary: '#7b5cff', secondary: '#ffd23f' },
  },
  {
    id: 'harold',
    name: 'Hairy Harold',
    desc: 'More carpet than foot. All that fluff cushions your knockback.',
    hp: 48, speed: 0.8, armor: 1, stompDmg: 1, coins: 4, score: 160, scale: 1.08, minWave: 4, weight: 5,
    traits: ['heavy'],
    art: { kind: 'bare', skin: SKIN.tan, hair: true, leg: 'skin' },
  },
  {
    id: 'sneaker',
    name: 'Sneaker Steve',
    desc: 'Limited-edition kicks. Gets furious (and faster) once you knock it below half health.',
    hp: 40, speed: 1.05, armor: 2, stompDmg: 1, coins: 4, score: 160, scale: 1, minWave: 4, weight: 6,
    traits: ['enrage'],
    art: { kind: 'sneaker', skin: SKIN.light, primary: '#ff5a36', secondary: '#ffffff', leg: 'jeans', legColor: '#2b2f3a' },
  },
  {
    id: 'stan',
    name: 'Stinky Stan',
    desc: 'You can smell him from here. Hovering stink spoils the pizza below.',
    hp: 34, speed: 0.9, armor: 0, stompDmg: 1, coins: 5, score: 170, scale: 1, minWave: 5, weight: 4,
    traits: ['stink'],
    art: { kind: 'bare', skin: '#d6c38f', stink: true, nails: '#7a8a3a', leg: 'suit', legColor: '#6b5a3e' },
  },
  {
    id: 'bella',
    name: 'Ballerina Bella',
    desc: 'En pointe and full of tricks. Fakes a stomp, then strikes.',
    hp: 26, speed: 1.2, armor: 0, stompDmg: 1, coins: 5, score: 180, scale: 0.95, minWave: 5, weight: 4,
    traits: ['feint'],
    art: { kind: 'ballet', skin: SKIN.pale, primary: '#ffb3c7', secondary: '#ff7aa2', leg: 'ribbon' },
  },
  {
    id: 'boot',
    name: 'Steel-Toe Stomper',
    desc: 'Work boot with a steel cap. Heavy armour that cracks a little with every smack.',
    hp: 70, speed: 0.75, armor: 5, stompDmg: 2, coins: 7, score: 240, scale: 1.1, minWave: 6, weight: 4,
    traits: ['crack'],
    art: { kind: 'boot', skin: SKIN.light, primary: '#8a5a2b', secondary: '#c7ccd4', steelToe: true, leg: 'jeans', legColor: '#4a6aa0' },
  },
  {
    id: 'cowboy',
    name: 'Cowboy Cal',
    desc: 'Yee-haw. Weaves left and right on the way down.',
    hp: 36, speed: 1, armor: 2, stompDmg: 1, coins: 5, score: 190, scale: 1.02, minWave: 6, weight: 4,
    traits: ['zigzag'],
    art: { kind: 'cowboy', skin: SKIN.light, primary: '#a0552a', secondary: '#f2c14e', leg: 'boot' },
  },
  {
    id: 'skate',
    name: 'Ice Queen',
    desc: 'Glides in on a razor blade. Cold-blooded: immune to slows.',
    hp: 30, speed: 1.35, armor: 1, stompDmg: 2, coins: 6, score: 200, scale: 1, minWave: 7, weight: 3,
    traits: ['immuneSlow'],
    art: { kind: 'skate', skin: SKIN.pale, primary: '#f7f9fc', secondary: '#9fd8ff', leg: 'tights', legColor: '#bfe6ff' },
  },
  {
    id: 'flipper',
    name: 'Scuba Sam',
    desc: 'Flaps right back after a smack. Smells faintly of pool.',
    hp: 34, speed: 1.05, armor: 0, stompDmg: 1, coins: 5, score: 190, scale: 1.05, minWave: 7, weight: 3,
    traits: ['flutter'],
    art: { kind: 'flipper', skin: SKIN.tan, primary: '#1fc8a6', secondary: '#0b6f73', leg: 'suit', legColor: '#1d2633' },
  },
  {
    id: 'clown',
    name: 'Honk-a-Toe',
    desc: 'Enormous shoe. So wide it squashes the neighbouring pizzas too.',
    hp: 80, speed: 0.7, armor: 0, stompDmg: 1, coins: 9, score: 260, scale: 1.15, minWave: 8, weight: 3,
    traits: ['wide'],
    art: { kind: 'clown', skin: SKIN.pale, primary: '#e5242f', secondary: '#ffd400', leg: 'clown', legColor: '#2fa3ff', legAccent: '#ffd400' },
  },
  {
    id: 'ghost',
    name: 'Phantom Foot',
    desc: 'Half there. Flickers out of reality, so time your smacks.',
    hp: 30, speed: 1.05, armor: 0, stompDmg: 1, coins: 7, score: 230, scale: 1, minWave: 9, weight: 3,
    traits: ['phase'],
    art: { kind: 'bare', skin: '#cfe9ff', ghost: true, nails: '#8fc7ff', leg: 'skin' },
  },
  {
    id: 'zombie',
    name: 'Zombie Toes',
    desc: 'Undead and unbothered. Gets back up once after being smacked down.',
    hp: 36, speed: 0.85, armor: 0, stompDmg: 1, coins: 7, score: 230, scale: 1.02, minWave: 10, weight: 3,
    traits: ['revive'],
    art: { kind: 'bare', skin: '#9fb98a', zombie: true, nails: '#3b3b2f', leg: 'jeans', legColor: '#5b5d4a' },
  },
  {
    id: 'robo',
    name: 'Robo-Stomp 3000',
    desc: 'Rocket-assisted. Descends in sudden bursts. Thick plating.',
    hp: 60, speed: 0.9, armor: 4, stompDmg: 2, coins: 9, score: 280, scale: 1.08, minWave: 11, weight: 3,
    traits: ['burst', 'immuneBurn'],
    art: { kind: 'robot', skin: '#9aa7b5', primary: '#c3cdd8', secondary: '#33e1ff', leg: 'robot' },
  },
  {
    id: 'lava',
    name: 'Magma Toes',
    desc: 'Molten rock with an attitude. Immune to burns; its stomps leave pizzas smouldering.',
    hp: 50, speed: 0.95, armor: 2, stompDmg: 2, coins: 9, score: 280, scale: 1.05, minWave: 12, weight: 2,
    traits: ['immuneBurn', 'scorch'],
    art: { kind: 'bare', skin: '#3a2a26', lava: true, leg: 'skin' },
  },
  {
    id: 'mitosis',
    name: 'Double Trouble',
    desc: 'Smack it and it splits into a pair of baby feet.',
    hp: 40, speed: 0.9, armor: 0, stompDmg: 1, coins: 6, score: 220, scale: 1.1, minWave: 9, weight: 2,
    traits: ['split'],
    art: { kind: 'bare', skin: '#ffb8d9', nails: '#8a3cff', chubby: true, leg: 'tights', legColor: '#ff8fc4' },
  },
  {
    id: 'sasha',
    name: 'Stiletto Sasha',
    desc: 'Sharp heels, sharper toes. Pierces cheese shields and mousetraps; skewers two slices.',
    hp: 22, speed: 1.3, armor: 0, stompDmg: 2, coins: 5, score: 180, scale: 0.95, minWave: 4, weight: 4,
    traits: ['pierce'],
    art: { kind: 'heel', skin: SKIN.light, primary: '#d0103a', secondary: '#ffd9e2', leg: 'tights', legColor: '#3a2a2a' },
  },
  {
    id: 'bunny',
    name: 'Bunny Slipper',
    desc: 'Fluffy, adorable, and absolutely here to ruin dinner.',
    hp: 38, speed: 0.8, armor: 1, stompDmg: 1, coins: 4, score: 150, scale: 1.05, minWave: 2, weight: 5,
    traits: ['floaty'],
    art: { kind: 'slipper', skin: SKIN.pale, primary: '#fff3f7', secondary: '#ffa3c4', leg: 'suit', legColor: '#6a7fd0' },
  },
  {
    id: 'rita',
    name: 'Roller Rita',
    desc: 'Rolls in from the 80s. Weaves left and right at speed.',
    hp: 24, speed: 1.35, armor: 1, stompDmg: 1, coins: 5, score: 180, scale: 1, minWave: 5, weight: 4,
    traits: ['zigzag'],
    art: { kind: 'roller', skin: SKIN.tan, primary: '#ffffff', secondary: '#ff4fa3', leg: 'tights', legColor: '#36d6c3' },
  },
  {
    id: 'gus',
    name: 'Gladiator Gus',
    desc: 'Strapped in for battle. Parries the first smack of every dive.',
    hp: 40, speed: 0.95, armor: 3, stompDmg: 1, coins: 5, score: 180, scale: 1.05, minWave: 6, weight: 4,
    traits: ['parry'],
    art: { kind: 'sandal', skin: SKIN.brown, primary: '#7a4a22', secondary: '#d9a441', leg: 'skin' },
  },
  {
    id: 'clyde',
    name: 'Clog Clyde',
    desc: 'Rubber clog, ventilated for comfort. Bounces off smacks.',
    hp: 30, speed: 1.05, armor: 0, stompDmg: 1, coins: 4, score: 150, scale: 1.02, minWave: 3, weight: 5,
    traits: ['flutter'],
    art: { kind: 'clog', skin: SKIN.light, primary: '#7bd14a', secondary: '#ffd23f', leg: 'jeans', legColor: '#8a7a5a' },
  },
  {
    id: 'wendy',
    name: 'Wellie Wendy',
    desc: 'Fresh from a puddle. Heavy rubber boot, hard to knock back.',
    hp: 44, speed: 0.85, armor: 2, stompDmg: 1, coins: 5, score: 170, scale: 1.05, minWave: 4, weight: 4,
    traits: ['heavy'],
    art: { kind: 'wellie', skin: SKIN.pale, primary: '#ffd000', secondary: '#1b1b1b', leg: 'boot' },
  },
  {
    id: 'moe',
    name: 'Moon Boot Mo',
    desc: 'Low gravity. Smacks send it sky-high, but it comes down hard.',
    hp: 46, speed: 0.75, armor: 1, stompDmg: 2, coins: 6, score: 200, scale: 1.1, minWave: 8, weight: 3,
    traits: ['floaty', 'immuneSlow'],
    art: { kind: 'moonboot', skin: SKIN.pale, primary: '#f2f5fa', secondary: '#ff5a36', leg: 'puffy', legColor: '#f2f5fa', legAccent: '#ff5a36' },
  },
  {
    id: 'stompalot',
    name: 'Sir Stompalot',
    desc: 'Clad in full plate. Barely notices weak smacks.',
    hp: 60, speed: 0.7, armor: 8, stompDmg: 2, coins: 8, score: 260, scale: 1.08, minWave: 10, weight: 3,
    traits: ['heavy'],
    art: { kind: 'knight', skin: SKIN.light, primary: '#b9c2cc', secondary: '#c8a24a', leg: 'armor' },
  },
  {
    id: 'jingle',
    name: 'Jingle Toes',
    desc: 'Curly-toed and festive. Its jingle cheers nearby feet into moving faster.',
    hp: 20, speed: 1.45, armor: 0, stompDmg: 1, coins: 5, score: 170, scale: 0.95, minWave: 6, weight: 4,
    traits: ['cheer'],
    art: { kind: 'elf', skin: SKIN.pale, primary: '#1f9a4a', secondary: '#d81f2a', leg: 'tights', legColor: '#d81f2a', legAccent: '#ffffff' },
  },
  {
    id: 'pete',
    name: 'Peg-Leg Pete',
    desc: 'Arr! A wooden peg makes a tiny target but a mighty jab.',
    hp: 30, speed: 1.1, armor: 2, stompDmg: 2, coins: 6, score: 200, scale: 1, minWave: 7, weight: 3,
    traits: ['tiny'],
    art: { kind: 'peg', skin: SKIN.tan, primary: '#8a5a32', secondary: '#c9a25a', leg: 'suit', legColor: '#3a2a4a' },
  },
  {
    id: 'dino',
    name: 'Dino Stomper',
    desc: 'Scaly, clawed and 65 million years hungry. Stomps twice before lifting off.',
    hp: 64, speed: 0.8, armor: 2, stompDmg: 1, coins: 8, score: 240, scale: 1.12, minWave: 9, weight: 3,
    traits: ['double'],
    art: { kind: 'dino', skin: '#5fae4a', primary: '#5fae4a', secondary: '#f2d36b', leg: 'scales', legColor: '#5fae4a' },
  },
  {
    id: 'xeno',
    name: 'Xeno Toes',
    desc: 'Three toes, zero manners. Teleports between pizzas.',
    hp: 32, speed: 1.05, armor: 0, stompDmg: 1, coins: 7, score: 230, scale: 1, minWave: 10, weight: 3,
    traits: ['teleport'],
    art: { kind: 'alien', skin: '#9b6bff', primary: '#9b6bff', secondary: '#7dffb0', leg: 'skin' },
  },
  {
    id: 'mummy',
    name: 'Mummy Toes',
    desc: 'Wrapped for eternity. Unwraps itself and comes back once.',
    hp: 34, speed: 0.85, armor: 1, stompDmg: 1, coins: 7, score: 230, scale: 1.02, minWave: 11, weight: 3,
    traits: ['revive'],
    art: { kind: 'mummy', skin: '#e9dcb8', primary: '#e9dcb8', secondary: '#8a7d5c', leg: 'bandage' },
  },
  {
    id: 'bill',
    name: 'Broken Bill',
    desc: 'Covered in signatures. The plaster cast is basically armour.',
    hp: 50, speed: 0.7, armor: 4, stompDmg: 1, coins: 6, score: 200, scale: 1.05, minWave: 7, weight: 3,
    traits: ['heavy'],
    art: { kind: 'cast', skin: SKIN.light, primary: '#f5f2ea', secondary: '#3a6ad0', leg: 'cast' },
  },
  {
    id: 'dad',
    name: 'Socks & Sandals Dad',
    desc: 'A crime against fashion. So comfortable it slowly heals between smacks.',
    hp: 42, speed: 0.85, armor: 2, stompDmg: 1, coins: 5, score: 180, scale: 1.05, minWave: 5, weight: 4,
    traits: ['regen'],
    art: { kind: 'dadsandal', skin: SKIN.light, primary: '#5a3a22', secondary: '#f4f1ea', leg: 'sock', legColor: '#f4f1ea', legAccent: '#8aa0c8' },
  },
  {
    id: 'tappy',
    name: 'Tappy Tom',
    desc: 'Shuffle-ball-change! Tap-dances down in sudden bursts.',
    hp: 28, speed: 1.05, armor: 1, stompDmg: 1, coins: 5, score: 190, scale: 1, minWave: 8, weight: 3,
    traits: ['burst'],
    art: { kind: 'tap', skin: SKIN.light, primary: '#141414', secondary: '#d9dde3', leg: 'suit', legColor: '#1a1a24' },
  },
  {
    id: 'disco',
    name: 'Disco Dee',
    desc: 'Platform soles and glitter. Struts in with a sidestep.',
    hp: 30, speed: 1.1, armor: 1, stompDmg: 2, coins: 6, score: 210, scale: 1, minWave: 9, weight: 3,
    traits: ['dodge'],
    art: { kind: 'platform', skin: SKIN.dark, primary: '#c13cff', secondary: '#ffe14d', leg: 'jeans', legColor: '#f2f2f2' },
  },
  {
    id: 'striker',
    name: 'Striker Sid',
    desc: 'Studded boots and a killer instinct. Lightning fast; switches pizzas mid-dive.',
    hp: 26, speed: 1.55, armor: 1, stompDmg: 1, coins: 6, score: 200, scale: 1, minWave: 6, weight: 3,
    traits: ['switch'],
    art: { kind: 'cleat', skin: SKIN.brown, primary: '#1b1b1b', secondary: '#39ff88', leg: 'sock', legColor: '#f2f2f2', legAccent: '#1b1b1b' },
  },
  {
    id: 'quack',
    name: 'Quackfoot',
    desc: 'Webbed and waddling. Flaps back up after every smack.',
    hp: 26, speed: 1.1, armor: 0, stompDmg: 1, coins: 4, score: 160, scale: 0.95, minWave: 3, weight: 4,
    traits: ['flutter'],
    art: { kind: 'webbed', skin: '#ff9f1c', primary: '#ff9f1c', secondary: '#c96a00', leg: 'scales', legColor: '#ffb84d' },
  },
  {
    id: 'wally',
    name: 'Werewolf Wally',
    desc: 'Only comes out at dinner time. Shaggy, clawed and quick.',
    hp: 40, speed: 1.2, armor: 1, stompDmg: 1, coins: 6, score: 210, scale: 1.05, minWave: 8, weight: 3,
    traits: ['zigzag'],
    art: { kind: 'bigfoot', skin: '#4a4a52', primary: '#7a7a86', secondary: '#2b2b30', leg: 'fur', hair: true },
  },
  {
    id: 'tony',
    name: 'Tattoo Tony',
    desc: 'Inked from ankle to toe. "MOM" is on the big one. Gets angry and faster when hurt.',
    hp: 30, speed: 1.05, armor: 1, stompDmg: 1, coins: 4, score: 150, scale: 1.02, minWave: 3, weight: 5,
    traits: ['enrage'],
    art: { kind: 'bare', skin: SKIN.light, tattoo: true, toeRing: true, leg: 'jeans', legColor: '#1d1d22' },
  },
  {
    id: 'clara',
    name: 'Clumsy Clara',
    desc: 'Stubbed every toe on every table. Sometimes trips over nothing and stumbles back up.',
    hp: 22, speed: 1.15, armor: 0, stompDmg: 1, coins: 3, score: 120, scale: 0.95, minWave: 2, weight: 6,
    traits: ['clumsy'],
    art: { kind: 'bare', skin: SKIN.pale, bandaids: true, nails: '#5fd3ff', leg: 'tights', legColor: '#ffe14d' },
  },
  {
    id: 'arthur',
    name: 'Argyle Arthur',
    desc: 'A gentleman\'s sock. The thick wool soaks up the first 15 damage.',
    hp: 30, speed: 0.95, armor: 0, stompDmg: 1, coins: 4, score: 140, scale: 1, minWave: 3, weight: 5,
    traits: ['woolly'],
    art: { kind: 'sock', skin: SKIN.light, argyle: true, primary: '#2f4a7a', secondary: '#e9c46a', leg: 'sock' },
  },
  {
    id: 'sue',
    name: 'Sunburnt Sue',
    desc: 'Fell asleep on the beach. Do NOT touch. (Touch it: every smack is a critical hit.)',
    hp: 20, speed: 1.2, armor: 0, stompDmg: 1, coins: 4, score: 140, scale: 0.98, minWave: 4, weight: 4,
    traits: ['tender'],
    art: { kind: 'flipflop', skin: '#f0846a', sunburn: true, primary: '#ff3d7f', secondary: '#ffffff', leg: 'skin' },
  },
  {
    id: 'fred',
    name: 'Frosty Fred',
    desc: 'Walked here through a blizzard. Icy toes shrug off slows.',
    hp: 34, speed: 1, armor: 1, stompDmg: 1, coins: 5, score: 180, scale: 1, minWave: 7, weight: 3,
    traits: ['immuneSlow'],
    art: { kind: 'bare', skin: '#b9dcff', frost: true, nails: '#e8f6ff', leg: 'puffy', legColor: '#3a6ad0', legAccent: '#ffffff' },
  },
  {
    id: 'golden',
    name: 'Golden Foot',
    desc: 'A rare treasure. Smack it before it escapes for a pile of tips.',
    hp: 40, speed: 0.6, armor: 0, stompDmg: 0, coins: 40, score: 600, scale: 0.95, minWave: 3, weight: 0,
    traits: ['flee'],
    art: { kind: 'bare', skin: '#f7c948', gold: true, leg: 'skin' },
  },
  // ——— Bosses ———
  {
    id: 'bigfoot',
    name: 'BIGFOOT',
    desc: 'Boss. Legendary. Hairy. Every stomp rattles the whole table and summons Baby Toes.',
    hp: 700, speed: 0.55, armor: 2, stompDmg: 2, coins: 60, score: 5000, scale: 2.2, minWave: 5, weight: 0,
    traits: ['immuneSlow'],
    boss: true,
    art: { kind: 'bigfoot', skin: '#5b3a24', primary: '#7a5233', secondary: '#2b1a10', leg: 'fur', hair: true },
  },
  {
    id: 'ironheel',
    name: 'THE IRON HEEL',
    desc: 'Boss. A foundry-forged mega boot that fires rocket stomps.',
    hp: 1300, speed: 0.6, armor: 6, stompDmg: 2, coins: 90, score: 8000, scale: 2.2, minWave: 10, weight: 0,
    traits: ['burst', 'immuneBurn'],
    boss: true,
    art: { kind: 'robot', skin: '#5f6670', primary: '#b33a3a', secondary: '#ffb02e', leg: 'robot' },
  },
  {
    id: 'clownking',
    name: 'KING HONK',
    desc: 'Boss. The clown shoe to end all clown shoes. Squashes the whole table.',
    hp: 1900, speed: 0.6, armor: 3, stompDmg: 2, coins: 120, score: 12000, scale: 2.2, minWave: 15, weight: 0,
    traits: ['wide', 'zigzag'],
    boss: true,
    art: { kind: 'clown', skin: SKIN.pale, primary: '#8a2be2', secondary: '#39ff88', leg: 'clown', legColor: '#ff3d7f', legAccent: '#39ff88' },
  },
  {
    id: 'trex',
    name: 'T-REX TOES',
    desc: 'Boss. A prehistoric mega-stomp. Shrugs off knockback entirely.',
    hp: 2600, speed: 0.6, armor: 4, stompDmg: 2, coins: 150, score: 16000, scale: 2.2, minWave: 20, weight: 0,
    traits: ['heavy', 'immuneSlow'],
    boss: true,
    art: { kind: 'dino', skin: '#4a7a3a', primary: '#4a7a3a', secondary: '#ffcc33', leg: 'scales', legColor: '#4a7a3a' },
  },
  {
    id: 'colossus',
    name: 'THE COLOSSUS',
    desc: 'Boss. A cathedral of armour. Only massive smacks get through.',
    hp: 3200, speed: 0.55, armor: 10, stompDmg: 2, coins: 180, score: 20000, scale: 2.2, minWave: 25, weight: 0,
    traits: ['heavy', 'burst'],
    boss: true,
    art: { kind: 'knight', skin: SKIN.light, primary: '#6d7480', secondary: '#ffcf3a', leg: 'armor' },
  },
  {
    id: 'phantomking',
    name: 'GHOST OF FEET PAST',
    desc: 'Boss. Haunts the whole table, phasing in and out between stomps.',
    hp: 3800, speed: 0.65, armor: 3, stompDmg: 3, coins: 220, score: 26000, scale: 2.2, minWave: 30, weight: 0,
    traits: ['phase', 'teleport'],
    boss: true,
    art: { kind: 'bare', skin: '#cfe9ff', ghost: true, nails: '#8fc7ff', leg: 'skin' },
  },
];

export const FOOT_BY_ID: Record<string, FootType> = Object.fromEntries(FEET.map((f) => [f.id, f]));
export const BOSS_ORDER = ['bigfoot', 'ironheel', 'clownking', 'trex', 'colossus', 'phantomking'];

/** Short labels for the Pizzapedia and callouts. */
export const TRAIT_INFO: Record<FootTrait, string> = {
  dodge: '🌀 Dodges smacks',
  feint: '🩰 Fakes a stomp',
  stink: '💨 Stink cloud',
  phase: '👻 Phases out',
  revive: '🧟 Gets back up once',
  burst: '🚀 Rocket bursts',
  zigzag: '〰️ Zig-zags',
  flee: '🏃 Escapes if ignored',
  immuneSlow: '🧊 Immune to slows',
  immuneBurn: '🔥 Immune to burns',
  swarm: '👶 Arrives in groups',
  flutter: '🪽 Bounces back fast',
  wide: '↔️ Squashes neighbours',
  split: '✂️ Splits in two',
  teleport: '✨ Teleports',
  heavy: '🪨 Resists knockback',
  floaty: '🎈 Floats high when hit',
  glossy: '💅 First smack slips off',
  soggy: '💦 Leaves pizza soggy',
  rush: '⚡ Barely hovers',
  enrage: '😡 Enrages when hurt',
  crack: '🛡️ Armour cracks',
  pierce: '📌 Pierces defences',
  parry: '⚔️ Parries a smack',
  cheer: '🔔 Speeds up allies',
  double: '🦖 Double stomp',
  regen: '❤️‍🩹 Regenerates',
  switch: '🔀 Switches pizzas',
  clumsy: '🤕 Clumsy',
  woolly: '🧶 Absorbs 15 damage',
  tender: '🔥 Every smack crits',
  scorch: '♨️ Scorches pizza',
  tiny: '🎯 Tiny target',
};

export const OUCH = [
  'OUCH!', 'YOWCH!', 'EEK!', 'OOF!', 'MY TOE!', 'NOT THE TOES!', 'HEY!', 'RUDE!', 'AIEEE!', 'OWIE!', 'BONK!', 'YIKES!',
];
