// Peel smack sounds: every peel's smack sounds like what it's made of.
//
// ~30 material families (sfx_smack_<family>_1..3 and _heavy, made by scripts/smack-sfx/), each peel mapped to one
// automatically from its data (its look's pattern, colours and metal; the foot, pizza or event it comes from), with a
// hand-written table for the heroes, the gods and a few notable peels. A peel can add a quieter second family under
// its own (a steel toe, gold studs) and a signature tail (sfx_smack_tail_*: Thor's thunder, the clown's honk, the
// Golden Crust coin); hero and god peels each have their own tail (sfx_smack_hero_<id>).
//
// The cursor's look decides the sound: a worn look plays its own peel's smack, not the equipped peel's.
// The Classic Peel keeps the original slap. Files load lazily: only the families the current look needs.

import Phaser from 'phaser';
import { FOOT_BY_ID, type FootType } from '../data/feet';
import { PIZZAS, type PizzaType } from '../data/pizzas';
import { audio, type SmackProfile } from '../systems/audio';
import { hashStr } from '../art/util';
import { lookPeel, PEEL_BY_ID, PEELS, type PeelDef } from './peels';
import type { PeelLook, PeelPattern } from '../art/peelArt';

export const FAMILIES = [
  'wood', 'metal', 'rubber', 'glass', 'stone', 'ceramic', 'fabric', 'leather', 'fur', 'dough', 'crispy', 'sauce', 'slime', 'gold', 'crystal', 'ice',
  'snow', 'fire', 'electric', 'tech', 'magic', 'cosmic', 'ghost', 'water', 'bubble', 'bone', 'scales', 'plastic', 'cardboard', 'sand', 'skin',
] as const;
export type Family = (typeof FAMILIES)[number] | 'classic';

/** Signature tails (sfx_smack_tail_<name>): the least time between two on ordinary smacks (ms), and their volume. */
const TAILS: Record<string, { gap: number; vol?: number }> = {
  thunder: { gap: 700 },
  honk: { gap: 260 },
  kinghonk: { gap: 320 },
  coin: { gap: 320, vol: 0.9 },
  glint: { gap: 420, vol: 0.85 },
  ultra: { gap: 520 },
  crown: { gap: 520 },
  trophy: { gap: 600 },
  pop: { gap: 220 },
  chomp: { gap: 300 },
  squawk: { gap: 900 },
  jukebox: { gap: 520 },
  mirror: { gap: 420 },
  bell: { gap: 420 },
  boing: { gap: 240 },
  pizzagods: { gap: 300 },
};
/** Hero and god tails ring on every smack (a short gap so a fast flurry doesn't stack them). */
const HERO_TAIL = { gap: 200, vol: 1 };
/** The long hero tails (thunder and rumbles) wait longer before ringing again. */
const HERO_TAIL_GAP: Record<string, number> = { thor: 650, thorunleashed: 800, zeusunbound: 650, zeus: 450, stormyweather: 550, odinascended: 500, heimdall: 450 };

interface Spec {
  family: Family;
  /** A second family mixed in under the first (0..1 volume). */
  layer?: Family;
  layerVol?: number;
  tail?: string;
  /** Pitch: 1 is the family's own. */
  rate?: number;
}

/** Heroes and gods by hand (their tails are sfx_smack_hero_<id>, found automatically). Variants share their base's family. */
const HEROES: Record<string, Family | [Family, Family]> = {
  superpeel: ['metal', 'cosmic'], batpeel: ['leather', 'tech'], wonderwedge: ['gold', 'leather'], flashfoot: 'electric', aquatoe: 'water',
  greenlampshade: ['magic', 'glass'], spiderpan: ['rubber', 'fabric'], ironpan: ['metal', 'tech'], captainpizzeria: 'metal', incrediblebulk: 'skin',
  blackwindow: ['leather', 'electric'], hawkeyetalian: ['wood', 'leather'], wolverpeel: ['metal', 'fur'], stormyweather: 'electric', cyclopizza: ['fire', 'glass'],
  blackpanther: ['fur', 'tech'], strangeloaf: 'magic', scarletpitch: ['magic', 'ghost'], antpan: ['tech', 'plastic'], daredough: ['leather', 'wood'],
  deadpeel: ['leather', 'metal'], silverslicer: ['metal', 'cosmic'], iamcrust: ['wood', 'dough'], rocketrucola: ['tech', 'fur'], starlard: ['leather', 'cosmic'],
  captainmarvellous: ['cosmic', 'fire'], shazamozza: ['electric', 'gold'], cypork: ['tech', 'metal'], robinpizza: ['fabric', 'leather'], cattoewoman: ['leather', 'fur'],
  martianmozzarella: ['slime', 'cosmic'], greenpepperarrow: ['wood', 'rubber'], plasticpan: 'rubber', hawkcrust: ['metal', 'fur'], bluebeetroot: ['tech', 'scales'],
  boostergouda: ['plastic', 'gold'], staticcling: ['electric', 'fabric'], zatannapanna: ['magic', 'fabric'], swampthincrust: ['slime', 'wood'], nightwings: ['wood', 'leather'],
  ghostroaster: ['fire', 'bone'], moonknife: ['metal', 'ghost'], shebulk: 'skin', wasabiwasp: ['electric', 'plastic'], gambeet: ['cardboard', 'magic'],
  icecreamman: ['ice', 'snow'], humanscorch: 'fire', mrelasticcheese: ['rubber', 'dough'], squirrelgourmet: ['fur', 'wood'],
  // gods: Greek marble and gold, Norse wood and iron, each with its own element
  zeus: ['stone', 'electric'], kratos: ['metal', 'fire'], hera: ['stone', 'gold'], poseidon: ['stone', 'water'], demeter: ['stone', 'wood'], athena: ['stone', 'metal'],
  apollo: ['gold', 'fire'], artemis: ['stone', 'ice'], ares: ['metal', 'fire'], aphrodite: ['stone', 'crystal'], hephaestus: ['metal', 'fire'], hermes: ['stone', 'fabric'],
  dionysus: ['stone', 'sauce'], hestia: ['stone', 'fire'], hades: ['bone', 'fire'], persephone: ['stone', 'wood'], nike: ['gold', 'fabric'], nyx: ['cosmic', 'ghost'],
  odin: ['wood', 'magic'], thor: ['metal', 'electric'], loki: ['magic', 'slime'], frigg: ['wood', 'fabric'], freya: ['wood', 'gold'], freyr: ['gold', 'fur'],
  tyr: ['metal', 'wood'], heimdall: ['gold', 'metal'], baldur: ['gold', 'magic'], hel: ['bone', 'ghost'], njord: ['wood', 'water'], skadi: ['ice', 'wood'],
  idun: ['wood', 'crystal'], bragi: ['wood', 'magic'],
  leonidas: ['metal', 'leather'], hotgates: ['metal', 'fire'], darkkneader: ['leather', 'dough'],
};

/** Notable peels, by id (beats the automatic mapping). */
const NOTABLE: Record<string, Spec> = {
  'foot:clown': { family: 'rubber', tail: 'honk' },
  'shiny:clown': { family: 'rubber', tail: 'honk' },
  'boss:clownking': { family: 'rubber', layer: 'fabric', tail: 'kinghonk', rate: 0.94 },
  'foot:echoclown': { family: 'metal', layer: 'rubber', tail: 'honk' },
  'shiny:echoclown': { family: 'metal', layer: 'rubber', tail: 'honk' },
  'foot:pogo': { family: 'rubber', tail: 'boing' },
  'shiny:pogo': { family: 'rubber', tail: 'boing' },
  'place:gotham': { family: 'stone', layer: 'water' },
  'place:hotgates': { family: 'stone', layer: 'metal' },
  'place:oven': { family: 'fire', layer: 'cosmic' },
  'ultra:opal': { family: 'crystal', layer: 'fire', tail: 'ultra' },
  'ultra:platinum': { family: 'metal', layer: 'tech', tail: 'ultra' },
  'foot:jukebox': { family: 'plastic', layer: 'metal', tail: 'jukebox' },
  'shiny:jukebox': { family: 'plastic', layer: 'metal', tail: 'jukebox' },
  'boss:mirrorpeel': { family: 'glass', tail: 'mirror' },
  'event:balloon': { family: 'rubber', tail: 'pop' },
  'shinyev:balloon': { family: 'rubber', tail: 'pop' },
  'event:mimic': { family: 'wood', layer: 'slime', tail: 'chomp' },
  'shinyev:mimic': { family: 'wood', layer: 'slime', tail: 'chomp' },
  'event:chest': { family: 'wood', layer: 'gold', tail: 'coin' },
  'shinyev:chest': { family: 'wood', layer: 'gold', tail: 'coin' },
  'event:seagull': { family: 'fur', layer: 'gold', tail: 'squawk' },
  'shinyev:seagull': { family: 'fur', layer: 'gold', tail: 'squawk' },
  'event:moth': { family: 'fur', layer: 'fabric' },
  'event:charybdis': { family: 'water', layer: 'stone' },
  'place:trattoria': { family: 'ceramic', layer: 'fabric' },
  'place:rooftop': { family: 'ceramic', layer: 'stone' },
  'place:beach': { family: 'sand', layer: 'water' },
  'place:diner': { family: 'plastic', layer: 'metal', tail: 'jukebox' },
  'place:lodge': { family: 'wood', layer: 'snow' },
  'place:kitchen': { family: 'metal', layer: 'ceramic' },
  'place:oldtown': { family: 'stone' },
  'place:pier': { family: 'wood', layer: 'water' },
  'place:rink': { family: 'ice', layer: 'plastic' },
  'place:slopes': { family: 'snow', layer: 'ice' },
  'place:cellar': { family: 'stone', layer: 'glass' },
  'place:metropizza': { family: 'metal', layer: 'glass' },
  'place:jotunheim': { family: 'ice', layer: 'stone' },
  'place:bifrost': { family: 'crystal', layer: 'cosmic' },
  'place:labyrinth': { family: 'stone' },
  'place:firstpizzeria': { family: 'stone', layer: 'fire', tail: 'bell' },
};
// Golden Crust peels (bought in the locker) and their mastered versions ring a coin
const GOLDEN_BASE: Record<string, Spec> = {
  marble: { family: 'stone', rate: 1.05 },
  copper: { family: 'metal', rate: 0.9 },
  neon: { family: 'electric', layer: 'glass', layerVol: 0.3 },
  obsidian: { family: 'glass', layer: 'stone', rate: 0.88 },
  silver: { family: 'metal', rate: 1.12 },
  gold: { family: 'gold' },
  ruby: { family: 'crystal', layer: 'gold', rate: 0.96 },
  sapphire: { family: 'crystal', layer: 'water', rate: 1.02 },
  emerald: { family: 'crystal', layer: 'gold', rate: 0.92 },
  amethyst: { family: 'crystal', layer: 'magic', rate: 1.06 },
  pearl: { family: 'ceramic', layer: 'bubble', rate: 1.08 },
  diamond: { family: 'crystal', layer: 'glass', rate: 1.14 },
};

const PATTERN: Partial<Record<PeelPattern, Family>> = {
  grain: 'wood', marble: 'stone', checker: 'fabric', facets: 'crystal', gems: 'crystal', circuit: 'tech', stars: 'cosmic', snow: 'snow',
  waves: 'water', bubbles: 'bubble', flames: 'fire', bolts: 'electric', scales: 'scales', fur: 'fur', drips: 'slime', spots: 'rubber', stripes: 'fabric',
};

/** Foot kinds and what their peel smacks like. */
const KIND: Record<string, Family> = {
  bare: 'skin', sock: 'fabric', toesock: 'fabric', sneaker: 'rubber', boot: 'leather', clown: 'rubber', ballet: 'fabric', skate: 'ice', flipper: 'rubber',
  robot: 'tech', flipflop: 'plastic', cowboy: 'leather', bigfoot: 'fur', heel: 'plastic', slipper: 'fabric', roller: 'plastic', sandal: 'leather', clog: 'wood',
  wellie: 'rubber', moonboot: 'cosmic', knight: 'metal', elf: 'magic', peg: 'wood', dino: 'scales', alien: 'slime', mummy: 'fabric', cast: 'stone',
  dadsandal: 'leather', tap: 'metal', platform: 'plastic', cleat: 'rubber', webbed: 'water',
};
const LEG: Partial<Record<string, Family>> = { fur: 'fur', scales: 'scales', armor: 'metal', chrome: 'metal', iron: 'metal', wood: 'wood', bandage: 'fabric', cast: 'stone', robot: 'tech' };

/** Words in a foot's id or name (Feetza 2.0 kinds are free-form), strongest first. */
const WORDS: [RegExp, Family][] = [
  [/ghost|phantom|spirit|spectr|wraith|poltergeist/, 'ghost'],
  [/lava|magma|fire|flame|ember|surtr|scorch|inferno|blaze|torch|phoenix/, 'fire'],
  [/\bice\b|frost|frozen|glacier|thrym|yeti|skate(?!board)|cryo|winter/, 'ice'],
  [/snow|\bski\b|sled/, 'snow'],
  [/jelly|slime|\bgoo\b|ooze|swamp|\bbog\b|sludge|venom|symbiote/, 'slime'],
  [/bone|skelet|skull|draugr|zombie|undead|lich\b/, 'bone'],
  [/stone|\brock\b|troll|gargoyle|golem|statue|medusa|marble|colossus|cyclops|minotaur/, 'stone'],
  [/robot|drone|mech|cyber|ultoe|android|droid|tech|laser|\bufo\b/, 'tech'],
  [/storm|thunder|\bzap|electr|static|bolt|lightning|zeus/, 'electric'],
  [/mirror|glass/, 'glass'],
  [/crystal|\bgem|diamond|jewel|prism/, 'crystal'],
  [/gold|coin|cash|\blex|midas|crusty/, 'gold'],
  [/kraken|squid|\bocto|fish|shark|\bsea\b|aqua|surf|charybdis|jorm|\bwave|\btide|siren/, 'water'],
  [/\bsand\b|\bsandy|desert|\bdune/, 'sand'],
  [/cosmic|space|\bstar|galax|\bmoon|astro|thanfoot/, 'cosmic'],
  [/magic|wizard|witch|fairy|\belf\b|\bhex|curse/, 'magic'],
  [/dough|bread|bagel|pizza|cheese|loaf|pretzel|waffle|pancake|nonna/, 'dough'],
  [/sauce|ketchup|milkshake|soup/, 'sauce'],
  [/balloon|bubble/, 'bubble'],
  [/box|card|paper/, 'cardboard'],
  [/iron|steel|armou?r|knight|hoplite|spartan|immortal|chrome|bronze|shield|sword|helm|chain/, 'metal'],
  [/wolf|\bbear|bigfoot|\bcat\b|fenrir|\bfur|wool|sheep|pigeon|bird|\bmoth|\blion|monkey|\bape\b/, 'fur'],
  [/\bcroc|dino|\brex\b|snake|serpent|lizard|scale|dragon|gator/, 'scales'],
  [/wood|lumber|\blog\b|clog|\bpeg\b|\btree|chimney|broom|sweep/, 'wood'],
  [/leather|cowboy|boot|biker|riot/, 'leather'],
  [/sock|slipper|knit|tights|ballet|sweat/, 'fabric'],
  [/rubber|duck|wellie|flipper|sneaker|trainer|clown/, 'rubber'],
  [/plastic|toy|lego|doll|jukebox|platform|croc/, 'plastic'],
];

/** Feet whose free-form kind and name don't say enough, by hand: [family, layer?]. */
const FOOT_HAND: Record<string, [Family, Family?]> = {
  boot: ['leather', 'metal'], henchman: ['leather'], goon: ['rubber'], waiter: ['leather', 'ceramic'], garlicgary: ['dough'], espresso: ['ceramic'],
  saucysal: ['sauce'], antenna: ['tech'], parkour: ['rubber'], seaweed: ['slime', 'water'], coconut: ['wood'], frycook: ['sauce', 'metal'],
  hottub: ['water', 'bubble'], gravity: ['cosmic'], alienal: ['slime', 'cosmic'], comet: ['cosmic', 'fire'], thief: ['fabric'], fruitfly: ['sauce', 'fur'],
  rainy: ['water', 'rubber'], crabby: ['bone', 'water'], lifeguard: ['rubber', 'water'], graffiti: ['metal', 'plastic'], bowling: ['wood', 'leather'],
  mime: ['fabric'], neon: ['electric', 'glass'], skier: ['snow', 'plastic'], skateboard: ['wood', 'plastic'], batfeet: ['leather'],
  titantoes: ['stone', 'skin'], kronos: ['stone', 'gold'], atlas: ['stone', 'skin'], elephant: ['skin', 'leather'], spartan: ['leather', 'metal'],
  soleprop: ['leather', 'gold'], soleunbound: ['leather', 'fire'], rinkqueen: ['ice', 'plastic'], headwaiter: ['leather', 'ceramic'], shortorder: ['wood', 'metal'],
  sandcastle: ['sand', 'water'], redsole: ['leather'], jokester: ['rubber', 'fabric'], titanking: ['stone', 'gold'], hades: ['fire', 'bone'], xerxes: ['gold', 'metal'], gymbro: ['skin', 'metal'],
};

function isGold(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r > 180 && g > 140 && b < 120 && r - b > 110 && g > r * 0.62;
}

function footSpec(f: FootType): Spec {
  const a = f.art;
  const rate = f.boss ? 0.9 : f.mini ? 0.95 : f.scale > 1.15 ? 0.94 : f.scale < 0.85 ? 1.07 : 1;
  const hand = FOOT_HAND[f.id];
  if (hand) return { family: hand[0], layer: hand[1], rate };
  const words = `${f.id} ${f.name}`.toLowerCase();
  let family: Family | undefined;
  if (a.ghost) family = 'ghost';
  else if (a.lava) family = 'fire';
  else if (a.gold) family = 'gold';
  else if (a.frost) family = 'ice';
  else if (a.zombie) family = 'bone';
  family ??= WORDS.find(([re]) => re.test(words))?.[1];
  family ??= KIND[a.kind] ?? LEG[a.leg] ?? (a.hair ? 'fur' : 'skin');
  // a second, quieter material: the leg's (armour, fur), a steel toe, or the foot's own skin under a sock
  let layer: Family | undefined = LEG[a.leg];
  if (a.steelToe) layer = 'metal';
  if (!layer && a.hair) layer = 'fur';
  if (!layer && family !== 'skin' && (a.kind === 'bare' || a.leg === 'skin')) layer = 'skin';
  if (layer === family) layer = undefined;
  return { family, layer, rate };
}

function plainSpec(look: PeelLook): Spec {
  let family: Family = PATTERN[look.pattern] ?? (look.metal ? 'metal' : 'wood');
  if (look.metal && isGold(look.head[1])) family = family === 'crystal' ? 'crystal' : 'gold';
  else if (look.metal && family === 'fabric') family = 'metal';
  let layer: Family | undefined;
  if (look.metal && family !== 'metal' && family !== 'gold') layer = isGold(look.head[1]) || isGold(look.handle[0]) ? 'gold' : 'metal';
  if (look.gem && family !== 'crystal') layer = 'crystal';
  return { family, layer };
}

const THIN = /romana|taglio|nyslice|lahmacun|flambee|bianca|whitepie|marinara|napoletana|napolidoc|pugliese|fritta/;
function pizzaSpec(p: PizzaType): Spec {
  const t = p.toppings;
  let family: Family = p.shape === 'square' ? 'crispy' : p.shape === 'deep' || p.shape === 'calzone' ? 'dough' : THIN.test(p.id) ? 'crispy' : p.cheese >= 1 ? 'sauce' : 'dough';
  let layer: Family | undefined;
  if (p.base === 'moon') layer = 'cosmic';
  else if (p.base === 'ink') layer = 'slime';
  else if (p.base === 'pink' || t.includes('sprinkles')) layer = 'magic';
  else if (t.includes('goldLeaf') || p.base === 'saffron') layer = 'gold';
  else if (t.some((x) => x === 'chili' || x === 'jalapeno' || x === 'hotSauce')) layer = 'fire';
  else if (t.some((x) => x === 'shrimp' || x === 'mussel' || x === 'squid' || /fish|tuna|salmon|lobster|anchov|caviar|prawn|crab|clam/i.test(x))) layer = 'water';
  else if (t.includes('marshmallow')) layer = 'bubble';
  // the name has the last word: volcanoes burn, ghosts haunt
  const name = `${p.id} ${p.name}`.toLowerCase();
  if (/inferno|volcano|diavola|nduja|\bhot\b|cajun|jerk|buffalo|dragon|ragnarok/.test(name)) layer = 'fire';
  else if (/haunt|fantasma|ghost/.test(name) || p.finish?.ghost) layer = 'ghost';
  else if (/meteor|moon|cosmic/.test(name)) layer = 'cosmic';
  else if (/pirate|rustic|wood/.test(name)) layer = 'wood';
  else if (/gold|royal|anniversary|champagne|caviar/.test(name)) layer = 'gold';
  else if (p.finish?.sparkle && !layer) layer = 'magic';
  if (p.id === 'golden') family = 'gold';
  return { family, layer, rate: p.shape === 'deep' ? 0.9 : 1, tail: p.id === 'golden' ? 'coin' : undefined };
}

function heroSpec(id: string, d: PeelDef): Spec {
  const short = id.slice(5);
  // variants: Endgame and the named ones sit beside their base, and share its materials
  const baseId = Object.keys(HEROES).find((k) => short === `${k}endgame`) ?? VARIANT_BASE[short] ?? short;
  const fam = HEROES[baseId] ?? (d.pantheon === 'greek' ? 'stone' : d.pantheon === 'norse' ? 'wood' : 'leather');
  const [family, layer] = Array.isArray(fam) ? fam : [fam, undefined];
  return { family, layer, tail: `hero_${short}` };
}
const VARIANT_BASE: Record<string, string> = {
  ghostofsparta: 'kratos', superpeelprime: 'superpeel', ironpaninfinity: 'ironpan', thorunleashed: 'thor', odinascended: 'odin', zeusunbound: 'zeus',
  shieldofliberty: 'captainpizzeria', symbiotepan: 'spiderpan', amazonqueen: 'wonderwedge',
};

/** What a peel's smack is made of (before files are resolved). */
export function smackSpec(d: PeelDef): Spec {
  if (d.id === 'classic') return { family: 'classic' };
  const n = NOTABLE[d.id];
  if (n) return n;
  let s: Spec;
  switch (d.group) {
    case 'golden':
    case 'jewel':
      s = { ...GOLDEN_BASE[d.id], tail: 'coin' };
      break;
    case 'master': {
      const base = d.id.slice(7);
      // the Mastered Classic keeps the slap, with a gold crown on top
      s = base === 'classic' ? { family: 'classic', layer: 'gold', layerVol: 0.3 } : { ...GOLDEN_BASE[base], layer: 'gold', layerVol: 0.35 };
      s.tail = 'crown';
      break;
    }
    case 'foot':
    case 'boss':
    case 'shinyFoot':
    case 'zombieFoot': {
      const f = d.foot ? FOOT_BY_ID[d.foot] : undefined;
      s = f ? footSpec(f) : { family: 'skin' };
      break;
    }
    case 'pizza': {
      const p = PIZZAS.find((x) => `pizza:${x.id}` === d.id);
      s = p ? pizzaSpec(p) : { family: 'dough' };
      break;
    }
    case 'hero':
      s = heroSpec(d.id, d);
      break;
    case 'god':
      s = { family: 'gold', layer: 'magic', layerVol: 0.45, tail: 'pizzagods', rate: 0.96 };
      break;
    case 'act':
      s = { ...plainSpec(d.look()), tail: 'trophy' };
      break;
    case 'shinyEvent': {
      const base = d.drop ? NOTABLE[`event:${d.drop.event}`] : undefined;
      s = d.ultra ? { ...plainSpec(d.look()), tail: 'ultra' } : { ...(base ?? plainSpec(d.look())) };
      break;
    }
    default:
      s = plainSpec(d.look());
  }
  // shinies get a little glint after the smack (unless they have a signature of their own)
  if (d.shiny && !s.tail) s.tail = 'glint';
  return s;
}

const famKeys = (f: Family): string[] => (f === 'classic' ? ['sfx_slap_1', 'sfx_slap_2', 'sfx_slap_3'] : [1, 2, 3].map((i) => `sfx_smack_${f}_${i}`));
const famHeavy = (f: Family): string => (f === 'classic' ? 'sfx_crit' : `sfx_smack_${f}_heavy`);

const cache = new Map<string, SmackProfile | null>();

/** A peel's smack, resolved to files (null: the classic slap). Cached per peel. */
export function smackProfile(id: string): SmackProfile | null {
  let p = cache.get(id);
  if (p !== undefined) return p;
  const d = PEEL_BY_ID[id];
  p = null;
  if (d && d.id !== 'classic') {
    const s = smackSpec(d);
    const h = hashStr(d.id);
    // every peel its own: a small pitch offset from its id, and the layer's level
    const rate = (s.rate ?? 1) * (0.95 + ((h % 1000) / 1000) * 0.1);
    const tailKey = s.tail ? (s.tail.startsWith('hero_') ? `sfx_smack_${s.tail}` : `sfx_smack_tail_${s.tail}`) : null;
    const hero = s.tail?.startsWith('hero_') ? s.tail.slice(5) : null;
    const tailInfo = s.tail ? (hero ? { ...HERO_TAIL, gap: HERO_TAIL_GAP[hero] ?? HERO_TAIL.gap } : TAILS[s.tail]) : undefined;
    const tail = tailKey && tailInfo && audio.has(tailKey) ? { key: tailKey, gap: tailInfo.gap, vol: tailInfo.vol ?? 1 } : null;
    const layer = s.layer && s.layer !== s.family ? { takes: famKeys(s.layer), heavy: famHeavy(s.layer), vol: s.layerVol ?? 0.32 + ((h >>> 10) % 100) / 100 * 0.16 } : null;
    const takes = famKeys(s.family);
    p = {
      id: d.id,
      family: s.family,
      layerFamily: s.layer && s.layer !== s.family ? s.layer : null,
      takes,
      heavy: famHeavy(s.family),
      rate,
      layer,
      tail,
      keys: [...takes, famHeavy(s.family), ...(layer ? [...layer.takes, layer.heavy] : []), ...(tail ? [tail.key] : [])],
    };
  }
  cache.set(id, p);
  return p;
}

// ——— which peel is smacking ———

/** The look on the cursor in a run (Peel Roulette and resumed runs can differ from the save); null outside a run. */
let runLook: string | null = null;

/** The game scene's cursor look changed: its smack follows (and its files start loading). */
export function setRunSmack(scene: Phaser.Scene | null, id: string | null): void {
  runLook = id;
  if (scene && id) preloadSmack(scene, id);
}

/** Warm the cache for a peel's smack. */
export function preloadSmack(scene: Phaser.Scene, id: string): void {
  const p = smackProfile(id);
  if (p) audio.preload(scene, p.keys);
}

/** Locker: hear a peel's smack (loads it first if needed). Alternate presses play the heavy (crit) version. */
let previewHeavy = false;
export async function previewSmack(id: string): Promise<void> {
  const p = smackProfile(id);
  const scene = audio.anyScene();
  if (p && scene) await Promise.all(p.keys.map((k) => audio.ensure(scene, k)));
  audio.smackWith(p, 0.8, previewHeavy, true);
  previewHeavy = !previewHeavy;
}

audio.smackSource = () => runLook ?? lookPeel().id;
audio.smackResolve = smackProfile;

/** Dev: every peel's family, layer and tail, and the counts per family. */
export function smackReport(): { counts: Record<string, number>; tails: Record<string, number>; peels: [string, string, string, string, string][] } {
  const counts: Record<string, number> = {};
  const tails: Record<string, number> = {};
  const peels: [string, string, string, string, string][] = [];
  for (const d of PEELS) {
    const s = smackSpec(d);
    counts[s.family] = (counts[s.family] ?? 0) + 1;
    if (s.tail) tails[s.tail.startsWith('hero_') ? 'hero (bespoke)' : s.tail] = (tails[s.tail.startsWith('hero_') ? 'hero (bespoke)' : s.tail] ?? 0) + 1;
    peels.push([d.id, d.group, s.family, s.layer ?? '', s.tail ?? '']);
  }
  return { counts, tails, peels };
}
