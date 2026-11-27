// What each peel ability's visual plays (src/game/abilityFx.ts): a few steps from the stagers, and its sounds.
// One entry per meter ability (pressed or automatic) that isn't hand-built; zombified feet play their foot's with
// the zombie's rise and tint; anything without an entry gets one made from its group, element and effects, so a new
// ability always shows something sensible (but write it a real one).
//
// Texture references: 'foot' (the ability's foot: foot, boss and zombified peels), 'pizza' (the pizza peel's pizza),
// 'peel' (the equipped peel's own art), or any texture key (props p_*, throws t_*, events ev_*, ours afx_*).
// Sounds: [key, ms after firing, volume, rate]. Timings: every stager lands its hit about 170 ms in.

import type { Ability } from './abilities';

export type TexRef = string;

/** Every stager aims at the feet the ability reached; nothing is placed over the middle of the screen (see the
 * restraint rules in src/game/abilityFx.ts). Sizes are capped by the stagers. */
export type Step = { t?: number } & (
  /** Comes down on each foot it hit (up to n); x, y: where it lands when nothing was hit. */
  | { k: 'strike'; tex: TexRef; n?: number; size?: number; from?: 'top' | 'left' | 'right'; spin?: number; crack?: boolean; dust?: number; stagger?: number; x?: number; y?: number; hold?: number; bounce?: boolean }
  /** A run along the bottom edge; as it passes each foot a short streak flashes up under it, and hitTex (the
   * source's own mark: ski spray, a lance's sparks, hoof dust) bursts off it. */
  | { k: 'sweep'; tex: TexRef; hitTex?: TexRef; dir?: 1 | -1; size?: number; ms?: number; spin?: number; hop?: number; hops?: number; ghosts?: boolean; flip?: boolean; trail?: number; n?: number; gap?: number; wobble?: number; lean?: number }
  /** Falls (or rises: up) onto each foot it hit, plus a few around them (spread: only around the table). */
  | { k: 'rain'; tex: TexRef[]; n?: number; size?: number; at?: 'targets' | 'spread'; ms?: number; slant?: number; spin?: boolean; trail?: number; splash?: number; up?: boolean; tint?: number[]; add?: boolean; point?: boolean; stay?: boolean }
  /** Rings out from (or in onto: implode) each foot it hit, with a few icons thrown off. */
  | { k: 'rings'; color: number; n?: number; gap?: number; squash?: number; icons?: TexRef; nIcons?: number; iconTint?: number[]; implode?: boolean; tex?: TexRef; ms?: number }
  /** Down from the top edge onto each foot it hit. */
  | { k: 'beam'; kind: 'bolt' | 'light' | 'laser'; color: number; n?: number; w?: number; colors?: number[]; stagger?: number }
  /** The element in at the sides (12% of the width) and splashing on each foot (tint: fire's and the splash's). */
  | { k: 'flood'; kind: 'water' | 'ink' | 'sauce' | 'snow' | 'fire' | 'frost' | 'gold' | 'cheese' | 'part'; tint?: number }
  /** A whirl on each foot it hit (up to four). */
  | { k: 'spin'; tex: TexRef; size?: number; turns?: number; ms?: number; color?: number; implode?: boolean; tint?: number; add?: boolean; sparkle?: boolean }
  /** The emblem at the edge: in from the right side (pop), up at the bottom corner (below) or down at the top one. */
  | { k: 'show'; tex: TexRef; size?: number; ms?: number; glow?: number; shatter?: { tex: TexRef; size?: number; tint?: number }; from?: 'below' | 'top' | 'pop'; wiggle?: boolean; spin?: number; tint?: number; add?: boolean }
  /** The backdrop (only) tinted, at most 15%. */
  | { k: 'tint'; color: number; alpha?: number; ms?: number }
  /** The screen's edges darkened (its middle stays clear): night falling at the corners. */
  | { k: 'vignette'; color?: number; alpha?: number; ms?: number }
  /** A zombified foot claws up at the bottom-left corner. */
  | { k: 'rise' }
  /** Copies swoop down from the top edge onto each foot it hit. */
  | { k: 'seek'; tex: TexRef; n?: number; size?: number; spin?: boolean; tint?: number; add?: boolean }
  | { k: 'curtain' }
  | { k: 'krak' }
  | { k: 'timber' }
);

export interface Spec {
  steps: Step[];
  sfx: [key: string, ms?: number, vol?: number, rate?: number][];
  /** How hard the peak shakes (1 = a normal big move). */
  weight?: number;
  /** Darken the backdrop (only) under the move so it reads over bright stages (capped at 0.15). */
  dim?: number;
  /** What the calm (reduced motion) and light versions show at the edge. */
  emblem?: TexRef;
  /** A zombified foot's: its foot tinted, clawing up at the corner, green marks. */
  zombie?: boolean;
}

const RED = 0xff5a3c;
const ORANGE = 0xff9f1c;
const GOLD = 0xffd23f;
const GREEN = 0x7be04a;
const CYAN = 0x5fd8ff;
const BLUE = 0x4c7dff;
const PURPLE = 0xa77dff;
const PINK = 0xff7ad9;
const WHITE = 0xffffff;
const RAINBOW = [0xff4d4d, 0xff9f1c, 0xffd23f, 0x5fe06a, 0x4cc9f0, 0x6a7dff, 0xb06bff];

const S: Record<string, Spec> = {
  // ——— the Golden Crust and jewellery, and their mastered takes ———
  // the golden peel itself comes down on the table and the tips fountain out
  gold: {
    steps: [{ k: 'strike', tex: 'peel', size: 1.15, dust: GOLD }, { k: 'rings', color: GOLD, n: 2, icons: 'coin', nIcons: 14, t: 170 }],
    sfx: [['sfx_whoosh', 0, 0.9, 0.8], ['sfx_smack_gold_heavy', 150], ['sfx_hero_coins', 200, 0.9]],
    dim: 0.15,
  },
  // marbles roll across the table, bouncing, in three lanes
  marble: {
    steps: [{ k: 'sweep', tex: 'afx_marble', hitTex: 'afx_marble', size: 170, spin: 4, hop: 50, hops: 5, n: 4, gap: 70, ms: 520, ghosts: false }],
    sfx: [['sfx_rollrumble', 0, 0.9, 1.2], ['sfx_hittink', 170], ['sfx_hittink', 320, 0.8, 1.2], ['sfx_hittink', 470, 0.7, 1.4]],
    emblem: 'afx_marble',
  },
  // Sapphire Tide: the sapphire glints and the tide comes in off it
  sapphire: {
    steps: [{ k: 'show', tex: 'afx_gem_4c7dff', size: 240, glow: BLUE, ms: 500 }, { k: 'flood', kind: 'water', t: 60 }],
    sfx: [['sfx_smack_crystal_1'], ['sfx_kraken_splash', 80], ['sfx_smack_water_heavy', 220]],
  },
  // a hex circle opens under every foot, the amethyst glowing over the table
  amethyst: {
    steps: [{ k: 'show', tex: 'afx_gem_a77dff', size: 220, glow: PURPLE, spin: 0 }, { k: 'rings', tex: 'afx_hex', color: PURPLE, n: 1, squash: 0.45, ms: 700 }],
    sfx: [['sfx_hero_hex'], ['sfx_smack_crystal_2', 160]],
    dim: 0.15,
  },
  // the diamond flares and shatters, its shards raining onto every foot
  diamond: {
    steps: [{ k: 'show', tex: 'afx_gem_5fd8ff', size: 300, glow: CYAN, shatter: { tex: 'afx_gem_5fd8ff', size: 70 } }],
    sfx: [['sfx_smack_crystal_heavy'], ['sfx_colossus_shatter', 170]],
    dim: 0.15,
    weight: 1.2,
  },
  // Grand Peel Slam: the Classic Peel itself, head first, slams down on the feet in gold
  'master:classic': {
    steps: [{ k: 'strike', tex: 'peel', size: 1.25, dust: GOLD, n: 3 }, { k: 'rings', color: GOLD, n: 2, icons: 'star5', nIcons: 12, t: 170 }],
    sfx: [['sfx_whoosh', 0, 1, 0.7], ['sfx_crit', 160], ['sfx_explosion', 170, 0.8]],
    weight: 1.3,
  },
  'master:marble': {
    steps: [{ k: 'rain', tex: ['afx_marble'], n: 22, size: 110, ms: 500, spin: true, stay: true }],
    sfx: [['sfx_rollrumble', 0, 1, 0.9], ['sfx_hittink', 170], ['sfx_hittink', 280, 0.9, 1.1], ['sfx_hittink', 400, 0.8, 1.3], ['sfx_smack_glass_heavy', 200, 0.7]],
    emblem: 'afx_marble',
  },
  // King Midas: the crown drops, molten gold floods the table, coins everywhere
  'master:gold': {
    steps: [{ k: 'strike', tex: 'p_nz_crown', size: 0.8, crack: false, dust: GOLD, bounce: true }, { k: 'flood', kind: 'gold', t: 100 }],
    sfx: [['sfx_zeus_crown'], ['sfx_smack_gold_heavy', 170], ['sfx_hero_coins', 250]],
    dim: 0.15,
  },
  // Tidal Wave: a breaking wave the size of the screen, the sapphire glinting over it
  'master:sapphire': {
    steps: [{ k: 'flood', kind: 'water' }, { k: 'show', tex: 'afx_gem_4c7dff', size: 170, glow: BLUE, t: 80 }],
    sfx: [['sfx_kraken_splash', 0, 1, 0.8], ['sfx_whirlpool', 100, 0.8], ['sfx_smack_water_heavy', 200]],
  },
  'master:amethyst': {
    steps: [
      { k: 'tint', color: 0x2a1050, alpha: 0.15, ms: 800 },
      { k: 'spin', tex: 'afx_hex', size: 900, turns: 0.5, ms: 800, color: PURPLE, tint: PURPLE, add: true },
      { k: 'rings', tex: 'afx_hex', color: PURPLE, n: 1, squash: 0.45, ms: 700, t: 120 },
    ],
    sfx: [['sfx_hero_hex'], ['sfx_phantomking_curse', 150, 0.8], ['sfx_smack_crystal_heavy', 170]],
    emblem: 'afx_hex',
  },
  // Forever: a huge diamond turns once, flares and bursts into shards on every foot
  'master:diamond': {
    steps: [
      { k: 'show', tex: 'afx_gem_bfefff', size: 420, glow: WHITE, shatter: { tex: 'afx_gem_5fd8ff', size: 80 } },
      { k: 'rings', color: CYAN, n: 3, t: 170 },
    ],
    sfx: [['sfx_smack_crystal_heavy'], ['sfx_colossus_shatter', 170], ['sfx_explosion', 180, 0.7]],
    dim: 0.15,
    weight: 1.4,
  },
  // the ultra-rare jewels
  // a prism splits the light into a rainbow, one beam onto each foot
  'ultra:prism': {
    steps: [{ k: 'show', tex: 'afx_gem_f4f8ff', size: 260, glow: WHITE, spin: 0 }, { k: 'beam', kind: 'laser', color: WHITE, colors: RAINBOW, w: 1.4 }],
    sfx: [['sfx_hero_primebeam'], ['sfx_smack_crystal_heavy', 120]],
    dim: 0.15,
  },
  'ultra:crownjewel': {
    steps: [{ k: 'strike', tex: 'p_nz_crown', size: 0.9, crack: false, dust: GOLD, bounce: true }, { k: 'rain', tex: ['afx_gem_ff4d6d', 'afx_gem_5fd8ff', 'afx_gem_5fe06a', 'afx_gem_ffd23f'], n: 14, size: 60, t: 120, spin: true }],
    sfx: [['sfx_zeus_crown'], ['sfx_smack_gold_heavy', 170], ['sfx_coin', 300], ['sfx_coin', 420, 0.8, 1.2]],
    dim: 0.15,
  },
  // Big Bang: a black hole swallows the light, then everything bursts outward
  'ultra:cosmic': {
    steps: [
      { k: 'tint', color: 0x080418, alpha: 0.15, ms: 500 },
      { k: 'spin', tex: 'p_blackhole', size: 520, turns: 1.5, ms: 400, implode: true, color: PURPLE },
      { k: 'rings', color: WHITE, n: 4, gap: 70, t: 360, icons: 'star', nIcons: 18, iconTint: [0xffffff, 0xb06bff, 0x5fd8ff] },
    ],
    sfx: [['sfx_cosmiccroc_blackhole'], ['sfx_explosion', 380], ['sfx_hitboom', 390]],
    weight: 1.5,
  },

  // ——— places ———
  // Rogue Wave: a wave rolls in off the sea, gulls riding ahead of it
  'place:beach': {
    steps: [{ k: 'flood', kind: 'water' }, { k: 'sweep', tex: 'ev_seagull', hitTex: 'afx_bubble', dir: -1, size: 150, ms: 700, hop: 30, n: 3, gap: 90, ghosts: false }],
    sfx: [['sfx_kraken_splash'], ['sfx_seagull', 100], ['sfx_smack_water_heavy', 220]],
  },
  // Jukebox Hit: the record drops on, notes ring out across the room
  // Jukebox Hit: the record drops on at the edge and notes ring out from every foot
  'place:diner': {
    steps: [{ k: 'show', tex: 'afx_record', size: 300, spin: 2 }, { k: 'rings', color: PINK, n: 2, icons: 'afx_note', nIcons: 14, iconTint: [0xff7ad9, 0x5fd8ff, 0xffd23f] }],
    sfx: [['sfx_smack_tail_jukebox'], ['sfx_hitbonk', 170], ['sfx_smack_tail_jukebox', 300, 0.7, 1.2]],
    dim: 0.15,
  },
  // Zero-G: the lights go to deep space, stars rise and everything floats up
  'place:space': {
    steps: [{ k: 'tint', color: 0x0a0a30, alpha: 0.15, ms: 700 }, { k: 'rain', tex: ['star', 'star5'], n: 24, size: 50, at: 'spread', up: true, add: true, tint: [0xffffff, 0xb06bff, 0x5fd8ff] }, { k: 'rings', color: PURPLE, n: 2, squash: 0.3 }],
    sfx: [['sfx_finale_warp'], ['sfx_cosmiccroc_flip', 160]],
    emblem: 'star',
  },
  // Spin Out: a puck rockets across the ice and everything spins
  'place:rink': {
    steps: [{ k: 'sweep', tex: 'p_puck', hitTex: 'shard', size: 140, spin: 6, ms: 420, trail: CYAN }, { k: 'spin', tex: 'ring', size: 900, turns: 2, ms: 700, tint: PINK, add: true, sparkle: true, color: CYAN, t: 120 }],
    sfx: [['sfx_rinkqueen_puck'], ['sfx_iceskate_axel', 140]],
  },
  // Whiteout: a blizzard comes down the mountain
  'place:slopes': {
    steps: [{ k: 'flood', kind: 'snow' }, { k: 'flood', kind: 'frost', t: 120 }],
    sfx: [['sfx_yeti_avalanche'], ['sfx_frostchill', 150]],
  },
  // Rainbow Bridge: the Bifrost arcs over the table and its light comes down on every foot
  'place:bifrost': {
    steps: [{ k: 'show', tex: 'afx_rainbow', size: 1700, from: 'below', ms: 800 }, { k: 'beam', kind: 'light', color: WHITE, colors: RAINBOW, t: 120 }],
    sfx: [['sfx_hero_gjallarhorn', 0, 0.8], ['sfx_hero_allfather', 140, 0.7]],
  },

  // ——— acts ———
  'act:7': { steps: [{ k: 'krak' }], sfx: [['sfx_soleunbound_krak'], ['sfx_hitboom', 150], ['sfx_explosion', 160, 0.6]], weight: 1.2 },
  'act:10': {
    steps: [{ k: 'curtain' }],
    sfx: [['sfx_hero_sweep', 0, 0.9, 0.6], ['sfx_smack_fabric_heavy', 200], ['sfx_bigfoot_pound', 210, 0.6, 1.2], ['sfx_finale_peelwall', 560], ['sfx_curtaincall_applause', 600]],
    emblem: 'afx_curtain',
    weight: 1.2,
  },

  // ——— events ———
  // Whirlpool: Charybdis opens in the middle of the table
  // Whirlpool: Charybdis's water at the sides, a foaming whirl under every foot
  'event:charybdis': {
    steps: [{ k: 'flood', kind: 'water' }, { k: 'spin', tex: 'afx_spiral', turns: -1.5, tint: 0x9fe6ff, color: CYAN, sparkle: false }, { k: 'rain', tex: ['afx_bubble'], n: 12, size: 60, up: true, t: 120 }],
    sfx: [['sfx_whirlpool'], ['sfx_kraken_splash', 200, 0.8]],
  },

  // ——— bosses and mini-bosses ———
  'boss:bigfoot': {
    steps: [{ k: 'strike', tex: 'foot', size: 1.25, dust: 0xb08a5a }, { k: 'rain', tex: ['p_colossus_chunk'], n: 8, size: 60, at: 'spread', t: 220, spin: true, stay: true }],
    sfx: [['sfx_bigfoot_rampage', 0, 0.7], ['sfx_bigfoot_pound', 160], ['sfx_bigfoot_bigstep', 170]],
    weight: 1.4,
  },
  // Piston Barrage: Iron Heel's pistons hammer down on six feet, steam bursting
  'boss:ironheel': {
    steps: [{ k: 'strike', tex: 'p_piston', n: 6, size: 0.8, stagger: 60, crack: false, dust: 0xffffff, hold: 80 }, { k: 'rain', tex: ['p_steam'], n: 10, size: 160, at: 'spread', up: true, t: 200 }],
    sfx: [['sfx_ironheel_charge', 0, 0.8], ['sfx_ironheel_press', 160], ['sfx_piston', 230], ['sfx_piston', 300, 0.8, 1.1], ['sfx_ironheel_steam', 360]],
  },
  // Extinction Roar: the T-Rex rears up from the front and roars the table back
  'boss:trex': {
    steps: [{ k: 'show', tex: 'foot', size: 620, from: 'below', wiggle: true, ms: 700 }, { k: 'rings', color: GREEN, n: 5, gap: 80, squash: 0.6, t: 80 }],
    sfx: [['sfx_trex_roar'], ['sfx_trex_breath', 300, 0.7]],
    weight: 1.3,
  },
  // Earthquake: the Colossus stamps, the table cracks and rubble falls
  'boss:colossus': {
    steps: [{ k: 'strike', tex: 'foot', size: 1.3, dust: 0x9a9488 }, { k: 'rain', tex: ['p_colossus_chunk', 'p_colossus_shard'], n: 14, size: 80, t: 170, spin: true, stay: true }],
    sfx: [['sfx_colossus_crack', 150], ['sfx_bigfoot_pound', 170], ['sfx_colossus_clang', 200, 0.7]],
    weight: 1.6,
  },
  // Possession: the Phantom King's ghost splits into wisps that dive into every foot
  'boss:phantomking': {
    steps: [{ k: 'tint', color: 0x1a0830, alpha: 0.15, ms: 700 }, { k: 'show', tex: 'foot', size: 380, add: true, tint: PURPLE, ms: 400 }, { k: 'seek', tex: 'foot', size: 130, tint: PURPLE, add: true, t: 100 }],
    sfx: [['sfx_phantomking_curse'], ['sfx_possess', 200]],
  },
  'boss:cosmiccroc': {
    steps: [{ k: 'rain', tex: ['p_meteor'], n: 8, size: 130, slant: 30, trail: ORANGE, splash: ORANGE, spin: true }],
    sfx: [['sfx_cosmiccroc_meteor'], ['sfx_cosmiccroc_impact', 170], ['sfx_explosion', 260, 0.6]],
    dim: 0.15,
  },
  // Ink Burst: the Kraken's tentacles slam up both sides, and ink floods the table
  'boss:kraken': {
    steps: [
      { k: 'strike', tex: 'p_bigtentacle', x: 300, y: 980, size: 1.1, from: 'left', crack: false, dust: PURPLE },
      { k: 'strike', tex: 'p_bigtentacle', x: 1620, y: 980, size: 1.1, from: 'right', crack: false, dust: PURPLE, t: 60 },
      { k: 'flood', kind: 'ink', t: 120 },
    ],
    sfx: [['sfx_kraken_tentacle'], ['sfx_kraken_squirt', 150], ['sfx_kraken_inked', 200]],
  },
  // Triple Axel: the Rink Queen spins three times in the middle of the ice
  'boss:rinkqueen': {
    steps: [{ k: 'spin', tex: 'foot', size: 420, turns: 3, ms: 760, color: PINK }, { k: 'rain', tex: ['shard'], n: 12, size: 40, at: 'spread', t: 300, tint: [0xdff6ff] }],
    sfx: [['sfx_iceskate_axel'], ['sfx_rinkqueen_dash', 200], ['sfx_iceskate_axel', 450, 0.7, 1.2]],
  },
  // Avalanche: the mountain comes down, snowballs and all
  'boss:yeti': {
    steps: [{ k: 'flood', kind: 'snow' }, { k: 'rain', tex: ['p_yetiball'], n: 6, size: 140, t: 60, spin: true }],
    sfx: [['sfx_yeti_avalanche'], ['sfx_yeti_bigball', 170], ['sfx_freeze', 220]],
  },
  // Brain Freeze: Milkshake Max's straw slurps, the screen frosts over
  'boss:milkshake': {
    steps: [{ k: 'show', tex: 'p_straw', size: 420, from: 'top', ms: 500 }, { k: 'flood', kind: 'frost', t: 60 }, { k: 'rings', color: 0xffc8e8, n: 3, t: 100 }],
    sfx: [['sfx_milkshake_slurp'], ['sfx_milkshake_freeze', 120], ['sfx_milkshake_frozen', 200]],
  },
  'boss:lumberjack': {
    steps: [{ k: 'timber' }, { k: 'sweep', tex: 'p_axe', hitTex: 'crumb', size: 220, spin: 3, ms: 420, ghosts: false }],
    sfx: [['sfx_lumberjack_axe'], ['sfx_lumberjack_timber', 40], ['sfx_lumberjack_thunk', 200]],
    weight: 1.3,
  },
  // Comeback: the Doomstomp's boot lands in a comic burst
  'boss:doomstomp': {
    steps: [{ k: 'strike', tex: 'foot', size: 1.25, dust: 0x8a9a7a }, { k: 'show', tex: 'p_a7_burst', size: 520, t: 160, ms: 300 }],
    sfx: [['sfx_doomstomp_roar'], ['sfx_doomstomp_stomp', 160], ['sfx_doomstomp_quake', 180, 0.7]],
    weight: 1.4,
  },
  // The Snap: the gauntlet rises, snaps, and the feet it took crumble to dust
  'boss:thanfoot': {
    steps: [{ k: 'tint', color: 0x2a1040, alpha: 0.15, ms: 600 }, { k: 'show', tex: 'p_gauntlet', size: 380, from: 'below', glow: PURPLE, wiggle: true }, { k: 'rain', tex: ['soft'], n: 18, size: 70, at: 'targets', up: true, t: 180, tint: [0x8a6a4a, 0xb08a5a] }],
    sfx: [['sfx_thanfoot_power'], ['sfx_thanfoot_snap', 160], ['sfx_thanfoot_snapwind', 260]],
  },
  // Gleipnir Snaps: the chain across the table bursts and Fenrir's paw lands on the front feet
  'boss:fenrir': {
    steps: [{ k: 'show', tex: 'p_gleipnir', size: 900, ms: 140, shatter: { tex: 'p_chainlink', size: 60 } }, { k: 'strike', tex: 'foot', n: 3, size: 0.9, t: 120, stagger: 50, dust: 0x9aa3ad }],
    sfx: [['sfx_fenrir_strain'], ['sfx_fenrir_snap', 150], ['sfx_fenrir_howl', 260, 0.8]],
  },
  // Frost King: hail comes down and the screen freezes over
  'boss:thrym': {
    steps: [{ k: 'flood', kind: 'frost' }, { k: 'rain', tex: ['p_hail'], n: 16, size: 60, slant: 15, spin: true }, { k: 'show', tex: 'p_iceblock', size: 260, glow: CYAN, ms: 500 }],
    sfx: [['sfx_thrym_hail'], ['sfx_thrym_freeze', 150], ['sfx_thrym_crack', 300, 0.7]],
  },
  // Ragnarök: Surtr's flaming sword sweeps the table and it burns
  'boss:surtr': {
    steps: [{ k: 'sweep', tex: 'p_swordarc', hitTex: 'flame', size: 900, ms: 420, lean: 15, trail: ORANGE }, { k: 'flood', kind: 'fire', t: 120 }],
    sfx: [['sfx_surtr_raise'], ['sfx_surtr_sweep', 120], ['sfx_surtr_ignite', 200]],
    weight: 1.4,
  },
  // Bull Rush: the Minotaur charges through the front lanes
  'boss:minotaur': {
    steps: [{ k: 'sweep', tex: 'foot', hitTex: 'crumb', size: 420, ms: 460, hop: 30, hops: 5, lean: 18, trail: 0xb08a5a }],
    sfx: [['sfx_minotaur_snort'], ['sfx_minotaur_charge', 100], ['sfx_minotaur_crash', 260]],
    weight: 1.2,
  },
  // Stone Gaze: Medusa's eyes blaze and her gaze turns every foot to stone
  'boss:medusa': {
    steps: [{ k: 'tint', color: 0x1a2a10, alpha: 0.15, ms: 600 }, { k: 'show', tex: 'foot', size: 380, glow: 0x9dff6a, ms: 600 }, { k: 'beam', kind: 'laser', color: 0x9dff6a, t: 60 }],
    sfx: [['sfx_medusa_glow'], ['sfx_medusa_gaze', 120], ['sfx_medusa_petrify', 220]],
  },
  // Every Peel at Once: golden peels from every side, fire and frost behind them
  'boss:soleunbound': {
    steps: [
      { k: 'seek', tex: 'p_goldpeel', size: 220, spin: true },
      { k: 'flood', kind: 'fire', t: 120 },
      { k: 'flood', kind: 'frost', t: 200 },
      { k: 'rings', color: GOLD, n: 3, t: 200 },
    ],
    sfx: [['sfx_soleunbound_gather'], ['sfx_soleunbound_final', 150], ['sfx_explosion', 220, 0.7]],
    weight: 1.6,
    dim: 0.15,
  },
  // Last Laugh: the jack-in-the-box springs up, cards fly
  'boss:jokester': {
    steps: [{ k: 'show', tex: 'p_gt_jack', size: 380, from: 'below', wiggle: true }, { k: 'seek', tex: 'p_gt_card', size: 90, spin: true, t: 100 }],
    sfx: [['sfx_jokester_spring'], ['sfx_jokester_laugh', 120], ['sfx_jokester_bang', 260, 0.7]],
  },
  // King of the Sky: the sky darkens and Zeus's bolts strike every foot
  // King of the Sky: storm at the edges, his thunderbolt at the edge, his bolts on every foot, his crown's shield
  'boss:zeus': {
    steps: [{ k: 'vignette', color: 0x0a1430, alpha: 0.7 }, { k: 'show', tex: 'p_nz_bolt', size: 300, glow: 0x9fd8ff }, { k: 'beam', kind: 'bolt', color: 0x9fd8ff, w: 1.4 }],
    sfx: [['sfx_zeus_charge'], ['sfx_zeus_thunder', 80], ['sfx_zeus_bolt', 100]],
    weight: 1.3,
  },
  // Arrows Blot Out the Sun: the sky goes dark with arrows
  'boss:xerxes': {
    steps: [{ k: 'tint', color: 0x1a1008, alpha: 0.15, ms: 800 }, { k: 'rain', tex: ['t_arrow'], n: 30, size: 90, slant: 25, point: true, ms: 520 }],
    sfx: [['sfx_xerxes_volley'], ['sfx_xerxes_arrows', 150], ['sfx_arrowthunk', 250]],
  },

  // ——— feet ———
  'foot:bella': {
    steps: [{ k: 'spin', tex: 'foot', size: 380, turns: 3, ms: 760, color: PINK }, { k: 'rings', color: PINK, n: 3, gap: 140, icons: 'star', nIcons: 12, t: 120 }],
    sfx: [['sfx_hero_sweep', 0, 0.8, 1.3], ['sfx_iceskate_axel', 140]],
  },
  // Bubble Net: the flipper paddles across trailing a net of bubbles
  'foot:flipper': {
    steps: [{ k: 'sweep', tex: 'foot', hitTex: 'afx_bubble', size: 320, ms: 600, wobble: 12, trail: CYAN }, { k: 'rain', tex: ['afx_bubble'], n: 20, size: 80, at: 'targets', up: true, t: 120 }],
    sfx: [['sfx_smack_bubble_heavy'], ['sfx_kraken_splash', 160, 0.7], ['sfx_smack_bubble_2', 300]],
  },
  // Honk!: the clown shoe pops up front and its honk rings out
  'foot:clown': {
    steps: [{ k: 'show', tex: 'foot', size: 420, from: 'below', wiggle: true, ms: 600 }, { k: 'rings', color: GOLD, n: 4, gap: 90, icons: 'star5', nIcons: 12, t: 120 }],
    sfx: [['sfx_clownking_honk'], ['sfx_smack_tail_honk', 160]],
  },
  // Roller Disco: the skate rolls across and back, disco lights spinning
  'foot:rita': {
    steps: [{ k: 'sweep', tex: 'foot', hitTex: 'afx_note', size: 320, ms: 520, wobble: 8, trail: PINK }, { k: 'sweep', tex: 'foot', size: 280, ms: 520, dir: -1, wobble: 8, trail: CYAN, t: 300 }, { k: 'beam', kind: 'light', color: PINK, colors: [0xff7ad9, 0x5fd8ff, 0xffd23f], n: 6, t: 100 }],
    sfx: [['sfx_rinkqueen_roll'], ['sfx_smack_tail_jukebox', 120, 0.8]],
  },
  // Moonwalk: it slides backwards across the table, sparkling
  'foot:moe': {
    steps: [{ k: 'sweep', tex: 'foot', hitTex: 'star', size: 340, dir: -1, flip: false, ms: 700, trail: WHITE }, { k: 'rain', tex: ['star'], n: 12, size: 40, at: 'spread', add: true, t: 150 }],
    sfx: [['sfx_hero_backwards'], ['sfx_whoosh', 150, 0.8, 0.7]],
  },
  // Knight Charge: armoured foot gallops at the front feet
  'foot:stompalot': {
    steps: [{ k: 'sweep', tex: 'foot', hitTex: 'shard', size: 340, ms: 460, hop: 40, hops: 6, lean: 12, trail: 0xc0c8d0 }, { k: 'rings', color: WHITE, n: 1, t: 200 }],
    sfx: [['sfx_gallop'], ['sfx_hitclang', 200], ['sfx_hitclang', 300, 0.8, 1.1]],
  },
  'foot:dino': {
    steps: [{ k: 'strike', tex: 'foot', size: 1.2, dust: 0x9ac060 }],
    sfx: [['sfx_trex_roar', 0, 0.8, 1.3], ['sfx_bigfoot_pound', 160]],
    weight: 1.2,
  },
  // Disco Fever: the mirror ball drops in and its coloured lights pick out every foot
  'foot:disco': {
    steps: [{ k: 'show', tex: 'afx_disco', size: 300, from: 'top', spin: 0, ms: 800 }, { k: 'beam', kind: 'light', color: PINK, colors: [0xff7ad9, 0x5fd8ff, 0xffd23f, 0x7be04a] }],
    sfx: [['sfx_smack_tail_jukebox'], ['sfx_hero_ping', 160]],
    dim: 0.15,
  },
  'foot:moose': {
    steps: [{ k: 'sweep', tex: 'foot', hitTex: 'crumb', size: 380, ms: 440, hop: 30, hops: 5, lean: 16, trail: 0xb08a5a }],
    sfx: [['sfx_minotaur_snort', 0, 0.8, 1.2], ['sfx_gallop', 80], ['sfx_minotaur_crash', 260, 0.8]],
  },
  // Gravity Well: space folds into a well in the middle of the table
  // Gravity Well: rings close in on every foot and the stars it pulls in drop onto it
  'foot:gravity': {
    steps: [{ k: 'rings', color: PURPLE, n: 3, implode: true }, { k: 'rain', tex: ['star', 'star5'], n: 12, size: 44, add: true, tint: [0xb06bff, 0xffffff], t: 120 }],
    sfx: [['sfx_cosmiccroc_blackhole'], ['sfx_cosmiccroc_holeclose', 380]],
    dim: 0.15,
  },
  // Comet Tail: the comet foot itself streaks down, burning, with smaller ones after it
  'foot:comet': {
    steps: [{ k: 'rain', tex: ['foot', 'p_meteor', 'p_meteor'], n: 6, size: 150, slant: 35, trail: ORANGE, splash: ORANGE }],
    sfx: [['sfx_cosmiccroc_meteor'], ['sfx_explosion', 170], ['sfx_fire', 220]],
  },
  'foot:rainy': {
    steps: [{ k: 'tint', color: 0x101830, alpha: 0.15, ms: 900 }, { k: 'rain', tex: ['afx_drop'], n: 50, size: 40, at: 'spread', slant: 10, ms: 700 }, { k: 'show', tex: 'foot', size: 320, from: 'top', ms: 600 }],
    sfx: [['sfx_thunder', 0, 0.6], ['sfx_smack_water_heavy', 160], ['sfx_smack_water_2', 300]],
  },
  // Hang Ten: a wave rolls in with the surfer riding its face
  'foot:surfsully': {
    steps: [{ k: 'flood', kind: 'water' }, { k: 'sweep', tex: 'foot', hitTex: 'afx_bubble', size: 300, ms: 640, lean: -14, ghosts: false }],
    sfx: [['sfx_kraken_splash'], ['sfx_hero_board', 100]],
  },
  // Downhill: the ski foot schusses down the table in a spray of snow
  'foot:skier': {
    steps: [{ k: 'sweep', tex: 'foot', hitTex: 'afx_flake', size: 320, ms: 520, lean: 20, trail: WHITE }, { k: 'rain', tex: ['afx_flake'], n: 16, size: 40, at: 'spread', t: 200 }],
    sfx: [['sfx_iceskate_snow'], ['sfx_whoosh', 100, 0.8, 0.9]],
  },
  'foot:titantoes': {
    steps: [{ k: 'tint', color: 0x1a1008, alpha: 0.15, ms: 500 }, { k: 'strike', tex: 'foot', size: 1.55, dust: 0xb08a5a }, { k: 'rain', tex: ['p_colossus_chunk'], n: 10, size: 70, at: 'spread', t: 200, spin: true, stay: true }],
    sfx: [['sfx_doomstomp_quake'], ['sfx_bigfoot_bigstep', 160], ['sfx_bigfoot_pound', 170]],
    weight: 1.6,
  },
  // Time Stop: Kronos's hourglass turns, the colour drains, the clock ring stops every foot
  'foot:kronos': {
    steps: [{ k: 'tint', color: 0x3a2a10, alpha: 0.15, ms: 800 }, { k: 'show', tex: 'p_nz_hourglass', size: 320, glow: 0xd9c27a, spin: 0.5, ms: 700 }, { k: 'rings', color: 0xd9c27a, n: 3, gap: 150 }],
    sfx: [['sfx_hero_timestone'], ['sfx_hades_tick', 170], ['sfx_hades_tick', 520, 0.8]],
  },

  // ——— pizzas ———
  // Meat Sweats: the meat feast spins in and its toppings pelt every foot
  'pizza:meat': {
    steps: [{ k: 'show', tex: 'pizza', size: 340, spin: 1, ms: 500 }, { k: 'rain', tex: ['t_meatball', 'pep', 't_anchovy'], n: 16, size: 70, spin: true, t: 60 }],
    sfx: [['sfx_tossheavy'], ['sfx_hitsplat', 170], ['sfx_smack_sauce_heavy', 230]],
  },
  'pizza:marinara': { steps: [{ k: 'flood', kind: 'part' }, { k: 'show', tex: 'pizza', size: 260, ms: 600 }], sfx: [['sfx_kraken_splash', 0, 1, 0.7], ['sfx_smack_sauce_heavy', 140]] },
  // Buffalo Stampede: pizzas thunder across the front lanes like a herd
  'pizza:buffalo': {
    steps: [{ k: 'sweep', tex: 'pizza', hitTex: 'pep', size: 220, ms: 480, spin: 3, hop: 20, hops: 6, n: 4, gap: 80, trail: ORANGE, ghosts: false }],
    sfx: [['sfx_gallop'], ['sfx_rollrumble', 80], ['sfx_hitthud', 220]],
  },
  'pizza:unicorn': {
    steps: [{ k: 'show', tex: 'afx_rainbow', size: 1500, from: 'below', ms: 700 }, { k: 'show', tex: 'pizza', size: 280, glow: PINK, spin: 1 }, { k: 'rain', tex: ['star'], n: 14, size: 50, add: true, tint: RAINBOW, t: 80 }],
    sfx: [['sfx_smack_tail_ultra'], ['sfx_hero_spring', 120, 0.7], ['sfx_coin', 260]],
  },
  // Rolled Up: a giant stromboli rolls over the front lanes
  'pizza:stromboli': {
    steps: [{ k: 'sweep', tex: 't_calzone', hitTex: 'cheese', size: 360, ms: 520, spin: 3, trail: GOLD }],
    sfx: [['sfx_rollrumble'], ['sfx_smack_dough_heavy', 180]],
  },
  'pizza:whitepie': {
    steps: [{ k: 'show', tex: 'pizza', size: 300, glow: WHITE }, { k: 'flood', kind: 'frost', t: 60 }],
    sfx: [['sfx_frostchill'], ['sfx_freeze', 160]],
  },
  // Flambé!: the pizza is lit and the table goes up in flames
  // Flambé!: the pizza at the edge, and the brandy goes up blue on the sides and on every foot
  'pizza:flambee': {
    steps: [{ k: 'show', tex: 'pizza', size: 300, glow: 0x6aa8ff }, { k: 'flood', kind: 'fire', tint: 0x7ab8ff, t: 60 }],
    sfx: [['sfx_hero_firedup'], ['sfx_fire', 160]],
  },
  // Olympian: the Greek pizza at the edge, olives raining on the feet, a laser of Mediterranean sun
  'pizza:greek': {
    steps: [{ k: 'show', tex: 'pizza', size: 280, glow: BLUE }, { k: 'rain', tex: ['t_olive'], n: 12, size: 60, spin: true, stay: true, splash: 0x6a8a30 }, { k: 'beam', kind: 'laser', color: 0xffe08a, t: 80 }],
    sfx: [['sfx_tossflick'], ['sfx_hittink', 170], ['sfx_zap', 200, 0.7]],
  },
  // Wood-Fired: the oven's mouth roars and embers rain
  // Wood-Fired: the oven door glows at the edge, logs tumble onto the feet, and embers rise off them
  'pizza:napoletana': {
    steps: [{ k: 'show', tex: 'pizza', size: 300, glow: ORANGE }, { k: 'rain', tex: ['afx_tree'], n: 6, size: 110, spin: true, stay: true, splash: 0xff9f1c, tint: [0x8a5a30] }, { k: 'rain', tex: ['flame'], n: 10, size: 46, up: true, add: true, t: 200 }],
    sfx: [['sfx_hero_hearth'], ['sfx_hitthud', 160], ['sfx_fire', 220]],
  },
  'pizza:bolognese': {
    steps: [{ k: 'rain', tex: ['t_meatball'], n: 8, size: 150, spin: true, stay: true, splash: RED }],
    sfx: [['sfx_tossheavy'], ['sfx_smack_sauce_heavy', 170], ['sfx_hitsplat', 240]],
  },
  'pizza:saffronlobster': {
    steps: [{ k: 'tint', color: 0x3a2a00, alpha: 0.15, ms: 700 }, { k: 'show', tex: 'pizza', size: 300, glow: GOLD, spin: 1 }, { k: 'rain', tex: ['flame', 'crumb2'], n: 24, size: 50, slant: 20, add: true, t: 80 }],
    sfx: [['sfx_hero_storm', 0, 0.8], ['sfx_fire', 160]],
  },
  // Denominazione: the pizza comes down on the table like a stamp of approval
  'pizza:napolidoc': {
    steps: [{ k: 'strike', tex: 'pizza', size: 1.2, dust: 0xf2dfb0 }, { k: 'rings', color: 0x3ddc97, n: 1, t: 170 }, { k: 'rings', color: WHITE, n: 1, t: 230 }, { k: 'rings', color: RED, n: 1, t: 290 }],
    sfx: [['sfx_soleprop_stamp', 150], ['sfx_bigfoot_pound', 170, 0.7]],
  },
  'pizza:century': {
    steps: [{ k: 'show', tex: 'pizza', size: 320, glow: GOLD, spin: 1 }, { k: 'rings', color: GOLD, n: 3, icons: 'star5', nIcons: 14, t: 120 }],
    sfx: [['sfx_levelup', 0, 0.8], ['sfx_crit', 170]],
  },
  'pizza:infernocalzone': {
    steps: [{ k: 'strike', tex: 't_calzone', size: 1.3, dust: ORANGE }, { k: 'flood', kind: 'fire', t: 150 }],
    sfx: [['sfx_tossheavy'], ['sfx_explosion', 170], ['sfx_fire', 200]],
    weight: 1.3,
  },
  // Lights Out: the lights go off, and a flash finds every foot in the dark
  // Lights Out: the room goes dark at the edges, and a torch finds every foot
  'pizza:nightshift': {
    steps: [{ k: 'vignette', alpha: 0.95, ms: 500 }, { k: 'beam', kind: 'light', color: 0xc8d8ff, w: 0.8, t: 60 }],
    sfx: [['sfx_click'], ['sfx_hero_nightfall', 60]],
  },
  // Fire and Ice: fire from one side, frost from the other
  'pizza:ragnarok': {
    steps: [{ k: 'flood', kind: 'frost' }, { k: 'flood', kind: 'fire', t: 80 }, { k: 'show', tex: 'pizza', size: 280, glow: ORANGE }],
    sfx: [['sfx_freeze'], ['sfx_fire', 80], ['sfx_explosion', 170, 0.7]],
  },
  // Feast of the Gods: the pizza in gold at the edge, gold lightning, laurel-gold rings round every foot
  'pizza:olympian': {
    steps: [{ k: 'show', tex: 'pizza', size: 300, glow: GOLD }, { k: 'beam', kind: 'bolt', color: GOLD }, { k: 'rings', color: GOLD, n: 2, icons: 'afx_heart', nIcons: 8, t: 100 }],
    sfx: [['sfx_zeus_bolt'], ['sfx_thunder', 120, 0.7], ['sfx_heal', 260, 0.7]],
  },
  // Time Out: the stopwatch clicks and the table freezes
  'pizza:tikka': {
    steps: [{ k: 'show', tex: 'p_watch', size: 280, glow: CYAN, ms: 600 }, { k: 'flood', kind: 'frost', t: 60 }, { k: 'rings', color: CYAN, n: 2, t: 100 }],
    sfx: [['sfx_hades_tick'], ['sfx_freeze', 150]],
  },
  // High Tide: the fritto at the edge, and the sea comes in off the pier over every foot
  'pizza:seasidefritto': {
    steps: [{ k: 'show', tex: 'pizza', size: 280, glow: CYAN }, { k: 'flood', kind: 'water', t: 60 }],
    sfx: [['sfx_kraken_splash'], ['sfx_smack_water_heavy', 170]],
  },
  // Shooting Stars: the calzone glows at the edge and stars streak down onto the feet
  'pizza:stargazer': {
    steps: [{ k: 'show', tex: 'pizza', size: 260, glow: 0xffe08a }, { k: 'rain', tex: ['star'], n: 12, size: 60, slant: 30, add: true, trail: GOLD, tint: [0xffe08a, 0xffffff, 0x9ab8ff], t: 80 }],
    sfx: [['sfx_smack_magic_1'], ['sfx_whoosh', 90, 0.7, 1.3], ['sfx_crit', 170]],
  },
  // Stone Skin: the granite pie comes down like a cathedral slab and stone dust rings every foot
  'pizza:granite': {
    steps: [{ k: 'strike', tex: 'pizza', size: 1.1, crack: true, dust: 0xb8b0a0 }, { k: 'rings', color: 0xcfc6b4, n: 2, icons: 'crumb2', nIcons: 10, iconTint: [0x9a9488, 0xcfc6b4], t: 170 }],
    sfx: [['sfx_gargoyle_stone', 0, 0.9], ['sfx_smack_stone_heavy', 170]],
  },
  // Saturday Night: the mirror ball drops in at the top and notes ring out over the dancing feet
  'pizza:discodiner': {
    steps: [{ k: 'show', tex: 'pk_disco', size: 200, from: 'top', glow: PINK, ms: 700 }, { k: 'rings', color: PINK, n: 2, icons: 'pk_note', nIcons: 10, iconTint: RAINBOW, t: 120 }],
    sfx: [['sfx_smack_tail_jukebox'], ['sfx_smack_tail_jukebox', 250, 0.8, 1.26], ['sfx_hitbonk', 170, 0.6]],
    emblem: 'pk_disco',
  },
  // Eruption: the pizza erupts like a volcano, lava falling on every foot
  'pizza:volcano': {
    steps: [{ k: 'show', tex: 'pizza', size: 360, from: 'below', glow: RED, wiggle: true }, { k: 'rain', tex: ['p_fireball', 'flame'], n: 14, size: 90, trail: ORANGE, splash: ORANGE, t: 80 }],
    sfx: [['sfx_titanking_lavaburst'], ['sfx_explosion', 170], ['sfx_fire', 220]],
    weight: 1.3,
  },
};

const ZOMBIE_SFX: Spec['sfx'][number] = ['sfx_poltergeist_groan', 0, 0.7];

/** A spec for an ability with no entry: from its element and what it does (so nothing is ever without one). */
function fallback(a: Ability): Spec {
  const all = a.fx.some((e) => 'at' in e && e.at.to === 'all');
  switch (a.vfx) {
    case 'fire':
      return { steps: [{ k: 'flood', kind: 'fire' }], sfx: [['sfx_fire']] };
    case 'frost':
      return { steps: [{ k: 'flood', kind: 'frost' }], sfx: [['sfx_freeze']] };
    case 'zap':
      return { steps: [{ k: 'beam', kind: 'bolt', color: a.color }], sfx: [['sfx_zap'], ['sfx_thunder', 80, 0.6]] };
    case 'rain':
      return { steps: [{ k: 'rain', tex: ['peel'], n: 10, size: 120, spin: true }], sfx: [['sfx_whoosh'], ['sfx_crit', 170]] };
    case 'wind':
      return { steps: [{ k: 'sweep', tex: 'peel', size: 420, trail: a.color }], sfx: [['sfx_whoosh', 0, 1, 0.8]] };
    case 'ink':
      return { steps: [{ k: 'flood', kind: 'ink' }], sfx: [['sfx_kraken_inked']] };
    case 'gold':
      return { steps: [{ k: 'show', tex: 'peel', size: 360, glow: GOLD }, { k: 'rings', color: GOLD, icons: 'coin' }], sfx: [['sfx_crit'], ['sfx_coin', 170]] };
    default:
      return all
        ? { steps: [{ k: 'strike', tex: 'peel', size: 1 }, { k: 'rings', color: a.color, n: 2 }], sfx: [['sfx_whoosh', 0, 1, 0.8], ['sfx_crit', 160]] }
        : { steps: [{ k: 'rings', color: a.color }], sfx: [['sfx_crit']] };
  }
}

const cache = new Map<string, Spec>();

/** The visual for an ability (by its id in ABILITIES). */
export function specFor(key: string, a: Ability): Spec {
  const hit = cache.get(key);
  if (hit) return hit;
  let s: Spec;
  if (key.startsWith('zombie:')) {
    // a zombified foot: its foot's move, zombified, and the foot clawing up out of the table first
    const base = S[`foot:${key.slice(7)}`] ?? fallback(a);
    s = { ...base, zombie: true, steps: [{ k: 'rise' }, ...base.steps], sfx: [ZOMBIE_SFX, ...base.sfx] };
  } else s = S[key] ?? fallback(a);
  cache.set(key, s);
  return s;
}

/** Dev: the meter abilities with a hand-written visual (the rest use the fallback). */
export const HAND_SPECS = Object.keys(S);
