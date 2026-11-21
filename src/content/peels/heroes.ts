// The 50 hero peels (Thor, number 10, comes with the Norse gods). Each one is a row: its name, how it unlocks
// (a HeroGoal, see src/game/heroGoals.ts), its head (src/art/heroHeads.ts) and its ability.
// Signature moves and custom passives are built by hand in src/game/heroMoves.ts, keyed by `move` and the peel id.
// Names are close parodies by design; every costume and emblem is our own.

import { P, TRIG, type Ability, type Effect } from '../../game/abilities';
import type { HeroGoal } from '../../game/heroGoals';
import { heroLook, type HeroArt } from '../../art/heroHeads';
import type { HeroPeel } from '../heroPeels';
import { save } from '../../systems/save';

const RED = 0xff5a3c;
const ORANGE = 0xff9f1c;
const GOLD = 0xffd23f;
const GREEN = 0x7be04a;
const CYAN = 0x5fd8ff;
const BLUE = 0x4c7dff;
const PURPLE = 0xa77dff;
const PINK = 0xff7ad9;
const WHITE = 0xffffff;
const BROWN = 0xb07a3a;

const active = { t: 'active' } as const;

/** A hero ability: the signature move (by id), its meter speed, and the locker text. */
function sig(name: string, move: string, charge: number, color: number, desc: string, also?: Ability['also']): Ability {
  return { name, trigger: active, fx: [{ e: 'move', id: move }], charge, color, vfx: 'burst', custom: true, desc, also };
}

/** A hero with no button: its move fires itself (the Incredible Bulk). */
function noButton(name: string, move: string, color: number, desc: string): Ability {
  return { name, trigger: { t: 'always' }, fx: [{ e: 'move', id: move }], charge: 1, color, vfx: 'burst', custom: true, desc };
}

const stat = (mods: Extract<Effect, { e: 'stat' }>['mods']): Ability['also'] => ({ trigger: { t: 'always' }, fx: [P.STAT(mods)] });

interface Row {
  id: string;
  name: string;
  goal: HeroGoal;
  how: string;
  art: HeroArt;
  ability: Ability;
}

const S = '{slam}';
const sighting = (id: Extract<HeroGoal, { kind: 'sighting' }>['id']): HeroGoal => ({ kind: 'sighting', id, need: 3 });
const track = (key: string, need = 1): HeroGoal => ({ kind: 'track', key, need });

const ROWS: Row[] = [
  {
    id: 'superpeel',
    name: 'Superpeel',
    goal: sighting('bird'),
    how: 'Is it a bird? Is it a pizza? Catch the caped flyby 3 times. It streaks across the top of the screen on rare waves: smack it twice.',
    art: { suit: '#2a5fd0', suit2: '#2350b8', cape: '#e0242f', skin: '#f2c8a6', mask: 'open', eyes: 'friendly', hair: '#2a1d1a', hairStyle: 'quiff', emblem: 'star4', emblemColor: '#ffd23f', emblemBg: '#e0242f', extras: ['belt'], trail: '#e0242f', handle: '#c8102e', fine: true },
    ability: sig('Heat Vision', 'heatVision', 0.8, RED, `Signature (${S} when the meter is full): the peel’s eyes glow, then two red beams sweep across the top third of the screen: ×10 to every foot they touch, a 1.5 s stun and a burn. Passive, Man of Steel: your peel can’t be stunned, frozen, slowed or snatched.`),
  },
  {
    id: 'batpeel',
    name: 'Batpeel',
    goal: { kind: 'secret', id: 'signal', need: 3 },
    how: 'The Signal: on night stages, a winged shape sometimes lights up the clouds for a few seconds. Smack it 3 times.',
    art: { suit: '#3a3d4c', suit2: '#2b2d3a', cape: '#1d1f2b', skin: '#e8c4a0', mask: 'cowl', maskColor: '#2b2d3a', eyes: 'slits', ears: 'bat', emblem: 'nightSlice', emblemColor: '#ffd23f', emblemBg: '#2b2d3a', extras: ['utilityBelt'], trail: '#ffd23f', handle: '#2b2d3a', fine: true },
    ability: sig('Night Falls', 'nightFalls', 0.8, GOLD, `Signature (${S}): the lights go out for 12 s. A spotlight follows your peel, feet in the dark move 30% slower, and an exploding wing-boomerang flies every 2 s (×2.5 out, ×2.5 back, a blast as it lands). Passive, Utility Belt: every wave hands you one gadget that fires itself when it’s needed: a smoke pellet (stuns the diving feet), a grapple (yanks the front foot back up) or a gel charge (×6 on the toughest foot).`),
  },
  {
    id: 'wonderwedge',
    name: 'Wonder Wedge',
    goal: track('bossNoSlices'),
    how: 'Amazon Trial: beat a boss without losing a single slice in its wave.',
    art: { suit: '#c8102e', suit2: '#1f3fbf', skin: '#e6b48c', mask: 'open', eyes: 'friendly', hair: '#1d1410', hairStyle: 'long', extras: ['tiara', 'bracers'], emblem: 'laurel', emblemColor: '#ffd23f', emblemBg: '#c8102e', trail: '#ffd23f', handle: '#ffd23f' },
    ability: sig('Lasso of Truth', 'lasso', 1.2, GOLD, `Signature (${S}): a golden lasso ropes the toughest foot. Its next stomp is cancelled and its weak spot glows: ×3 damage there for 6 s. Passive, Bracers: 15% of stomps glance off with a ping.`),
  },
  {
    id: 'flashfoot',
    name: 'The Flashfoot',
    goal: track('fastWave'),
    how: 'Fastest peel alive: clear a wave in under 8 seconds.',
    art: { suit: '#d8202a', mask: 'full', maskColor: '#d8202a', eyes: 'white', ears: 'boltWings', earColor: '#ffd23f', emblem: 'chevrons', emblemColor: '#ffd23f', emblemBg: '#a8121a', skin: '#efc0a0', extras: ['chin'], trail: '#ffd23f', handle: '#ffd23f' },
    ability: sig('Speed Force', 'speedForce', 0.85, GOLD, `Signature (${S}): the world slows to 25% for 6 s while your peel moves at full speed, leaving a lightning trail. Passive, Blur: every 4 s a blur hits the 3 front feet (×1.5).`),
  },
  {
    id: 'aquatoe',
    name: 'Aqua-Toe',
    goal: track('gullStreak', 10),
    how: 'King of the seas: deal with 10 Golden Seagulls in a row without letting one get away.',
    art: { suit: '#ff8a1c', suit2: '#2f9a4a', pattern: 'scales', patternColor: '#ffd23f', skin: '#e8b890', mask: 'open', eyes: 'friendly', hair: '#e8b23a', hairStyle: 'mane', emblem: 'wave', emblemColor: '#5fd8ff', emblemBg: '#1f6a8a', trail: '#5fd8ff', handle: '#2f9a4a' },
    ability: sig('Call of the Deep', 'callDeep', 0.9, CYAN, `Signature (${S}): shark fins circle under the table for 10 s and bite any foot that dips low (×3). Passive, Tidal Calm: pizzas never go stale at The Pier or Shack Attack Beach Bar.`),
  },
  {
    id: 'greenlampshade',
    name: 'Green Lampshade',
    goal: sighting('comet'),
    how: 'In brightest day: catch the green comet sighting 3 times.',
    art: { suit: '#1f9a4a', suit2: '#1a1d22', skin: '#efc0a0', mask: 'domino', maskColor: '#1f9a4a', eyes: 'white', hair: '#5a3a22', hairStyle: 'short', emblem: 'lampshade', emblemColor: '#7dff9a', emblemBg: '#1a1d22', glow: '#7dff9a', trail: '#7dff9a', handle: '#1f9a4a' },
    ability: sig('Construct', 'construct', 0.9, GREEN, `Signature (${S}): a giant glowing green peel takes shape and sweeps the table twice (×6 each sweep, knockback). Passive, Oath: the meter fills 10% faster for each wave in a row you lose no slices (up to +50%).`),
  },
  {
    id: 'spiderpan',
    name: 'Spider-Pan',
    goal: track('lastMoment', 25),
    how: 'With great timing: smack 25 feet in the last 0.3 seconds before they stomp.',
    art: { suit: '#d8202a', pattern: 'web', patternColor: '#1a1418', mask: 'full', maskColor: '#d8202a', eyes: 'bigWhite', emblem: 'sliceSpider', emblemColor: '#1a1418', trail: '#d8202a', handle: '#2a4ab8' },
    ability: sig('Web Ceiling', 'webCeiling', 0.9, RED, `Signature (${S}): webs span the top of the screen for 10 s. Every foot that drops through them sticks for 2 s. Passive, Spider-Sense: a foot’s outline tingles 0.5 s before it stomps.`),
  },
  {
    id: 'ironpan',
    name: 'Iron Pan',
    goal: track('ironheelUnstunned'),
    how: 'Better armour: beat the Iron Heel without your peel ever being stunned.',
    art: { shape: 'square', suit: '#b81d24', mask: 'faceplate', maskColor: '#e8b23a', eyes: 'glowSlits', eyeColor: '#d8f6ff', emblem: 'core', emblemColor: '#9ff0ff', emblemBg: '#7a1218', metal: true, extras: ['rivets'], trail: '#ffd23f', handle: '#e8b23a' },
    ability: sig('Suit Up', 'suitUp', 0.75, ORANGE, `Signature (${S}): armour plates snap onto the peel for 20 s. Auto repulsors fire at the nearest foot every 0.7 s (×2), and the suit ends with a Unibeam down the centre lane (×15). Passive, HUD: every foot shows a health bar.`),
  },
  {
    id: 'captainpizzeria',
    name: 'Captain Pizzeria',
    goal: track('shieldBlocks', 50),
    how: 'Shield up: block 50 stomps with stomp shields.',
    art: { suit: '#2a4ab8', skin: '#efc0a0', mask: 'helmet', maskColor: '#2a4ab8', eyes: 'friendly', ears: 'smallWings', earColor: '#f4f1ea', emblem: 'pizzaShield', emblemColor: '#f4f1ea', emblemBg: '#c8102e', extras: ['chin'], trail: '#f4f1ea', handle: '#c8102e' },
    ability: sig('Shield Bounce', 'shieldBounce', 1.1, BLUE, `Signature (${S}): the star shield ricochets 8 times round the screen (×3 each). Passive, I can do this all day: +30% damage while any pizza is on 1 slice.`),
  },
  {
    id: 'incrediblebulk',
    name: 'The Incredible Bulk',
    goal: track('bulkWave'),
    how: 'Don’t make him angry: lose 5 slices in one wave and still clear it.',
    art: { suit: '#5fb84a', suit2: '#6a3a9a', mask: 'none', eyes: 'angry', hair: '#1d1a14', hairStyle: 'messy', extras: ['grimace', 'torn'], pattern: 'cracks', patternColor: '#3a7a2a', trail: '#7be04a', handle: '#6a3a9a' },
    ability: noButton('Bulk Smash', 'bulkSmash', GREEN, 'No button: lose 3 slices in one wave and the peel turns green, doubles in size and smashes for 15 s (×2 damage, and every smack sends out a quake ring). Once a wave.'),
  },
  {
    id: 'blackwindow',
    name: 'Black Window',
    goal: track('highWave'),
    how: 'Nobody gets close: clear a wave without a single foot reaching the bottom half of the screen.',
    art: { suit: '#1d1a24', skin: '#f2c8a6', mask: 'open', eyes: 'sly', hair: '#c8341a', hairStyle: 'bob', emblem: 'window', emblemColor: '#e0242f', emblemBg: '#1d1a24', metal: true, trail: '#e0242f', handle: '#1d1a24' },
    ability: sig('Red Ledger', 'redLedger', 1.1, RED, `Signature (${S}): marks the 5 toughest feet in red. Each takes ×2 and is stunned for 2 s when next hit. Passive, Widow’s Bite: 25% of smacks stun for 1.5 s.`, { trigger: TRIG.smack(0.25), fx: [P.ST(1.5, P.hit())] }),
  },
  {
    id: 'hawkeyetalian',
    name: 'Hawk-Eye-Talian',
    goal: track('tripleHits', 50),
    how: 'Trick shot: hit 3 feet with one smack, 50 times (a wider smack helps).',
    art: { suit: '#5a2a7a', skin: '#efc0a0', mask: 'domino', maskColor: '#3a1a5a', eyes: 'squint', hair: '#c89a5a', hairStyle: 'short', ears: 'fletching', earColor: '#7a4a9a', emblem: 'target', emblemColor: '#ffd23f', emblemBg: '#5a2a7a', trail: '#a77dff', handle: '#3a1a5a' },
    ability: sig('Trick Quiver', 'trickQuiver', 1.1, PURPLE, `Signature (${S}): 6 arrows in a row, each a different trick: pierce (×3 through a line), explode (×3 and a blast), net (a 2.5 s stun), freeze (×2 and a 2 s freeze), magnet (pulls feet together, ×1.5 each) and split (three ×2 pieces). Passive, Never Misses: a smack within 20 px of a foot still hits it.`, stat({ radius: 20 })),
  },
  {
    id: 'wolverpeel',
    name: 'Wolverpeel',
    goal: track('comeback'),
    how: 'Hardest to kill: get down to one pizza, then come back and win the run.',
    art: { suit: '#f2c230', mask: 'cowl', maskColor: '#2a4a9a', skin: '#e0a880', eyes: 'angry', ears: 'fins', earColor: '#2a4a9a', hair: '#2a1d14', hairStyle: 'sideburns', emblem: 'claws', emblemColor: '#d8dde4', emblemBg: '#f2c230', trail: '#d8dde4', handle: '#2a4a9a' },
    ability: sig('Berserker', 'berserker', 0.85, WHITE, `Signature (${S}): three claws pop out for 15 s. Every smack hits twice and makes the foot bleed (1×/s for 3 s). Passive, Healing Factor: every pizza regrows 1 slice each wave.`, stat({ regenPerWave: 1 })),
  },
  {
    id: 'stormyweather',
    name: 'Stormy Weather',
    goal: track('rainyKill'),
    how: 'Weather witch: smack down Rainy Ray while his downpour is falling (while he hovers over his pizza).',
    art: { suit: '#1a1d2a', skin: '#8a5a3a', mask: 'open', eyes: 'glow', eyeColor: '#f4f8ff', hair: '#f4f4f8', hairStyle: 'long', emblem: 'cloudBolt', emblemColor: '#f4f8ff', emblemBg: '#3a4a7a', extras: ['tiara'], trail: '#c8e0ff', handle: '#3a4a7a' },
    ability: sig('Storm Front', 'stormFront', 0.9, CYAN, `Signature (${S}): the sky turns, and for 6 s lightning hits 5 random feet every second (×1.5 each). Passive, Weather Eye: outdoor stages get a light rain that slows every foot by 10%.`),
  },
  {
    id: 'cyclopizza',
    name: 'Cyclopizza',
    goal: sighting('visor'),
    how: 'Eyes on the prize: catch the visor glint sighting 3 times.',
    art: { suit: '#1f2f6a', suit2: '#f2c230', skin: '#efc0a0', mask: 'visorBand', maskColor: '#3a3d4c', eyes: 'visor', eyeColor: '#ff2a2a', hair: '#5a3a22', hairStyle: 'short', emblem: 'eye', emblemColor: '#ff2a2a', emblemBg: '#f2c230', trail: '#ff4a3a', handle: '#1f2f6a' },
    ability: sig('Optic Blast', 'opticBlast', 1, RED, `Signature (${S}): the visor opens, and for 4 s a red beam shoots up from your peel and follows wherever you aim (×6 a second). Passive, Visor: +10% crit chance.`, stat({ critChance: 0.1 })),
  },
  {
    id: 'blackpanther',
    name: 'Black Pan-ther',
    goal: track('act2Run'),
    how: 'King’s journey: clear all of Act 2 (waves 31 to 60) in one run.',
    art: { suit: '#1d1a24', pattern: 'plates', patternColor: '#4a4458', mask: 'full', maskColor: '#1d1a24', eyes: 'slits', ears: 'cat', earColor: '#1d1a24', emblem: 'fangs', emblemColor: '#c9b8ff', emblemBg: '#1d1a24', metal: true, glow: '#a77dff', trail: '#a77dff', handle: '#3a3444' },
    ability: sig('Kinetic Release', 'kinetic', 1, PURPLE, `Signature (${S}): every hit you’ve landed this wave is released at once as a purple shockwave: ×0.2 for each hit, up to ×20, to every foot. Passive, Vibranium: a stomp blocked by a shield charges the meter 20%.`),
  },
  {
    id: 'strangeloaf',
    name: 'Doctor Strangeloaf',
    goal: { kind: 'value', read: () => bestWave(), need: 60 },
    how: 'Master of the mystic oven: reach wave 60 on any heat.',
    art: { suit: '#1f3a8a', skin: '#efc0a0', mask: 'open', eyes: 'stern', hair: '#2a1d14', hairStyle: 'swept', extras: ['highCollar', 'goatee'], cape: '#c8102e', emblem: 'amulet', emblemColor: '#7dff9a', emblemBg: '#e8b23a', trail: '#7dff9a', handle: '#c8102e' },
    ability: sig('Time Stone', 'timeStone', 1, GREEN, `Signature (${S}): rewinds the last 5 seconds. Pizzas get back the slices they lost in that time, and every foot goes back to where it was (the feet you beat stay beaten). Passive, Mystic Shield: once a wave, a pizza is saved from destruction (it stays on 1 slice).`),
  },
  {
    id: 'scarletpitch',
    name: 'Scarlet Pitch',
    goal: track('fiveStatuses'),
    how: 'Reality bends: have 5 different status effects on feet at once (burn, slow, stun, freeze, mark, shrink, bleed, web…).',
    art: { suit: '#b0102e', skin: '#f2c8a6', mask: 'open', eyes: 'glow', eyeColor: '#ff7ad9', hair: '#7a1a2a', hairStyle: 'long', extras: ['crownSpikes'], emblem: 'hex', emblemColor: '#ff7ad9', emblemBg: '#6a0a1a', glow: '#ff4a8a', trail: '#ff4a8a', handle: '#b0102e' },
    ability: sig('Chaos Hex', 'chaosHex', 1, PINK, `Signature (${S}): every foot gets a random hex: shrink (×1.5 damage taken), freeze (2.5 s), burn (1.5×/s), mark (×2 for 6 s), swap places with another foot, or turn gold (pays ×5 tips). Bosses only get marked.`),
  },
  {
    id: 'antpan',
    name: 'Ant-Pan',
    goal: track('quickMini'),
    how: 'Small but mighty: beat a mini-boss in 25 smacks or fewer.',
    art: { suit: '#c8202a', suit2: '#1a1a1e', mask: 'helmet', maskColor: '#9aa3ad', eyes: 'lenses', eyeColor: '#ff6a5a', ears: 'antennae', earColor: '#3a3d4c', emblem: 'arrowsInOut', emblemColor: '#f4f1ea', emblemBg: '#c8202a', metal: true, trail: '#ff6a5a', handle: '#1a1a1e' },
    ability: sig('Giant-Size', 'giantSize', 0.85, RED, `Signature (${S}): the peel grows to 3× its size for 10 s: huge reach and ×2 damage. Passive, Shrink Ray: every 7 s, 3 feet shrink and take ×2 for 5 s.`),
  },
  {
    id: 'daredough',
    name: 'Dare-Dough',
    goal: track('cleanCellar'),
    how: 'Fearless in the dark: clear a Haunted Cellar wave without missing a single smack.',
    art: { suit: '#8a1a1e', mask: 'full', maskColor: '#8a1a1e', skin: '#e0a880', eyes: 'none', ears: 'horns', earColor: '#8a1a1e', emblem: 'doubleD', emblemColor: '#1d1410', emblemBg: '#8a1a1e', extras: ['chin'], trail: '#ff3a3a', handle: '#5a0a10' },
    ability: sig('Radar Sense', 'radarSense', 0.9, RED, `Signature (${S}): the screen goes dark for 8 s with every foot in red outline, and every hit is a crit. Passive, Fearless: ghost, phasing and invisible feet can always be hit (and always be seen).`),
  },
  {
    id: 'deadpeel',
    name: 'Deadpeel',
    goal: track('pizzasLost', 50),
    how: 'Can’t stay dead: lose 50 pizzas in total. (He’d tell you that’s the fun way.)',
    art: { suit: '#c8102e', pattern: 'seams', patternColor: '#7a0a14', mask: 'full', maskColor: '#c8102e', eyes: 'patches', extras: ['katanas'], emblem: 'cutter', emblemColor: '#1a1418', emblemBg: '#c8102e', trail: '#c8102e', handle: '#1a1418' },
    ability: sig('Maximum Effort', 'maxEffort', 1, RED, `Signature (${S}): grabs the tips counter off the screen and throws the coins at feet: 10% of your tips (at least 10, at most 40), ×1 a coin. He quips the whole time. Passive, Regenerating: a destroyed pizza comes back next wave on 2 slices.`),
  },
  {
    id: 'silverslicer',
    name: 'Silver Slicer',
    goal: track('hotSpace'),
    how: 'Herald of the cosmos: clear Orbital Pizzeria (beat the Cosmic Croc) on Hot or hotter.',
    art: { suit: '#c9cfd8', mask: 'none', eyes: 'glow', eyeColor: '#ffffff', metal: true, pattern: 'chrome', patternColor: '#ffffff', emblem: 'fin', emblemColor: '#e8edf2', emblemBg: '#7a8494', trail: '#e8edf2', handle: '#9aa3ad', glow: '#d8f6ff' },
    ability: sig('Cosmic Board', 'cosmicBoard', 1, WHITE, `Signature (${S}): surfs across the screen 3 times, through every foot in the way (×4 each pass). Passive, Herald: shows the next wave’s feet before it starts.`),
  },
  {
    id: 'iamcrust',
    name: 'I Am Crust',
    goal: track('fiveThroughStage'),
    how: 'I am Crust. (Keep 5 pizzas alive through a whole stage.)',
    art: { suit: '#8a5a32', suit2: '#6a4224', pattern: 'bark', patternColor: '#4a2a14', mask: 'none', eyes: 'happy', ears: 'leaves', earColor: '#5fb84a', extras: ['smile'], emblem: 'leaf', emblemColor: '#7be04a', emblemBg: '#6a4224', trail: '#7be04a', handle: '#6a4224' },
    ability: sig('I Am Crust', 'iAmCrust', 1, GREEN, 'I am Crust.', { trigger: TRIG.wave, fx: [P.SH(1, 'all')] }),
  },
  {
    id: 'rocketrucola',
    name: 'Rocket Rucola',
    goal: { kind: 'crusts', cost: 2500 },
    how: 'Buy for 2,500 Golden Crusts. He’ll take cash. He’ll take anything.',
    art: { suit: '#8a8f98', suit2: '#ff8a1c', pattern: 'fur', patternColor: '#5a5f68', mask: 'raccoon', maskColor: '#2a2a30', eyes: 'sly', ears: 'round', earColor: '#6a6f78', extras: ['snoutNose'], emblem: 'rocket', emblemColor: '#f4f1ea', emblemBg: '#ff8a1c', trail: '#ff9f1c', handle: '#ff8a1c' },
    ability: sig('Big Gun', 'bigGun', 1, ORANGE, `Signature (${S}): a ridiculous barrage of 10 rockets (×3 each, and they explode). Passive, Scavenger: +1 tip a kill.`),
  },
  {
    id: 'starlard',
    name: 'Star-Lard',
    goal: sighting('cassette'),
    how: 'Legendary outlaw: catch the cassette ship sighting 3 times.',
    art: { suit: '#8a3a22', mask: 'visorBug', maskColor: '#5a5f68', eyes: 'bugVisor', eyeColor: '#ff3a3a', extras: ['headphones'], emblem: 'cassette', emblemColor: '#ff9f1c', emblemBg: '#3a2a22', metal: true, trail: '#ff9f1c', handle: '#5a2a1a' },
    ability: sig('Awesome Mix', 'awesomeMix', 0.65, ORANGE, `Signature (${S}): the music switches to a retro tape for 12 s. Every foot dances on the spot (stunned; bosses half the time) while blasters fire on every beat (×1.5). Passive, Moonwalk: 10% of smacks land twice.`, stat({ doubleChance: 0.1 })),
  },
  {
    id: 'captainmarvellous',
    name: 'Captain Marvellous',
    goal: track('crocNoSlices'),
    how: 'Higher, further, faster: beat the Cosmic Croc without losing a slice.',
    art: { suit: '#c8102e', suit2: '#1f3a8a', skin: '#f2c8a6', mask: 'open', eyes: 'glow', eyeColor: '#ffe680', hair: '#f2d070', hairStyle: 'mohawk', emblem: 'sunburst', emblemColor: '#ffd23f', emblemBg: '#1f3a8a', glow: '#ffd23f', trail: '#ffd23f', handle: '#ffd23f' },
    ability: sig('Binary Mode', 'binaryMode', 0.85, GOLD, `Signature (${S}): glows gold for 15 s: +100% damage, and every smack sets off a photon blast around it. Passive, Cosmic: the meter fills 20% faster.`, stat({ superGain: 0.2 })),
  },
  {
    id: 'shazamozza',
    name: 'Shazamozza',
    goal: sighting('kid'),
    how: 'Say the magic word: catch the lightning kid sighting 3 times.',
    art: { suit: '#c8102e', cape: '#f4f1ea', capeTrim: '#ffd23f', skin: '#efc0a0', mask: 'open', eyes: 'friendly', hair: '#1d1410', hairStyle: 'short', emblem: 'sliceBolt', emblemColor: '#ffd23f', emblemBg: '#c8102e', extras: ['belt'], trail: '#ffd23f', handle: '#ffd23f' },
    ability: sig('SHAZAMOZZA!', 'shazamozza', 0.85, GOLD, `Signature (${S}): a shout and a lightning strike on the peel turn it into the grown-up hero for 15 s: ×2 damage at twice the size.`),
  },
  {
    id: 'cypork',
    name: 'Cy-Pork',
    goal: track('chainBoss'),
    how: 'Fully upgraded: beat a boss with 3 chain-lightning toppings.',
    art: { suit: '#f2a8a0', pattern: 'halfMetal', patternColor: '#9aa3ad', mask: 'none', eyes: 'cyber', eyeColor: '#ff2a2a', extras: ['snout'], emblem: 'circuit', emblemColor: '#ff3a3a', emblemBg: '#5a5f68', trail: '#ff3a3a', handle: '#5a5f68' },
    ability: sig('Boom Tube', 'boomTube', 1, CYAN, `Signature (${S}): opens a portal that swallows the 3 front feet whole: they’re gone, and you get their tips (a boss takes ×10 instead). Passive, Interface: every diving foot shows its stomp timer.`),
  },
  {
    id: 'robinpizza',
    name: 'Robin Pizza',
    goal: { kind: 'partner', peel: 'hero:batpeel', waves: 10 },
    how: 'Partner: own Batpeel, then clear 10 waves with it equipped.',
    art: { suit: '#c8202a', suit2: '#2f8a3a', cape: '#ffd23f', skin: '#efc0a0', mask: 'domino', maskColor: '#1a1418', eyes: 'white', hair: '#1a1418', hairStyle: 'short', emblem: 'sliceBadge', emblemColor: '#c8202a', emblemBg: '#ffd23f', trail: '#ffd23f', handle: '#2f8a3a' },
    ability: sig('Sidekick', 'sidekick', 0.9, GOLD, `Signature (${S}): a little partner peel follows yours for 20 s, copying every smack at half damage. Passive, Acrobat: +15% smack reach.`, stat({ radius: 4 })),
  },
  {
    id: 'cattoewoman',
    name: 'Cat-Toe-Woman',
    goal: { kind: 'track', key: 'tipsRun', need: 1 },
    how: 'The big score: earn 5,000 tips in one run.',
    art: { suit: '#1a1820', mask: 'cowl', maskColor: '#1a1820', skin: '#f2c8a6', eyes: 'sly', ears: 'cat', earColor: '#1a1820', extras: ['goggles', 'whiskers'], emblem: 'paw', emblemColor: '#c9a8ff', emblemBg: '#1a1820', metal: true, trail: '#c9a8ff', handle: '#1a1820' },
    ability: sig('Heist', 'heist', 0.9, PURPLE, `Signature (${S}): for 20 s every kill pays +3 tips, and golden feet turn up twice as often. Passive, Nine Lives: the first 9 slices you’d lose each run are saved (one each).`),
  },
  {
    id: 'martianmozzarella',
    name: 'Martian Mozzarella',
    goal: sighting('saucer'),
    how: 'Not from around here: catch the green saucer sighting 3 times.',
    art: { suit: '#3a9a4a', mask: 'none', eyes: 'martian', eyeColor: '#ff3a2a', extras: ['brow', 'collarGem'], cape: '#1f3a8a', emblem: 'gem', emblemColor: '#ff3a2a', emblemBg: '#3a9a4a', trail: '#7be04a', handle: '#1f3a8a' },
    ability: sig('Shape-Shift', 'shapeShift', 0.9, GREEN, `Signature (${S}): becomes another peel you own for 20 s and uses its ability (meter abilities fire straight away). Passive, Phasing: smacks pass through shields.`),
  },
  {
    id: 'greenpepperarrow',
    name: 'Green Pepper Arrow',
    goal: track('knockTop', 250),
    how: 'Out of here: knock 250 feet right back up to the top of the screen.',
    art: { suit: '#3a8a2a', mask: 'hood', maskColor: '#2f7a22', skin: '#efc0a0', eyes: 'squint', extras: ['goatee'], hair: '#c8a050', emblem: 'arrowUp', emblemColor: '#f4f1ea', emblemBg: '#2f7a22', trail: '#7be04a', handle: '#5a3a22' },
    ability: sig('Boxing-Glove Arrow', 'boxingArrow', 1.6, GREEN, `Signature (${S}, a quick meter): a boxing-glove arrow knocks the front foot right off the top of the screen. It doesn’t come back this wave (you get its tips). A boss takes ×8 instead.`),
  },
  {
    id: 'plasticpan',
    name: 'Plastic Pan',
    goal: track('edges', 20),
    how: 'Long reach: smack feet at both edges of the screen within 1 second, 20 times.',
    art: { shape: 'oval', suit: '#c8202a', suit2: '#ffd23f', mask: 'goggles', maskColor: '#1a1418', eyes: 'goggleDark', extras: ['stretchBands'], emblem: 'spring', emblemColor: '#1a1418', emblemBg: '#ffd23f', skin: '#efc0a0', trail: '#ffd23f', handle: '#c8202a' },
    ability: sig('Stretch', 'stretch', 0.9, GOLD, `Signature (${S}): for 10 s the peel stretches to reach any foot on screen: every smack hits the foot nearest your aim, wherever it is. Passive, Rubbery: +30% smack reach.`, stat({ radius: 8 })),
  },
  {
    id: 'hawkcrust',
    name: 'Hawkcrust',
    goal: { kind: 'value', read: () => (savedBosses().includes('pigeonking') ? 1 : 0), need: 1 },
    how: 'Ruler of the skies: beat the Pigeon King.',
    art: { suit: '#c8902a', mask: 'beakHelm', maskColor: '#e8b23a', skin: '#e0a880', eyes: 'stern', ears: 'wings', earColor: '#c8a070', emblem: 'feather', emblemColor: '#8a5a22', emblemBg: '#f2d070', metal: true, trail: '#ffd23f', handle: '#8a5a22' },
    ability: sig('Dive', 'dive', 1.2, GOLD, `Signature (${S}): the peel dives from the top of the screen down the busiest lane (×8 to everything in it).`),
  },
  {
    id: 'bluebeetroot',
    name: 'Blue Beetroot',
    goal: { kind: 'crusts', cost: 2000 },
    how: 'Buy for 2,000 Golden Crusts.',
    art: { suit: '#2a5ad8', pattern: 'plates', patternColor: '#1a1d3a', mask: 'full', maskColor: '#1a1d3a', eyes: 'bugGlossy', eyeColor: '#5fd8ff', emblem: 'scarab', emblemColor: '#9ff0ff', emblemBg: '#1a1d3a', metal: true, trail: '#5fd8ff', handle: '#1a1d3a' },
    ability: sig('Scarab Armour', 'scarab', 0.9, CYAN, `Signature (${S}): the scarab wraps the peel for 10 s of auto blasts (a ×1.5 bolt at a random foot every 0.5 s).`),
  },
  {
    id: 'boostergouda',
    name: 'Booster Gouda',
    goal: { kind: 'value', read: () => crustPeak(), need: 500 },
    how: 'Sponsored by the future: have 500 Golden Crusts banked at once.',
    art: { suit: '#2a4ab8', suit2: '#f2c230', mask: 'goggles', maskColor: '#f2c230', eyes: 'starVisor', eyeColor: '#2a4ab8', skin: '#f2c8a6', hair: '#f2d070', hairStyle: 'quiff', emblem: 'cheese', emblemColor: '#ffd23f', emblemBg: '#2a4ab8', metal: true, trail: '#ffd23f', handle: '#ffd23f' },
    ability: sig('Sponsored', 'sponsored', 1.1, GOLD, `Signature (${S}): spends 50 tips on a gold beam through every foot (×12; with fewer tips it’s weaker, never below ×4). Passive, From the Future: shows the next shop’s toppings as the wave starts.`),
  },
  {
    id: 'staticcling',
    name: 'Static Cling',
    goal: track('chainZaps', 500),
    how: 'Fully charged: zap 500 feet with chain lightning.',
    art: { suit: '#2a2d3a', suit2: '#2a5ad8', pattern: 'bolts', patternColor: '#ffd23f', mask: 'domino', maskColor: '#ffd23f', skin: '#8a5a3a', eyes: 'white', extras: ['cap'], emblem: 'plug', emblemColor: '#ffd23f', emblemBg: '#2a5ad8', trail: '#5fd8ff', handle: '#2a5ad8' },
    ability: sig('Overload', 'overload', 0.9, CYAN, `Signature (${S}): the peel crackles for 10 s; every smack arcs to 3 more feet (×1 each).`),
  },
  {
    id: 'zatannapanna',
    name: 'Zatanna Panna',
    goal: sighting('tophat'),
    how: 'And for my next trick: catch the top hat sighting 3 times.',
    art: { suit: '#1a1820', pattern: 'fishnet', patternColor: '#5a5868', skin: '#f2c8a6', mask: 'open', eyes: 'lashes', hair: '#1a1418', hairStyle: 'long', extras: ['topHat', 'bowtie'], emblem: 'wand', emblemColor: '#f4f1ea', emblemBg: '#1a1820', trail: '#e0c8ff', handle: '#1a1820' },
    ability: sig('!sdrawkcaB', 'backwards', 1, PURPLE, `Signature (${S}): everything runs backwards: every foot floats back up to the top and is stunned for 2 s.`),
  },
  {
    id: 'swampthincrust',
    name: 'Swamp Thin Crust',
    goal: track('beachUntouched'),
    how: 'Guardian of the green: clear a wave at Shack Attack Beach Bar without a foot ever touching a pizza.',
    art: { suit: '#4a7a2a', suit2: '#3a5a22', pattern: 'vines', patternColor: '#2a4a14', mask: 'none', eyes: 'glow', eyeColor: '#ff3a2a', ears: 'roots', earColor: '#3a5a22', extras: ['moss'], emblem: 'mushroom', emblemColor: '#e04a3a', emblemBg: '#3a5a22', trail: '#7be04a', handle: '#3a5a22' },
    ability: sig('Bog', 'bog', 0.9, GREEN, `Signature (${S}): the table turns to swamp for 10 s; feet sink into it (60% slower, ×1 a second). Passive, Regrowth: every pizza regrows 1 slice each wave.`, stat({ regenPerWave: 1 })),
  },
  {
    id: 'nightwings',
    name: 'Night Wings',
    goal: { kind: 'partner', peel: 'hero:robinpizza', waves: 10 },
    how: 'Partner: own Robin Pizza, then clear 10 waves with it equipped.',
    art: { suit: '#1a1a22', skin: '#efc0a0', mask: 'domino', maskColor: '#1a1a22', eyes: 'white', hair: '#1a1418', hairStyle: 'swept', emblem: 'sticks', emblemColor: '#3a8aff', emblemBg: '#1a1a22', trail: '#3a8aff', handle: '#1a1a22' },
    ability: sig('Escrima', 'escrima', 0.9, BLUE, `Signature (${S}): for 12 s every smack is a 3-hit combo (×0.7 a hit, with a little knockback).`),
  },
  {
    id: 'ghostroaster',
    name: 'Ghost Roaster',
    goal: track('fastBoss'),
    how: 'Ride fast: beat a boss in under 60 seconds.',
    art: { suit: '#2a2420', pattern: 'embers', patternColor: '#ff7a1a', mask: 'none', eyes: 'ember', eyeColor: '#ffb030', ears: 'flames', earColor: '#ff7a1a', extras: ['chain'], emblem: 'flame', emblemColor: '#ff9a2a', emblemBg: '#2a2420', glow: '#ff7a1a', trail: '#ff7a1a', handle: '#1a1410' },
    ability: sig('Penance Stare', 'penance', 1.1, ORANGE, `Signature (${S}): stares down the toughest foot. It takes ×10 for every slice it has ever stomped (×4 if it hasn’t, at most ×40). Passive, Hellfire Chain: every 6 s, a flaming chain whips 3 feet (×1.5 and a burn).`),
  },
  {
    id: 'moonknife',
    name: 'Moon Knife',
    goal: { kind: 'time', key: 'fullMoon', when: { moon: 'full' } },
    how: 'By the light of the moon: play a run during a real full moon (about a day either side of it).',
    art: { suit: '#e8e8ee', pattern: 'wraps', patternColor: '#b8b8c8', mask: 'hood', maskColor: '#f4f4f8', eyes: 'glow', eyeColor: '#d8f0ff', emblem: 'crescent', emblemColor: '#c9cfd8', emblemBg: '#3a3d4c', cape: '#e8e8ee', trail: '#d8f0ff', handle: '#3a3d4c' },
    ability: sig('Crescent Storm', 'crescentStorm', 1, WHITE, `Signature (${S}): 12 crescent darts fan out across the screen, through every foot in their way (×2 each). Passive, Moonlit: ×2 damage on night stages.`),
  },
  {
    id: 'shebulk',
    name: 'She-Bulk',
    goal: track('threeBossesNoLoss'),
    how: 'Case closed: beat 3 bosses in one run without losing a pizza.',
    art: { suit: '#5fb84a', suit2: '#f4f1ea', mask: 'none', eyes: 'sly', hair: '#1d1a14', hairStyle: 'long', extras: ['lawCollar'], emblem: 'gavel', emblemColor: '#8a5a32', emblemBg: '#6a3a9a', trail: '#7be04a', handle: '#6a3a9a' },
    ability: sig('Objection!', 'objection', 1, GREEN, `Signature (${S}): a gavel slams down: every foot freezes for 2 s and the toughest takes ×10. Passive: +3 smack damage.`, stat({ damage: 3 })),
  },
  {
    id: 'wasabiwasp',
    name: 'Wasabi Wasp',
    goal: track('killStreak'),
    how: 'Float and sting: defeat 20 feet in a row without missing a smack.',
    art: { suit: '#f2c230', pattern: 'stripes', patternColor: '#1a1418', mask: 'visorBand', maskColor: '#1a1418', eyes: 'visor', eyeColor: '#7be04a', ears: 'waspWings', earColor: '#d8f6ff', extras: ['antennaeSmall'], emblem: 'wasabiLeaf', emblemColor: '#7be04a', emblemBg: '#1a1418', trail: '#7be04a', handle: '#1a1418' },
    ability: sig('Sting Swarm', 'stingSwarm', 1.1, GREEN, `Signature (${S}): shrinks down and flits between 8 feet, stinging each (×2 and a short stun).`),
  },
  {
    id: 'gambeet',
    name: 'Gambeet',
    goal: track('gambles'),
    how: 'Feeling lucky: win 3 shop gambles in one run (a reroll that deals an epic or legendary topping).',
    art: { suit: '#7a2a4a', skin: '#efc0a0', mask: 'cowl', maskColor: '#c8407a', eyes: 'redOnBlack', hair: '#5a3a22', hairStyle: 'messy', extras: ['coatCollar'], emblem: 'spade', emblemColor: '#ff3d6e', emblemBg: '#1a1418', trail: '#ff3d6e', handle: '#5a3a22' },
    ability: sig('Ace High', 'aceHigh', 1, PINK, `Signature (${S}): throws the whole deck: 15 exploding cards (×1.5 each, and a blast). Passive, Gambler: shop rerolls cost 1 less.`),
  },
  {
    id: 'icecreamman',
    name: 'Ice Cream Man',
    goal: track('frozenAtOnce'),
    how: 'Cold as ice: have 8 feet frozen at once.',
    art: { suit: '#a8dcff', pattern: 'frost', patternColor: '#ffffff', mask: 'none', eyes: 'glow', eyeColor: '#ffffff', extras: ['softServe'], emblem: 'snowflake', emblemColor: '#ffffff', emblemBg: '#5a9ad0', glow: '#d8f6ff', metal: true, trail: '#d8f6ff', handle: '#5a9ad0' },
    ability: sig('Ice Slide', 'iceSlide', 0.85, CYAN, `Signature (${S}): ices the top lane for 10 s. Hovering feet slide about on it and can’t start their dives, and the ice nips them (×0.5 each slip).`),
  },
  {
    id: 'humanscorch',
    name: 'Human Scorch',
    goal: track('burningAtOnce'),
    how: 'Too hot to handle: have 6 feet burning at the same time.',
    art: { suit: '#ff6a1a', pattern: 'flames', patternColor: '#ffd23f', mask: 'none', eyes: 'glow', eyeColor: '#fff6c0', ears: 'flames', earColor: '#ffb030', emblem: 'flameRing', emblemColor: '#fff6c0', emblemBg: '#c8301a', glow: '#ff9a2a', trail: '#ff9a2a', handle: '#5a1a0a' },
    ability: sig('Flame On!', 'flameOn', 0.85, ORANGE, `Signature (${S}): a shout, and the peel ignites for 15 s. Every smack burns (2×/s) and leaves fire on the table that burns feet that come down there.`),
  },
  {
    id: 'mrelasticcheese',
    name: 'Mr Elastic Cheese',
    goal: { kind: 'crusts', cost: 3000 },
    how: 'Buy for 3,000 Golden Crusts.',
    art: { shape: 'oval', suit: '#2a4ab8', suit2: '#1a1d3a', skin: '#efc0a0', mask: 'open', eyes: 'stern', hair: '#3a2a22', hairStyle: 'temples', emblem: 'cheeseString', emblemColor: '#ffd23f', emblemBg: '#1a1d3a', extras: ['stretchBands'], trail: '#5fa8ff', handle: '#1a1d3a' },
    ability: sig('Stretch Smack', 'stretchSmack', 0.9, BLUE, `Signature (${S}): stretches right across the table and smacks every foot twice (×5 each).`),
  },
  {
    id: 'squirrelgourmet',
    name: 'Squirrel Gourmet',
    goal: sighting('squirrels'),
    how: 'Nuts about pizza: catch the squirrel parade sighting 3 times.',
    art: { suit: '#a8642a', suit2: '#f2dcb0', mask: 'none', eyes: 'happy', ears: 'squirrel', earColor: '#a8642a', extras: ['buckTeeth', 'tail', 'chefHat'], emblem: 'acorn', emblemColor: '#8a5a22', emblemBg: '#f2dcb0', trail: '#d88a3a', handle: '#6a3a1a' },
    ability: sig('Nut Parade', 'nutParade', 1, BROWN, `Signature (${S}): 20 squirrels scamper across the table, each nibbling a foot (×1 each). Passive, Unbeatable: +1% damage for every boss you’ve ever beaten (up to +20%).`),
  },
];

// save data reads for the 'value' goals
function bestWave(): number {
  return save.bestWave;
}
function savedBosses(): string[] {
  return save.bossesBeaten;
}
function crustPeak(): number {
  return Math.max(save.crusts, save.goals.crustPeak ?? 0);
}

export const peels: HeroPeel[] = ROWS.map((r) => ({
  id: `hero:${r.id}`,
  name: r.name,
  sub: 'heroes',
  goal: r.goal,
  how: r.how,
  look: heroLook(`hero:${r.id}`, r.art),
  ability: r.ability,
}));
