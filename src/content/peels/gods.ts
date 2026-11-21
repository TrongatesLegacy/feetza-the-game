// The god peels: 17 Greek gods plus the Kratos Peel (the GREEK GODS section), and 14 Norse gods with Thor (the
// NORSE GODS section). Each row: its name, how it unlocks (a HeroGoal, see src/game/heroGoals.ts), its head
// (src/art/godHeads.ts) and its ability. Signature moves and passives are built by hand in src/game/godMoves.ts,
// keyed by `move` and the peel id. Myth figures are public domain, so they keep their names; the looks are ours.

import { P, type Ability, type Effect } from '../../game/abilities';
import type { HeroGoal } from '../../game/heroGoals';
import { godLook, kratosLook, type GodArt, type GreekSymbol, type NorseSymbol } from '../../art/godHeads';
import type { PeelLook } from '../../art/peelArt';
import type { HeroPeel, HeroSub } from '../heroPeels';
import { save } from '../../systems/save';
import { FEET } from '../../data/feet';

const S = '{slam}';
const active = { t: 'active' } as const;

function sig(name: string, move: string, charge: number, color: number, desc: string, also?: Ability['also']): Ability {
  return { name, trigger: active, fx: [{ e: 'move', id: move }], charge, color, vfx: 'burst', custom: true, desc, also };
}
const stat = (mods: Extract<Effect, { e: 'stat' }>['mods']): Ability['also'] => ({ trigger: { t: 'always' }, fx: [P.STAT(mods)] });
const track = (key: string, need = 1, when?: Extract<HeroGoal, { kind: 'track' }>['when']): HeroGoal => ({ kind: 'track', key, need, when });

interface Row {
  id: string;
  name: string;
  sub: Extract<HeroSub, 'greek' | 'norse'>;
  goal: HeroGoal;
  how: string;
  look: () => PeelLook;
  ability: Ability;
}

const greek = (id: string, symbol: GreekSymbol, color: string, extra: Partial<GodArt> = {}) => godLook(`hero:${id}`, { pantheon: 'greek', symbol, color, ...extra });
const norse = (id: string, symbol: NorseSymbol, color: string, extra: Partial<GodArt> = {}) => godLook(`hero:${id}`, { pantheon: 'norse', symbol, color, ...extra });
const hex = (c: string) => parseInt(c.slice(1), 16);

/** How many of these peels you own (Zeus and Odin need the rest of their pantheon). */
const owned = (ids: string[]) => ids.filter((id) => save.peels.includes(`hero:${id}`)).length;
const GREEK = ['kratos', 'hera', 'poseidon', 'demeter', 'athena', 'apollo', 'artemis', 'ares', 'aphrodite', 'hephaestus', 'hermes', 'dionysus', 'hestia', 'hades', 'persephone', 'nike', 'nyx'];
const NORSE = ['thor', 'loki', 'frigg', 'freya', 'freyr', 'tyr', 'heimdall', 'baldur', 'hel', 'njord', 'skadi', 'idun', 'bragi'];

const C = {
  zeus: '#9fd8ff', hera: '#5fd0c0', poseidon: '#3ab0e0', demeter: '#e8c040', athena: '#8aa8ff', apollo: '#ffb020',
  artemis: '#d8e4f0', ares: '#e0402a', aphrodite: '#ff7ab8', hephaestus: '#ff8a2a', hermes: '#7be0a0', dionysus: '#9a4ad0',
  hestia: '#ff9a3a', hades: '#7a5aff', persephone: '#ff5a7a', nike: '#ffd23f', nyx: '#a08aff',
  odin: '#7ab8ff', thor: '#9fd8ff', loki: '#7be04a', frigg: '#c8b0ff', freya: '#ffb0d8', freyr: '#ffd23f', tyr: '#ff6a4a',
  heimdall: '#ffe680', baldur: '#fff2a0', hel: '#a8f0d8', njord: '#5fd8ff', skadi: '#d8f6ff', idun: '#ffd23f', bragi: '#ffb070',
};

const ROWS: Row[] = [
  // ——— GREEK GODS ———
  {
    id: 'zeus', name: 'Zeus', sub: 'greek',
    goal: { kind: 'value', read: () => owned(GREEK), need: GREEK.length },
    how: 'King of Olympus: unlock every other Greek god peel (all 17, the Kratos Peel included).',
    look: greek('zeus', 'bolt', C.zeus),
    ability: sig('Wrath of Olympus', 'wrathOlympus', 0.8, hex(C.zeus), `Signature (${S}): the sky splits, and for 3 s thunderbolts rain on every foot (×6 each, chaining to 2 more for ×2) while the screen flashes white with each strike. Passive, King of the Gods: wear Zeus’s look over any other god peel and its numbers go up 10%.`),
  },
  {
    id: 'kratos', name: 'Kratos Peel', sub: 'greek',
    // any of the Persian army counts (the elephants and the five feet in src/content/feet/persians.ts)
    goal: { kind: 'value', read: () => FEET.filter((f) => f.persian).reduce((n, f) => n + (save.kills[f.id] ?? 0), 0), need: 300 },
    how: 'Strength of the gods: defeat 300 Persian feet (any of the Persian army).',
    look: kratosLook,
    ability: sig('This Is Spartaaa', 'spartaaa', 0.7, 0xff6a1a, `Signature (${S}): a huge “THIS IS SPARTAAA!”, then 30 s of rage. Smacks deal +100% damage and every smack hits all feet within 160 px (the rest take normal damage), burns them all (1.5×/s for 3 s), knocks them back hard and breaks shields and armour. The meter doesn’t fill while the rage lasts. Passive, Spinning Blade: a chained blade orbits your peel (×1 to every foot it passes, at most every 0.5 s a foot). While enraged it catches fire and spins twice as fast. One more blade at the start of each new act in the run, up to 5.`),
  },
  {
    id: 'hera', name: 'Hera', sub: 'greek',
    goal: track('aliveThirty'),
    how: 'Queen of the gods: keep every pizza alive for 30 waves in one run.',
    look: greek('hera', 'peacock', C.hera),
    ability: sig('Queen’s Decree', 'queensDecree', 0.95, hex(C.hera), `Signature (${S}): every pizza is crowned for 15 s. The first stomp on each is turned back onto the foot (×5). Passive, Jealous Eye: a foot that stomps a crowned pizza is marked (×1.5 damage taken for 4 s).`),
  },
  {
    id: 'poseidon', name: 'Poseidon', sub: 'greek',
    goal: track('pierBeach'),
    how: 'Lord of the sea: clear The Pier and Shack Attack Beach Bar (beat their bosses) in one run.',
    look: greek('poseidon', 'trident', C.poseidon),
    ability: sig('Earthshaker', 'earthshaker', 0.9, hex(C.poseidon), `Signature (${S}): the trident strikes the table and a wall of water rises and sweeps across it: ×7 to every foot, a big knockback and 50% slow for 4 s. Passive, Sea Legs: +50% knockback.`, stat({ knockback: 130 })),
  },
  {
    id: 'demeter', name: 'Demeter', sub: 'greek',
    goal: track('regrow50'),
    how: 'Goddess of the harvest: regrow 50 slices in one run, counting every heal and the slices a pizza comes back with.',
    look: greek('demeter', 'wheat', C.demeter),
    ability: sig('Harvest', 'harvest', 1, hex(C.demeter), `Signature (${S}): wheat bursts up between the pizzas. Every pizza regrows 2 slices and its freshness refills. Passive, Bounty: when a wave is cleared, a 15% chance of a free slice on your weakest pizza.`),
  },
  {
    id: 'athena', name: 'Athena', sub: 'greek',
    goal: track('frugal30'),
    how: 'Goddess of wisdom: reach wave 30 (from wave 1) owning no more than 5 toppings.',
    look: greek('athena', 'owl', C.athena),
    ability: sig('Aegis', 'aegis', 0.9, hex(C.athena), `Signature (${S}): the owl shield covers the whole table for 8 s. Nothing can stomp, so you can smack freely. Passive, Wisdom: when the shop opens, Athena points out the card that helps your build most.`),
  },
  {
    id: 'apollo', name: 'Apollo', sub: 'greek',
    goal: track('day20'),
    how: 'God of the sun: reach wave 20 in a run played in daylight, 7am to 7pm your local time.',
    look: greek('apollo', 'lyre', C.apollo),
    ability: sig('Sun Chariot', 'sunChariot', 0.9, hex(C.apollo), `Signature (${S}): a blazing chariot drives across the sky. Every foot it passes is set alight (2×/s for 4 s). Passive, Muse: every 10th smack fires a sun arrow at a random foot (×3).`),
  },
  {
    id: 'artemis', name: 'Artemis', sub: 'greek',
    goal: track('oneSmack', 250),
    how: 'Goddess of the hunt: defeat 250 feet with a single smack each.',
    look: greek('artemis', 'bow', C.artemis),
    ability: sig('Hunter’s Moon', 'huntersMoon', 0.9, hex(C.artemis), `Signature (${S}): a silver moon rises. For 12 s every smack on the toughest foot is a crit. Passive, Huntress: every 4 s a silver arrow flies at the toughest foot (×3).`),
  },
  {
    id: 'ares', name: 'Ares', sub: 'greek',
    goal: track('hundredWave'),
    how: 'God of war: defeat 100 feet in one wave.',
    look: greek('ares', 'helmet', C.ares),
    ability: sig('War Cry', 'warCry', 0.9, hex(C.ares), `Signature (${S}): a bronze horn blares and you and every pizza go to war for 15 s: +50% damage, and a pizza bites any foot that stomps it (×3). Passive, Bloodlust: +2% damage for every foot defeated in the last 10 s.`),
  },
  {
    id: 'aphrodite', name: 'Aphrodite', sub: 'greek',
    goal: track('combo100'),
    how: 'Goddess of love: reach a 100 combo.',
    look: greek('aphrodite', 'shell', C.aphrodite),
    ability: sig('Charm', 'charm', 0.9, hex(C.aphrodite), `Signature (${S}): hearts float over every foot. For 6 s they’re smitten: they stop and wander back up the screen (bosses are only slowed). Passive, Beauty: +15% tips.`, stat({ coinMult: 0.15 })),
  },
  {
    id: 'hephaestus', name: 'Hephaestus', sub: 'greek',
    goal: track('colossusNoSlices'),
    how: 'Smith of the gods: beat the Colossus without losing a slice.',
    look: greek('hephaestus', 'anvil', C.hephaestus),
    ability: sig('Forge', 'forge', 0.85, hex(C.hephaestus), `Signature (${S}): an anvil drops onto the table. For 20 s every smack also hammers the anvil, firing sparks at 2 feet (×1 each). Passive, Smith: your peel can’t be stunned, slowed or snatched, and +2 smack damage.`, stat({ damage: 2 })),
  },
  {
    id: 'hermes', name: 'Hermes', sub: 'greek',
    goal: track('tenSecWave', 10),
    how: 'Messenger of the gods: clear 10 waves in under 10 seconds each.',
    look: greek('hermes', 'caduceus', C.hermes),
    ability: sig('Messenger', 'messenger', 0.9, hex(C.hermes), `Signature (${S}): winged sandals. For 10 s a winged peel darts to each foot in turn and smacks it (×1.5, about 4 a second). Passive, Swift: a quarter of your smacks land twice, and +15% tips.`, stat({ doubleChance: 0.25, coinMult: 0.15 })),
  },
  {
    id: 'dionysus', name: 'Dionysus', sub: 'greek',
    goal: track('fivePizzaWaves', 25),
    how: 'God of the feast: clear 25 waves with 5 pizzas on the table.',
    look: greek('dionysus', 'grapes', C.dionysus),
    ability: sig('Revel', 'revel', 0.9, hex(C.dionysus), `Signature (${S}): a party breaks out. For 10 s feet stagger about (50% slower), and every foot that falls over grows a slice back on your weakest pizza. Passive, Wine-Dark: every pizza on the table gets +1 slice at the start of each wave.`),
  },
  {
    id: 'hestia', name: 'Hestia', sub: 'greek',
    goal: { kind: 'value', read: () => save.runs, need: 25 },
    how: 'Keeper of the hearth: play 25 runs.',
    look: greek('hestia', 'hearth', C.hestia),
    ability: sig('Hearth', 'hearth', 1.1, hex(C.hestia), `Signature (${S}): a warm glow fills the table. Every pizza’s slices and freshness are fully restored. Passive, Keeper of the Flame: freshness never drops below half.`),
  },
  {
    id: 'hades', name: 'Hades', sub: 'greek',
    goal: { kind: 'value', read: () => (save.bossesBeaten.includes('hades') ? 1 : 0), need: 1 },
    how: 'Lord of the underworld: beat Hades in Tartarus (wave 90).',
    look: greek('hades', 'bident', C.hades, { base: '#d8d2e0' }),
    ability: sig('Underworld', 'underworld', 0.9, hex(C.hades), `Signature (${S}): the floor cracks open. Every foot under 30% health is dragged down to the underworld, and the rest take ×5. Passive, Ferryman: every foot defeated pays 1 extra tip.`),
  },
  {
    id: 'persephone', name: 'Persephone', sub: 'greek',
    goal: track('reviveBoss'),
    how: 'Queen of two worlds: bring a pizza back from the dead (a Rebake or any other revive), then beat the next boss with that pizza still on the table.',
    look: greek('persephone', 'pomegranate', C.persephone),
    ability: sig('Spring Returns', 'springReturns', 1, hex(C.persephone), `Signature (${S}): flowers bloom across the table. Once a run, a destroyed pizza comes back on full slices; any other time (or with nothing to bring back), every pizza regrows a slice. Passive, Two Seasons: alternate waves give +10% damage or +10% tips.`),
  },
  {
    id: 'nike', name: 'Nike', sub: 'greek',
    goal: track('wins', 10),
    how: 'Goddess of victory: win 10 runs.',
    look: greek('nike', 'wings', C.nike),
    ability: sig('Victory Wings', 'victoryWings', 0.9, hex(C.nike), `Signature (${S}): golden wings unfold. For 12 s every kill keeps your combo going longer (+1.5 s on the combo timer) and pays +1 tip. Passive, Winning Streak: +5% damage for every boss beaten this run.`),
  },
  {
    id: 'nyx', name: 'Nyx', sub: 'greek',
    goal: track('night20'),
    how: 'Goddess of the night: reach wave 20 in a run played between midnight and 4am, your local time.',
    look: greek('nyx', 'veil', C.nyx, { base: '#d8d4e8' }),
    ability: sig('Nightfall', 'nightfall', 0.9, hex(C.nyx), `Signature (${S}): total darkness for 5 s; only your peel glows. Every foot is stunned and marked (×1.5 damage taken for 6 s). Passive, Night Owl: +20% damage on night stages.`),
  },

  // ——— NORSE GODS ———
  {
    id: 'odin', name: 'Odin', sub: 'norse',
    goal: { kind: 'value', read: () => owned(NORSE), need: NORSE.length, when: { weekday: [3] } },
    how: 'The Allfather: unlock every other Norse god peel (all 13), then come back on a Wednesday (Woden’s day).',
    look: norse('odin', 'eye', C.odin),
    ability: sig('Allfather', 'allfather', 0.85, hex(C.odin), `Signature (${S}): his single eye opens over the table. Two ravens fly out and mark every foot (×2 damage taken for 8 s), then Gungnir strikes the 4 toughest (×6). Passive, Wisdom of Mimir: every foot shows its weak point (its toes); a smack there deals +25%.`),
  },
  {
    id: 'thor', name: 'Thor', sub: 'norse',
    goal: track('threeBosses', 1, { weekday: [4] }),
    how: 'God of thunder: on a Thursday (Thor’s day), beat 3 bosses in one run.',
    look: norse('thor', 'hammer', C.thor),
    ability: sig('Thunder God', 'thunderGod', 0.85, hex(C.thor), `Signature (${S}): the sky darkens and the hammer is raised; lightning strikes every foot (×6) and chains on for 3 jumps (×2). Passive, Mjölnir: every 7 s the hammer is thrown as a boomerang (×4 out, ×4 back). Only you can lift it, so your peel can’t be snatched or stunned.`),
  },
  {
    id: 'loki', name: 'Loki', sub: 'norse',
    goal: { kind: 'secret', id: 'loki', need: 1 },
    how: 'Secret: someone shifty very rarely peeks out from behind the chalkboard on the title screen, just for a moment. Smack him.',
    look: norse('loki', 'serpent', C.loki, { base: '#7a5a3a' }),
    ability: sig('Mischief', 'mischief', 0.9, hex(C.loki), `Signature (${S}): 3 decoy peels appear. For 10 s the feet lose track of which one is real, and 30% of their stomps miss. Passive, Trickster: every few seconds two diving feet swap places.`),
  },
  {
    id: 'frigg', name: 'Frigg', sub: 'norse',
    goal: track('tenClean', 1, { weekday: [5] }),
    how: 'Queen of Asgard: on a Friday (Frigg’s day), lose no slices for 10 waves in a row.',
    look: norse('frigg', 'spindle', C.frigg),
    ability: sig('Foresight', 'foresight', 0.85, hex(C.frigg), `Signature (${S}): for 15 s every stomp shows a ghost of where it will land, and those stomps are blocked. Passive, Weaver: the first stomp on each pizza each wave is blocked.`),
  },
  {
    id: 'freya', name: 'Freya', sub: 'norse',
    goal: track('goldenKills', 25),
    how: 'Lady of gold: catch 25 golden feet.',
    look: norse('freya', 'falcon', C.freya),
    ability: sig('Falcon Cloak', 'falconCloak', 0.9, hex(C.freya), `Signature (${S}): you become a falcon for 10 s. Every smack is a diving strike that also hits the 2 feet nearest it (×1 each). Passive, Love and Gold: +10% tips, and golden feet pay double.`, stat({ coinMult: 0.1 })),
  },
  {
    id: 'freyr', name: 'Freyr', sub: 'norse',
    goal: track('stageFull'),
    how: 'Lord of plenty: end a stage with every pizza on the table at full slices.',
    look: norse('freyr', 'boar', C.freyr),
    ability: sig('Golden Boar', 'goldenBoar', 0.9, hex(C.freyr), `Signature (${S}): a shining boar charges across the table (×6 to every foot in its way), leaving gold coins behind (+2 tips each foot it hits). Passive, Harvest Sun: +1 slice on your weakest pizza each wave.`, { trigger: { t: 'wave' }, fx: [P.H(1, 'weakest')] }),
  },
  {
    id: 'tyr', name: 'Tyr', sub: 'norse',
    goal: track('threeBossesNoAbility', 1, { weekday: [2] }),
    how: 'God of law: on a Tuesday (Tyr’s day), with any peel but the Classic Peel, beat 3 bosses in one run without using your peel’s ability.',
    look: norse('tyr', 'sword', C.tyr),
    ability: sig('Oath of Tyr', 'oathTyr', 0.85, hex(C.tyr), `Signature (${S}): you sacrifice the peel’s hand: for 5 s your smacks can’t hit anything. Then for 15 s every hit deals ×3. Passive, Lawgiver: +25% damage to bosses and mini-bosses.`),
  },
  {
    id: 'heimdall', name: 'Heimdall', sub: 'norse',
    goal: track('shieldBlocks', 100),
    how: 'Watchman of the gods: block 100 stomps with stomp shields.',
    look: norse('heimdall', 'horn', C.heimdall),
    ability: sig('Gjallarhorn', 'gjallarhorn', 0.9, hex(C.heimdall), `Signature (${S}): a horn blast. Every foot on screen is pushed back to the top, and the next 3 stomps are blocked. Passive, Watchman: a ring flashes on a pizza just before a stomp lands on it.`),
  },
  {
    id: 'baldur', name: 'Baldur', sub: 'norse',
    goal: track('fullRun30'),
    how: 'The shining god: finish a run of 30 waves or more with every pizza on the table at full slices.',
    look: norse('baldur', 'sun', C.baldur, { base: '#b08a58' }),
    ability: sig('Radiance', 'radiance', 0.85, hex(C.baldur), `Signature (${S}): a pillar of light. For 10 s nothing can hurt your pizzas. Passive, Beloved: your weakest pizza regrows a slice every 6 s.`),
  },
  {
    id: 'hel', name: 'Hel', sub: 'norse',
    goal: track('loaferNoSlices'),
    how: 'Queen of the dead: beat the Zombie Loafer without losing a slice.',
    look: norse('hel', 'halfskull', C.hel, { base: '#6e5a48' }),
    ability: sig('Half-Death', 'halfDeath', 0.9, hex(C.hel), `Signature (${S}): half the screen goes grey. Every foot loses half its health (bosses take ×8 instead). Passive, Queen of the Dead: undead feet (zombies, mummies, ghosts, skeletons) take ×2.`),
  },
  {
    id: 'njord', name: 'Njord', sub: 'norse',
    goal: track('pierClears', 10),
    how: 'God of the sea wind: clear The Pier (beat its boss) 10 times.',
    look: norse('njord', 'ship', C.njord),
    ability: sig('Sea Wind', 'seaWind', 0.9, hex(C.njord), `Signature (${S}): a gale blows across the table for 8 s. Feet are pushed back up and can’t dive (bosses are slowed). Passive, Fair Winds: event flyers stay 1.5 s longer.`, stat({ flyerSec: 1.5 })),
  },
  {
    id: 'skadi', name: 'Skadi', sub: 'norse',
    goal: { kind: 'track', key: 'hotSlopes', need: 1, minHeat: 'hot' },
    how: 'Huntress of the mountains: clear Ski Slopes (beat the Yeti) on Hot or hotter.',
    look: norse('skadi', 'snowflake', C.skadi, { base: '#8a6a4e' }),
    ability: sig('Winter Hunt', 'winterHunt', 0.9, hex(C.skadi), `Signature (${S}): snow falls. For 10 s every smack freezes the foot for 2 s. Passive, Mountain Born: +20% damage at Alpine Lodge and Ski Slopes.`),
  },
  {
    id: 'idun', name: 'Idun', sub: 'norse',
    goal: track('freshRun'),
    how: 'Keeper of the golden apples: play a run of at least 10 waves (with freshness on) without a pizza ever going stale.',
    look: norse('idun', 'apple', C.idun),
    ability: sig('Golden Apples', 'goldenApples', 1, hex(C.idun), `Signature (${S}): golden apples fall onto every pizza. Once a run, slices and freshness are fully restored; after that the tree is bare and each pizza gets 1 slice. Passive, Youth: pizzas never go stale.`),
  },
  {
    id: 'bragi', name: 'Bragi', sub: 'norse',
    goal: track('combo200'),
    how: 'God of poetry: reach a 200 combo.',
    look: norse('bragi', 'harp', C.bragi),
    ability: sig('Saga', 'saga', 0.9, hex(C.bragi), `Signature (${S}): a bard sings your run. For 15 s your damage grows with your combo: +5% for every 10, with no cap. Passive, Skald: every 10-combo plays a verse, +10% damage until the combo breaks (up to +50%).`),
  },
];

export const GOD_COLOR: Record<string, number> = Object.fromEntries(Object.entries(C).map(([k, v]) => [`hero:${k}`, hex(v)]));
// Kratos burns orange
GOD_COLOR['hero:kratos'] = 0xff6a1a;

export const peels: HeroPeel[] = ROWS.map((r) => ({
  id: `hero:${r.id}`,
  name: r.name,
  sub: r.sub,
  pantheon: r.sub,
  goal: r.goal,
  how: r.how,
  look: r.look,
  ability: r.ability,
}));
