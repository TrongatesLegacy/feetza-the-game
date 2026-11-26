// Audio: category volumes (master / music / sfx / ambience), music + ambience crossfades,
// lazy loading of the larger tracks, and SFX throttling/variation.

import Phaser from 'phaser';
import { crand } from './cosmeticRandom';
import manifest from 'virtual:audio-manifest';
import { onSettingsChange, save } from './save';
import { SMACK_TRIM } from './smackTrim';

type Cat = 'music' | 'ambience';

interface Track {
  key: string;
  sound: Phaser.Sound.BaseSound & { volume: number };
  target: number; // 0..1 relative gain inside the category
}

const AVAILABLE = new Set<string>(manifest);
// Small files loaded at boot; everything else streams in on demand.
// Boss move sounds (sfx_<boss>_<move>) load a wave ahead of their fight instead (see bossSfx).
// Peel smack sounds (sfx_smack_*) load lazily: only the families the cursor's look needs (src/game/smacks.ts).
export const BOOT_AUDIO = [...AVAILABLE].filter((k) => (k.startsWith('sfx_') && isCoreSfx(k) && !k.startsWith('sfx_smack_')) || k === 'music_menu' || k === 'music_gameover');

/** A peel's smack, resolved to files (src/game/smacks.ts). */
export interface SmackProfile {
  id: string;
  family: string;
  layerFamily: string | null;
  /** Alternating takes, and the heavy one for crits and big hits. */
  takes: string[];
  heavy: string;
  /** The peel's own pitch (1 = the family's). */
  rate: number;
  /** A second family under the first, quieter. */
  layer: { takes: string[]; heavy: string; vol: number } | null;
  /** A signature tail after the smack; `gap` is the least time between two on ordinary smacks. */
  tail: { key: string; gap: number; vol: number } | null;
  /** Every file it needs, to preload. */
  keys: string[];
}

/** The original sfx all have one-word names (sfx_slap_1 has a digit); boss move sounds are sfx_<boss>_<move>. */
function isCoreSfx(k: string): boolean {
  return !/^sfx_[a-z]+_[a-z]+$/.test(k) || k.startsWith('sfx_kit_');
}

/** A boss's move sounds, to preload before its fight. The Phantom King's echoes borrow other bosses' sounds. */
export function bossSfx(id: string): string[] {
  return [...AVAILABLE].filter((k) => !isCoreSfx(k) && !k.startsWith('sfx_hero_') && (id === 'phantomking' || k.startsWith(`sfx_${id}_`)));
}

/** Hero sounds (sfx_hero_*): a hero peel's moves (all of them, for a hero run), or just the sightings'. */
export function heroSfx(all: boolean): string[] {
  // sightings and Spider Socks turn up in any run
  const shared = ['sfx_hero_flyby', 'sfx_hero_glint', 'sfx_hero_saucer', 'sfx_hero_magic', 'sfx_hero_squeak', 'sfx_hero_catch', 'sfx_hero_secret', 'sfx_hero_web', 'sfx_hero_snip'];
  return [...AVAILABLE].filter((k) => (all ? k.startsWith('sfx_hero_') || k === 'music_tape' : shared.includes(k)));
}

// Per-file gain trims, calibrated from measured 50ms RMS peaks (see README "Audio mix") so each
// sound lands at an intentional level relative to the slap (reference ≈ -10.5 dB RMS peak).
const TRIM: Record<string, number> = {
  sfx_slap_1: 0.95, // -11.4 dB → ref
  sfx_slap_2: 0.71, // -8.9 dB → ref
  sfx_slap_3: 0.86, // -10.6 dB → ref
  sfx_crit: 0.97, // +2 dB over slaps: crits should pop
  sfx_squish: 1.0, // getting stomped must be unmistakable
  sfx_stomp: 0.9,
  sfx_ouch: 1.0,
  sfx_whoosh: 0.7, // frequent, sits behind
  sfx_coin: 0.7, // very frequent
  sfx_combo: 1.0,
  sfx_click: 1.4, // very quiet transient source
  sfx_hover: 0.6,
  sfx_zap: 1.2,
  sfx_fire: 0.6,
  sfx_freeze: 1.4,
  sfx_explosion: 0.75,
  sfx_boing: 0.9,
  sfx_heal: 0.85,
  sfx_shield: 1.4,
  sfx_upgrade: 1.0,
  sfx_levelup: 0.85,
  sfx_warning: 0.85,
  sfx_gameover: 1.0,
  // Feetza 2.0: "measured" dB is the file's 50ms RMS peak, "→" the level after this trim.
  sfx_miniboss: 1.05, // -8.4 dB → -8.0: alert must cut through the music, like a crit
  sfx_phase: 1.07, // -8.6 dB → -8.0: boss phase change, clearly over the music
  sfx_piston: 1.08, // -12.7 dB → -12.0: hazard cue, just under the slap
  sfx_chest: 1.4, // -15.4 dB → -12.5: transient-heavy source, lifted toward the slap
  sfx_drone: 0.97, // -11.7 dB → -12.0: a bit below the slap
  sfx_whistle: 0.59, // -6.4 dB → -11.0: piercing source, held just under the slap
  sfx_pop: 0.7, // -7.9 dB → -11.0: about slap level
  sfx_seagull: 0.6, // -7.0 dB → -11.4: a bit below the slap
  sfx_possess: 1.1, // -12.8 dB → -12.0
  sfx_stale: 0.92, // -10.3 dB → -11.0
  sfx_reheat: 1.04, // -12.3 dB → -12.0
  sfx_steal: 1.3, // -15.3 dB → -13.0: sneaky, sits behind
  sfx_hold: 0.92, // -23.8 dB → -24.5: quiet tick, about click level
  // Boss set-piece moves (sfx_<boss>_<move>) and the shared boss kit (sfx_kit_*). Each file is normalised to about
  // -12 dB or louder; the trim sets its final level: tells and hits near the slap (-10.5 to -11), signature hits a
  // little over it (-9.5), mashable or repeated hits under it (-13.5), and long beds/risers further under (-14.5).
  // shared boss kit
  sfx_kit_prophit: 1.28, // -14.2 dB → -12.1: hit-counter prop takes a hit
  sfx_kit_propclear: 1.1, // -11.3 dB → -10.5: prop cleared
  sfx_kit_shieldup: 1.05, // -11.4 dB → -11.0: boss shield goes up
  sfx_kit_shieldblock: 1.05, // -12.4 dB → -12.0: smack bounces off a boss shield
  sfx_kit_shielddown: 1.07, // -12.6 dB → -12.0: boss shield drops
  sfx_kit_lane: 1.05, // -12.5 dB → -12.1: boss takes over a lane
  sfx_kit_retreat: 1.1, // -12.8 dB → -12.0: feet scurry back ("STAND BACK!")
  // Head Waiter
  sfx_headwaiter_traytoss: 1.13, // -12.1 dB → -11.0: tray thrown, spinning
  sfx_headwaiter_traybat: 1.27, // -12.5 dB → -10.4: tray batted back
  sfx_headwaiter_trayclang: 1.17, // -11.8 dB → -10.4: tray crashes on a pizza
  sfx_headwaiter_service: 1.05, // -12.7 dB → -12.3: desk-bell double ding
  // Bigfoot
  sfx_bigfoot_ring: 1.05, // -12.4 dB → -12.0: QTE ring appears
  sfx_bigfoot_ringok: 1.05, // -11.4 dB → -11.0: good QTE click
  sfx_bigfoot_bigstep: 1.05, // -11.6 dB → -11.2: the big step lands
  sfx_bigfoot_trapbuild: 1.21, // -15.2 dB → -13.5: bear trap ratchets together
  sfx_bigfoot_trapsnap: 1.5, // -13.0 dB → -9.5: bear trap snaps shut
  sfx_bigfoot_pound: 1.07, // -10.1 dB → -9.5: ground pound crashes down
  sfx_bigfoot_rampage: 1.05, // -12.4 dB → -11.9: second Bigfoot arrives
  // Chimney Sweep
  sfx_sweep_brush: 1.09, // -12.7 dB → -12.0: chimney brush scrubbing (tell)
  sfx_sweep_soot: 1.06, // -12.9 dB → -12.4: soot column whoomph
  sfx_sweep_hop: 1.18, // -13.8 dB → -12.4: pops out of one chimney into another
  sfx_sweep_brick: 1.05, // -12.4 dB → -12.0: chimney brick laid (enraged)
  // Iron Heel
  sfx_ironheel_charge: 0.79, // -12.4 dB → -14.4: power-blast charge riser, sits under
  sfx_ironheel_launcher: 1.05, // -11.4 dB → -11.0: rocket launcher deploys
  sfx_ironheel_rocket: 1.05, // -10.9 dB → -10.5: rocket launches
  sfx_ironheel_blast: 1.08, // -10.2 dB → -9.5: power blast fires
  sfx_ironheel_vent: 1.03, // -11.3 dB → -11.0: armour vents open
  sfx_ironheel_hiss: 0.88, // -12.8 dB → -13.9: steam warning hiss, sits under
  sfx_ironheel_steam: 1.07, // -11.2 dB → -10.6: steam burst
  sfx_ironheel_press: 1.18, // -11.9 dB → -10.5: hydraulic press stamps
  sfx_ironheel_valve: 1.05, // -11.4 dB → -11.0: valve wheel locks
  // Sandcastle Sam
  sfx_sandcastle_shovel: 1.13, // -12.0 dB → -10.9: shovel scrape (tell)
  sfx_sandcastle_walls: 1.05, // -10.0 dB → -9.6: sand walls rise
  sfx_sandcastle_pour: 1.09, // -12.4 dB → -11.6: sand pour
  sfx_sandcastle_sandland: 1.09, // -11.7 dB → -11.0: wet sand lands on a pizza
  // King Honk
  sfx_clownking_honkwind: 1.05, // -11.2 dB → -10.8: bulb-horn squeeze wind-up
  sfx_clownking_honk: 1.04, // -8.7 dB → -8.4: clown horn blast
  sfx_clownking_leap: 1.05, // -9.7 dB → -9.2: slide-whistle leap away
  sfx_clownking_decoydrop: 1.05, // -11.6 dB → -11.1: slide-whistle drop
  sfx_clownking_pie: 1.06, // -12.8 dB → -12.3: wobbly pie throw
  sfx_clownking_piesplat: 1.1, // -10.3 dB → -9.5: big cream-pie splat
  // Short-Order Shoe
  sfx_shortorder_bell: 1.1, // -11.4 dB → -10.6: order bell ding
  sfx_shortorder_grab: 1.09, // -11.7 dB → -11.0: grabbing hand lunges in
  sfx_shortorder_togo: 1.11, // -11.9 dB → -11.0: hand snatches a slice
  sfx_shortorder_rush: 1.05, // -10.8 dB → -10.4: rush-hour triple bell and ticket chatter
  // T-Rex Toes
  sfx_trex_dinosqueak: 1.05, // -12.9 dB → -12.5: baby dino squeak
  sfx_trex_dinorun: 1.07, // -14.1 dB → -13.5: baby dino pitter-patter
  sfx_trex_growl: 1.05, // -11.5 dB → -11.0: snack-time growl (tell)
  sfx_trex_snack: 1.08, // -11.2 dB → -10.5: jaws snap on a foot
  sfx_trex_breath: 0.91, // -11.5 dB → -12.4: deep breath in (tell)
  sfx_trex_roar: 1.05, // -9.2 dB → -8.8: the roar
  // Ice Skate Ivy
  sfx_iceskate_snow: 1.02, // -12.5 dB → -12.3: snow cloud gust (tell)
  sfx_iceskate_freeze: 1.28, // -12.6 dB → -10.5: lane freezes over
  sfx_iceskate_frostbite: 1.12, // -12.0 dB → -11.0: peel stung in the snow
  sfx_iceskate_axel: 1.09, // -11.7 dB → -10.9: triple skate swish
  // The Colossus
  sfx_colossus_clang: 1.13, // -14.6 dB → -13.5: small hit chips the shell
  sfx_colossus_crack: 1.13, // -11.6 dB → -10.5: armour cracks
  sfx_colossus_shatter: 1.11, // -10.4 dB → -9.5: shell shatters
  sfx_colossus_glint: 1.12, // -12.0 dB → -11.0: sword glint (tell)
  sfx_colossus_parry: 1.14, // -11.7 dB → -10.6: parry clash
  sfx_colossus_smith: 1.19, // -13.5 dB → -12.0: blacksmith taps the anvil (tell)
  sfx_colossus_anvil: 1.4, // -13.4 dB → -10.5: plate hammered back on
  // UFO Toe
  sfx_ufotoe_beam: 1.06, // -12.5 dB → -12.0: tractor beam hum
  sfx_ufotoe_beambreak: 1.05, // -11.4 dB → -11.0: beam broken
  sfx_ufotoe_abduct: 1.05, // -11.4 dB → -11.0: slice beamed up
  sfx_ufotoe_twin: 1.05, // -11.5 dB → -11.1: second saucer warbles in
  // Cosmic Croc
  sfx_cosmiccroc_meteor: 1.06, // -12.8 dB → -12.3: meteor falling whistle
  sfx_cosmiccroc_impact: 1.11, // -11.4 dB → -10.5: meteor impact
  sfx_cosmiccroc_flip: 1.03, // -11.3 dB → -11.0: gravity warp
  sfx_cosmiccroc_blackhole: 1.02, // -11.2 dB → -11.0: black hole opens
  sfx_cosmiccroc_holeclose: 0.95, // -10.5 dB → -10.9: black hole implodes
  // Dough Boy
  sfx_doughboy_ball: 1.05, // -12.5 dB → -12.1: dough ball blorps out
  sfx_doughboy_splat: 1.05, // -11.4 dB → -11.0: dough splat
  sfx_doughboy_rise: 0.77, // -13.0 dB → -15.3: yeasty bubbling rise, sits under
  // Nonna's Slipper
  sfx_nonna_pin: 1.05, // -14.4 dB → -14.0: rolling pin rumble
  sfx_nonna_pinsmash: 1.1, // -10.3 dB → -9.5: rolling pin crashes into the pizzas
  sfx_nonna_slippers: 1.13, // -13.1 dB → -12.0: slippers flap (tell)
  sfx_nonna_slipper: 1.05, // -10.9 dB → -10.5: slipper thwack
  sfx_nonna_spoon: 1.1, // -11.8 dB → -11.0: wooden spoon swings and grabs
  sfx_nonna_tug: 1.04, // -13.8 dB → -13.5: tug-of-war creak, sits under
  // The Pigeon King
  sfx_pigeonking_coo: 1.05, // -11.7 dB → -11.2: pigeon coo
  sfx_pigeonking_splat: 1.08, // -11.6 dB → -10.9: bird bomb splat
  sfx_pigeonking_flock: 1.05, // -11.4 dB → -11.0: flock flutters in
  // The Gargoyle
  sfx_gargoyle_swoop: 1.02, // -12.8 dB → -12.6: stony wing swoop
  sfx_gargoyle_stone: 1.1, // -10.7 dB → -9.9: turns to stone (grind)
  sfx_gargoyle_stonecrack: 0.89, // -12.4 dB → -13.4: stone cracks under a smack
  sfx_gargoyle_stonebreak: 1.05, // -10.0 dB → -9.6: stone crumbles
  sfx_gargoyle_storm: 1.05, // -11.1 dB → -10.7: mini-gargoyle screech chorus
  // Jellyfish Flip-Flop
  sfx_jellyfish_charge: 1.27, // -14.1 dB → -12.0: jelly charge hum
  sfx_jellyfish_sting: 1.05, // -10.9 dB → -10.5: jelly zap on the peel
  sfx_jellyfish_bright: 1.06, // -11.5 dB → -11.0: bright-glow crackle
  // Kraken Toes
  sfx_kraken_splash: 1.1, // -12.8 dB → -12.0: water splash
  sfx_kraken_tentacle: 1.05, // -11.4 dB → -11.0: tentacle squelches up
  sfx_kraken_drag: 1.06, // -12.4 dB → -11.9: dragged under, gurgling
  sfx_kraken_squirt: 1.13, // -12.1 dB → -11.0: ink squirt
  sfx_kraken_inked: 1.05, // -11.5 dB → -11.1: ink splats on a pizza
  // Milkshake Max
  sfx_milkshake_freeze: 1.05, // -11.5 dB → -11.1: brain-freeze chime (tell)
  sfx_milkshake_frozen: 1.12, // -11.5 dB → -10.5: brain freeze lands on the peel
  sfx_milkshake_straw: 1.05, // -12.4 dB → -12.0: straw plonks in
  sfx_milkshake_slurp: 0.89, // -11.4 dB → -12.4: slurp, sits under
  sfx_milkshake_snap: 1.33, // -13.0 dB → -10.5: straw snaps
  // Queen of the Rink
  sfx_rinkqueen_puck: 1.17, // -11.9 dB → -10.5: slapshot
  sfx_rinkqueen_roll: 1.01, // -12.6 dB → -12.5: pizzas glide across the ice
  sfx_rinkqueen_dash: 1.22, // -12.3 dB → -10.6: speed-dash swish and ice spray
  // The Lumberjack
  sfx_lumberjack_timber: 1.05, // -11.4 dB → -11.0: tree creak and crack (tell)
  sfx_lumberjack_chainsaw: 1.05, // -13.3 dB → -12.8: chainsaw revs
  sfx_lumberjack_sawbite: 1.1, // -11.3 dB → -10.5: chainsaw bites a pizza
  sfx_lumberjack_axe: 1.05, // -11.0 dB → -10.6: spinning axe
  sfx_lumberjack_thunk: 1.21, // -12.2 dB → -10.5: axe thunks into the table
  // The Yeti Ski Boot
  sfx_yeti_icicle: 1.11, // -12.9 dB → -12.0: icicle forms and cracks loose
  sfx_yeti_iciclehit: 1.3, // -12.8 dB → -10.5: icicle shatters on a pizza
  sfx_yeti_snowball: 1.09, // -12.7 dB → -12.0: snowball packed and thrown
  sfx_yeti_avalanche: 1.08, // -12.6 dB → -11.9: avalanche rumble (tell)
  sfx_yeti_bigball: 1.08, // -11.7 dB → -11.0: big snowball lands
  // The Zombie Loafer
  sfx_poltergeist_groan: 1.05, // -9.7 dB → -9.2: zombie groan (tell)
  sfx_poltergeist_bite: 1.33, // -13.0 dB → -10.5: zombie bite
  sfx_poltergeist_cough: 1.21, // -12.0 dB → -10.4: coughing fit
  sfx_poltergeist_sick: 1.05, // -12.6 dB → -12.1: pizza turns zombie
  sfx_poltergeist_munch: 1.11, // -12.9 dB → -12.0: zombie pizza munches a slice
  sfx_poltergeist_infect: 1.45, // -15.7 dB → -12.4: the bite's infection spreads over a foot
  sfx_poltergeist_turn: 0.93, // -10.4 dB → -11.0: the bitten foot groans as it turns zombie
  sfx_poltergeist_flies: 1.0, // -16.2 dB: flies find a zombie foot (sits behind)
  // Zombie Outbreak (the Zombie Toes peel and the zombie:* peels: src/game/zombiePeel.ts)
  sfx_zpeel_blast: 1.23, // -11.8 dB → -10.0: a friendly zombie bursts (a screen-level moment)
  sfx_zpeel_splat: 1.75, // -16.4 dB → -11.5: its gore lands
  sfx_poltergeist_roar: 0.95, // -9.6 dB → -10.0: a bitten foot bursts into a second Zombie Loafer (a screen-level moment)
  // Phantom King
  sfx_phantomking_fade: 1.04, // -12.4 dB → -12.1: ghostly fade
  sfx_phantomking_echo: 1.06, // -12.3 dB → -11.8: ghostly echo appears
  sfx_phantomking_stir: 1.07, // -12.6 dB → -12.0: curse stirs (tell)
  sfx_phantomking_curse: 1.09, // -11.7 dB → -11.0: curse jumps pizzas
  sfx_phantomking_exorcise: 1.05, // -10.9 dB → -10.5: exorcism chime
  // Thrown props (src/game/projectiles.ts; made by scripts/throw-sfx/). Launches fire often, so they sit well under
  // the slap (-14.5); impacts just under it (-12.5); the explosion near it (-11).
  sfx_tosssoft: 0.79, // -12.4 dB → -14.5: soft prop leaves the peel
  sfx_tossflick: 0.81, // -12.7 dB → -14.5: small prop flicked
  sfx_tossspin: 0.84, // -13.0 dB → -14.5: spinning disc thrown
  sfx_tossheavy: 0.78, // -12.9 dB → -15.0: heavy prop heaved
  sfx_tossrope: 0.82, // -13.2 dB → -14.9: ring or lasso swung
  sfx_hitsplat: 1.06, // -14.9 dB → -14.4: soft prop splats
  sfx_hittink: 1.22, // -14.2 dB → -12.5: small hard prop ticks off
  sfx_hitcoin: 0.99, // -12.4 dB → -12.5: coin bonk
  sfx_hitclang: 1.15, // -13.7 dB → -12.5: plate, can or board clangs
  sfx_hitbonk: 1.0, // -13.2 dB → -13.2: rubbery bonk
  sfx_hitthud: 0.99, // -12.4 dB → -12.5: heavy prop lands
  sfx_hitboom: 1.05, // -11.5 dB → -11.0: cannonball or grenade explodes
  sfx_hitrope: 1.02, // -12.7 dB → -12.5: rope snaps tight
  sfx_hitsqueak: 0.99, // -12.7 dB → -12.8: rubber duck squeak
  sfx_hitrattle: 1.26, // -14.5 dB → -12.5: rattle shakes
  sfx_rollrumble: 0.99, // -13.4 dB → -13.4: ball rolls along a lane
  sfx_beam: 1.0, // -12.5 dB → -12.5: beam fires
  // ——— Act 7 · Comics (scripts/act7-audio): the act's weather and villain feet, then each boss's moves ———
  sfx_thunder: 1.05, // -12.7 dB → -12.3: Act 7 weather: thunder after a lightning flash
  sfx_jetpack: 1.09, // -12.3 dB → -11.5: Jetpack Jackboots fly in from the side
  sfx_bombfuse: 1.31, // -14.6 dB → -12.2: Goon Galoshes light a fuse (tell); also a defused bomb
  sfx_bombboom: 1.05, // -11.6 dB → -11.2: a Goon's bomb lands on a pizza
  sfx_gang: 1.05, // -12.0 dB → -11.5: a gang of Henchman Spats arrives
  sfx_lexlugtoe_cash: 1.05, // -12.1 dB → -11.7: HOSTILE TAKEOVER: a pizza is acquired (SOLD!), cash register
  sfx_lexlugtoe_glass: 1.26, // -14.0 dB → -12.0: the glass case drops over the pizza
  sfx_lexlugtoe_lock: 0.88, // -12.4 dB → -13.5: smack on the case's lock
  sfx_lexlugtoe_shatter: 1.26, // -12.5 dB → -10.5: the case breaks open (and his death)
  sfx_lexlugtoe_tags: 1.06, // -12.5 dB → -12.0: his entrance: price tags and coins flutter in
  sfx_doomstomp_roar: 2.02, // -15.8 dB → -9.7: RAMPAGE tell: he roars and paws the table
  sfx_doomstomp_stomp: 1.05, // -11.3 dB → -10.8: each RAMPAGE stomp lands on a pizza (and his entrance)
  sfx_doomstomp_quake: 1.08, // -12.6 dB → -11.9: BONE QUAKE tell: the table shudders
  sfx_doomstomp_spike: 1.07, // -12.5 dB → -11.9: a bone spike bursts up behind a pizza
  sfx_doomstomp_bonebreak: 0.89, // -12.5 dB → -13.5: smack on a bone spike (it snaps on the last)
  sfx_doomstomp_ko: 1.05, // -11.3 dB → -10.9: he's knocked out (a life lost) and his death
  sfx_doomstomp_rise: 1.63, // -14.9 dB → -10.7: he gets back up, bigger
  sfx_doomstomp_dazed: 1.05, // -12.8 dB → -12.3: LAST LIFE: he slumps, dazed (finish him)
  sfx_ultoe_upload: 0.79, // -12.4 dB → -14.4: UPLOAD tell: the UPLOADING bar fills
  sfx_ultoe_glitch: 1.05, // -10.9 dB → -10.5: he jumps bodies: every drone glitches
  sfx_ultoe_boot: 0.89, // -12.5 dB → -13.5: a drone boots up (and his entrance)
  sfx_ultoe_crash: 1.10, // -10.4 dB → -9.6: his death: every drone powers down
  sfx_thanfoot_stone: 1.06, // -12.5 dB → -12.0: a stone streaks across the sky towards the sock (tell)
  sfx_thanfoot_socket: 1.05, // -11.4 dB → -11.0: a stone clicks into the sock
  sfx_thanfoot_stonehit: 0.93, // -12.9 dB → -13.5: smack on a stone in the sock
  sfx_thanfoot_stoneout: 1.11, // -11.4 dB → -10.5: a stone is knocked out of the sock
  sfx_thanfoot_snapwind: 1.10, // -15.3 dB → -14.5: THE SNAP winds up (all six stones in)
  sfx_thanfoot_snap: 1.05, // -10.4 dB → -10.0: THE SNAP lands (and his death)
  sfx_thanfoot_portal: 1.06, // -12.5 dB → -12.0: his entrance and the SPACE stone's blinks
  sfx_thanfoot_power: 1.04, // -12.4 dB → -12.1: a stone power fires (POWER, REALITY, TIME)
  // ——— Act 8 · Norse ———
  // Boss moves (sfx_<boss>_<move>, loaded a wave ahead of each fight) and the Norse feet (core sounds). Same
  // targets as the other boss sounds: tells and hits -10.5 to -11, signature hits -9.5, repeated ones -13.5.
  // Fenrir's Paw
  sfx_fenrir_strain: 0.98, // -13.4 dB → -13.6: chain creaks under strain (each smack)
  sfx_fenrir_snap: 1.12, // -10.5 dB → -9.5: Gleipnir snaps
  sfx_fenrir_howl: 1.02, // -9.7 dB → -9.5: wolf howl (entrance, loose)
  sfx_fenrir_pounce: 0.98, // -10.3 dB → -10.5: paw pounces on a pizza
  sfx_fenrir_claw: 1.08, // -12.6 dB → -11.9: frost claw swipe
  sfx_fenrir_link: 1.06, // -12.5 dB → -12.0: a fallen chain link is smacked
  sfx_fenrir_bind: 1.15, // -10.7 dB → -9.5: the chain re-forms
  sfx_fenrir_death: 1.05, // -10.3 dB → -9.8: whimpering howl (death)
  // Thrym the Frost King
  sfx_thrym_enter: 1.14, // -10.7 dB → -9.6: ice cracks and a giant rumble (entrance)
  sfx_thrym_freeze: 1.11, // -11.4 dB → -10.5: a pizza freezes solid
  sfx_thrym_thaw: 1.12, // -11.4 dB → -10.4: ice shell smashed off a pizza
  sfx_thrym_block: 1.12, // -12.0 dB → -11.0: an ice block forms
  sfx_thrym_crack: 0.93, // -12.9 dB → -13.5: ice block takes a hit
  sfx_thrym_shatter: 1.1, // -11.3 dB → -10.5: ice block broken
  sfx_thrym_close: 1.05, // -9.9 dB → -9.5: the fortress walls meet
  sfx_thrym_keystone: 1.05, // -12.4 dB → -12.0: keystone takes a hit
  sfx_thrym_blizzard: 1.1, // -10.9 dB → -10.1: blizzard gust
  sfx_thrym_hail: 1.05, // -12.4 dB → -12.0: falling ice shard
  sfx_thrym_spread: 0.88, // -13.0 dB → -14.1: ice creeps to the next pizza
  sfx_thrym_death: 1.08, // -10.1 dB → -9.4: huge shatter and collapse (death)
  // Jörmungandr
  sfx_jormungandr_enter: 1.13, // -10.5 dB → -9.4: deep sea surge (entrance)
  sfx_jormungandr_surface: 1.08, // -11.3 dB → -10.6: the head rises from the water
  sfx_jormungandr_hiss: 1.14, // -11.7 dB → -10.6: serpent hiss (tell)
  sfx_jormungandr_bite: 1.17, // -11.9 dB → -10.5: snapping lunge
  sfx_jormungandr_reflect: 1.07, // -11.1 dB → -10.5: a smack bounces off the coils
  sfx_jormungandr_constrict: 1.11, // -12.9 dB → -12.0: coils squeeze a pizza
  sfx_jormungandr_venom: 1.1, // -12.9 dB → -12.1: venom spit
  sfx_jormungandr_dive: 1.06, // -12.5 dB → -12.0: the head dives back under
  sfx_jormungandr_death: 1.05, // -9.9 dB → -9.5: fading roar and huge splash (death)
  // Surtr
  sfx_surtr_enter: 1.07, // -10.1 dB → -9.5: fire giant roar and fire whoosh (entrance)
  sfx_surtr_fireball: 1.05, // -12.4 dB → -12.0: fireball launched
  sfx_surtr_impact: 1.05, // -10.9 dB → -10.5: fireball lands
  sfx_surtr_ignite: 1.06, // -11.0 dB → -10.5: a pizza bursts into flame
  sfx_surtr_douse: 1.1, // -12.8 dB → -12.0: flames smacked out
  sfx_surtr_fuse: 0.89, // -11.1 dB → -12.1: fire runs along the bridge
  sfx_surtr_raise: 1.07, // -10.7 dB → -10.1: sword raised (riser, tell)
  sfx_surtr_window: 1.09, // -11.3 dB → -10.6: the sword flashes: the timing window
  sfx_surtr_sweep: 1.1, // -10.3 dB → -9.5: flaming sword sweeps the table
  sfx_surtr_parry: 1.04, // -9.9 dB → -9.6: perfect counter: the sweep is cancelled
  sfx_surtr_roar: 1.05, // -10.3 dB → -9.8: giant roar
  sfx_surtr_death: 1.08, // -10.2 dB → -9.5: collapse as the fire dies (death)
  // Norse feet
  sfx_frostchill: 0.88, // -13.2 dB → -14.3: frost creeps over a pizza
  sfx_trollstone: 1.05, // -10.9 dB → -10.5: a troll turns to stone
  sfx_draugrrise: 1.05, // -11.4 dB → -11.0: the dead rise again
  sfx_valkyrieswoop: 1.21, // -13.6 dB → -11.9: a pair of clogs swoops in
  sfx_sungap: 1.13, // -12.1 dB → -11.0: the clouds part
  // Act 8, new Jotunheim feet (scripts/act8-sfx/recipes_act8a.py): arrivals and trait moments as tells, hurt
  // sounds low (they play on many smacks), deaths at the slap.
  sfx_wolfpupyip: 1.05, // -11.7 dB → -11.2: the litter yips as it arrives
  sfx_wolfpuphurt: 0.89, // -12.5 dB → -13.5: a pup yelps when smacked
  sfx_wolfpupdie: 1.05, // -12.4 dB → -12.0: a yelp falling to a whine (defeated)
  sfx_berserkerspawn: 1.09, // -11.7 dB → -11.0: a war cry as it arrives
  sfx_berserkerhurt: 0.89, // -12.5 dB → -13.5: a grunt when smacked
  sfx_berserkerrage: 1.1, // -10.4 dB → -9.6: its berserk roar and war drums (it enrages)
  sfx_berserkerdie: 1.05, // -10.9 dB → -10.5: a dying groan and a heavy fall (defeated)
  sfx_shieldmaidenspawn: 1.06, // -11.5 dB → -11.0: a shield bang, mail and a battle shout as it arrives
  sfx_shieldmaidenparry: 1.13, // -10.6 dB → -9.5: the shield boss rings as it turns a smack aside
  sfx_shieldmaidenhurt: 0.88, // -12.4 dB → -13.5: a grunt and a rattle of mail when smacked
  sfx_shieldmaidendie: 1.07, // -11.1 dB → -10.5: a gasp, armour and her shield falling (defeated)
  // Act 8, new Bifröst feet (scripts/act8-sfx/recipes_act8b.py): arrivals and trait moments as tells, hurt
  // sounds low (they play on many smacks), deaths at the slap.
  sfx_ravencaw: 1.05, // -11.4 dB → -11.0: two harsh caws and a beat of wings as it swoops in
  sfx_ravensteal: 1.06, // -11.5 dB → -11.0: a gloating caw over the clink of stolen coin (it swipes your tips)
  sfx_ravenhurt: 0.88, // -12.4 dB → -13.5: a squawk when smacked
  sfx_ravendie: 1.06, // -11.0 dB → -10.5: a caw falling away and a flurry of wings (defeated)
  sfx_skaldsong: 1.05, // -11.0 dB → -10.6: a lyre strum and a sung saga phrase as he arrives
  sfx_skaldrally: 1.04, // -12.3 dB → -11.9: a lyre run and a sung shout as he rallies the feet round him
  sfx_skaldhurt: 0.82, // -11.8 dB → -13.5: a grunt and a jangled string when smacked
  sfx_skalddie: 1.05, // -11.0 dB → -10.6: a string snapping and a last sung note falling away (defeated)
  sfx_dwarfspawn: 1.05, // -11.4 dB → -11.0: an anvil ring, a stamp and a shout as it arrives
  sfx_dwarfhurt: 0.91, // -12.7 dB → -13.5: an iron clank and a grunt when smacked
  sfx_dwarfblock: 1.1, // -12.8 dB → -12.0: the rune-iron shield rings like an anvil as it blocks a smack
  sfx_dwarfbreak: 1.18, // -10.9 dB → -9.5: the rune-iron shield splits and its rune goes out
  sfx_dwarfdie: 1.05, // -10.9 dB → -10.5: a groan, falling armour and a dying anvil ring (defeated)
  sfx_muspelspawn: 1.05, // -11.4 dB → -11.0: a roar of flame and a fire giant's growl as it arrives
  sfx_muspelhurt: 0.88, // -12.4 dB → -13.5: cinder cracking and a hiss when smacked
  sfx_muspelscorch: 1.05, // -12.3 dB → -11.9: flames burst up off the pizza it stomped (its scorch)
  sfx_muspeldie: 1.05, // -10.9 dB → -10.5: a dying roar, the fire guttering out and a hiss of steam (defeated)
  // ——— god peels and their feet (generated by scripts/god-sfx/integrate.py) ———
  sfx_hero_zeus: 1.10, // -11.0 dB → -10.1
  sfx_hero_decree: 1.10, // -10.3 dB → -9.5
  sfx_hero_earthshaker: 1.05, // -11.2 dB → -10.8
  sfx_hero_harvest: 1.08, // -11.1 dB → -10.5
  sfx_hero_aegis: 1.09, // -10.7 dB → -10.0
  sfx_hero_chariot: 1.10, // -11.3 dB → -10.5
  sfx_hero_moon: 1.10, // -11.4 dB → -10.5
  sfx_hero_warcry: 1.08, // -10.2 dB → -9.5
  sfx_hero_charm: 1.11, // -10.7 dB → -9.8
  sfx_hero_forge: 1.10, // -11.7 dB → -10.8
  sfx_hero_spark: 0.89, // -13.9 dB → -14.9
  sfx_hero_messenger: 1.12, // -10.6 dB → -9.6
  sfx_hero_dart: 0.90, // -12.6 dB → -13.5
  sfx_hero_revel: 1.06, // -12.3 dB → -11.8
  sfx_hero_hearth: 1.05, // -10.7 dB → -10.2
  sfx_hero_underworld: 1.07, // -10.1 dB → -9.5
  sfx_hero_spring: 1.08, // -10.7 dB → -10.1
  sfx_hero_wings: 1.06, // -11.1 dB → -10.6
  sfx_hero_nightfall: 1.10, // -10.4 dB → -9.5
  sfx_hero_spartaaa: 1.04, // -9.4 dB → -9.0 (King Leonidas's THIS IS SPARTA! now)
  sfx_hero_spartanrage: 1.11, // -10.4 dB → -9.5: real recordings (scripts/real-sfx/build.py)
  sfx_hero_rage: 0.79, // -11.5 dB → -13.6
  sfx_hero_flamesmack: 0.88, // -12.9 dB → -14.0
  sfx_hero_ragehiss: 1.04, // -13.7 dB → -13.4
  sfx_hero_blade: 0.87, // -12.7 dB → -13.9
  sfx_hero_allfather: 1.14, // -10.7 dB → -9.5
  sfx_hero_thundergod: 1.11, // -11.2 dB → -10.3
  sfx_hero_mjolnir: 0.94, // -11.6 dB → -12.1
  sfx_hero_mischief: 1.09, // -9.9 dB → -9.1
  sfx_hero_foresight: 1.06, // -11.0 dB → -10.5
  sfx_hero_falcon: 1.06, // -11.5 dB → -11.0
  sfx_hero_boar: 1.06, // -9.4 dB → -8.8
  sfx_hero_oath: 1.05, // -9.9 dB → -9.5
  sfx_hero_gjallarhorn: 1.11, // -9.8 dB → -8.9
  sfx_hero_radiance: 1.11, // -11.4 dB → -10.5
  sfx_hero_halfdeath: 1.04, // -10.2 dB → -9.8
  sfx_hero_seawind: 1.06, // -10.2 dB → -9.7
  sfx_hero_winterhunt: 1.07, // -10.4 dB → -9.8
  sfx_hero_freeze: 0.90, // -14.3 dB → -15.2
  sfx_hero_apples: 1.07, // -11.1 dB → -10.5
  sfx_hero_saga: 1.09, // -10.6 dB → -9.8
  sfx_hero_verse: 0.89, // -13.1 dB → -14.1
  sfx_divinefeast: 1.11, // -10.4 dB → -9.5
  sfx_godreveal: 1.13, // -10.6 dB → -9.5
  sfx_trumpet: 1.31, // -13.0 dB → -10.6
  sfx_spartanroar: 1.06, // -11.9 dB → -11.3
  sfx_bronzeshield: 0.89, // -13.9 dB → -14.9
  // guard feet's shields (src/game/guardShield.ts)
  sfx_guardwarn: 1.0, // -13.3 dB: the rising tick before it drops, sits under
  sfx_guarddrop: 0.84, // -10.6 dB → -12.1: frequent
  sfx_guardraise: 1.08, // -11.7 dB → -11.0: the clank as it snaps back up
  sfx_guardcrack: 1.24, // -12.9 dB → -11.0: a blocked smack cracks it
  sfx_guardshatter: 1.15, // -10.7 dB → -9.5: it breaks
  // the waiters' silver trays (Waiter Walt, the Head Waiter, the delivery waiters)
  sfx_traydent: 1.33, // -13.5 dB → -11.0: a blocked smack dents the tray, ringing
  sfx_trayknock: 1.24, // -11.4 dB → -9.5: the tray is knocked off whole
  sfx_trayclatter: 1.45, // -14.2 dB → -11.0: a tray clatters down on the table
  // ——— the Persian army (generated by scripts/persian-sfx/integrate.py) ———
  sfx_immortalreturn: 1.05, // -12.4 dB → -12.0
  sfx_immortalfall: 0.89, // -11.7 dB → -12.7
  sfx_bowdraw: 0.95, // -12.7 dB → -13.1
  sfx_arrowloose: 0.92, // -13.1 dB → -13.8
  sfx_arrowthunk: 1.05, // -13.1 dB → -12.7
  sfx_gallop: 1.04, // -11.5 dB → -11.2
  sfx_neigh: 1.05, // -12.4 dB → -12.0
  sfx_chariotrev: 1.00, // -12.0 dB → -12.0
  sfx_chariotroll: 1.06, // -14.1 dB → -13.6
  sfx_chariotchip: 0.89, // -14.0 dB → -15.1
  sfx_hubbreak: 1.06, // -12.4 dB → -11.9
  sfx_satrapbuff: 0.89, // -12.5 dB → -13.5
  sfx_warhorn: 1.06, // -10.4 dB → -9.9
  // ——— hero peels (generated by scripts/hero-sfx/integrate.py) ———
  sfx_hero_end: 0.89, // -12.5 dB → -13.5
  sfx_hero_nightfalls: 1.06, // -11.0 dB → -10.5
  sfx_hero_speedforce: 1.05, // -10.9 dB → -10.5
  sfx_hero_suitup: 1.05, // -10.9 dB → -10.5
  sfx_hero_berserker: 1.08, // -11.2 dB → -10.5
  sfx_hero_giant: 1.05, // -10.9 dB → -10.5
  sfx_hero_radar: 1.05, // -10.9 dB → -10.5
  sfx_hero_tapeclick: 1.09, // -11.3 dB → -10.5
  sfx_hero_binary: 1.1, // -11.3 dB → -10.5
  sfx_hero_shazamozza: 1.05, // -10.0 dB → -9.5
  sfx_hero_sidekick: 1.05, // -10.9 dB → -10.5
  sfx_hero_heist: 1.05, // -11.0 dB → -10.5
  sfx_hero_shift: 1.05, // -10.9 dB → -10.5
  sfx_hero_stretch: 1.04, // -10.9 dB → -10.5
  sfx_hero_scarab: 1.12, // -11.4 dB → -10.5
  sfx_hero_overload: 1.05, // -10.9 dB → -10.5
  sfx_hero_escrima: 1.23, // -12.3 dB → -10.5
  sfx_hero_firedup: 1.06, // -10.0 dB → -9.5
  sfx_hero_bulk: 1.05, // -9.9 dB → -9.5
  sfx_hero_heatvision: 1.11, // -10.4 dB → -9.5
  sfx_hero_lasso: 1.05, // -12.4 dB → -12.0
  sfx_hero_calldeep: 1.06, // -11.0 dB → -10.5
  sfx_hero_bite: 0.87, // -12.3 dB → -13.5
  sfx_hero_construct: 1.09, // -10.2 dB → -9.5
  sfx_hero_sweep: 1.06, // -12.5 dB → -12.0
  sfx_hero_webceiling: 1.26, // -12.5 dB → -10.5
  sfx_hero_web: 0.87, // -12.3 dB → -13.5
  sfx_hero_repulsor: 0.88, // -12.4 dB → -13.5
  sfx_hero_unibeam: 1.12, // -10.5 dB → -9.5
  sfx_hero_shield: 1.07, // -12.6 dB → -12.0
  sfx_hero_ledger: 1.05, // -12.4 dB → -12.0
  sfx_hero_quiver: 1.05, // -12.4 dB → -12.0
  sfx_hero_slash: 0.92, // -12.7 dB → -13.5
  sfx_hero_storm: 1.05, // -10.9 dB → -10.5
  sfx_hero_thunder: 1.05, // -12.4 dB → -12.0
  sfx_hero_optic: 1.31, // -11.9 dB → -9.5
  sfx_hero_kinetic: 1.11, // -10.4 dB → -9.5
  sfx_hero_timestone: 1.14, // -10.6 dB → -9.5
  sfx_hero_mystic: 1.06, // -12.5 dB → -12.0
  sfx_hero_hex: 1.1, // -10.3 dB → -9.5
  sfx_hero_shrink: 0.89, // -12.5 dB → -13.5
  sfx_hero_coins: 1.11, // -10.4 dB → -9.5
  sfx_hero_board: 1.09, // -10.3 dB → -9.5
  sfx_hero_whoosh: 0.87, // -12.3 dB → -13.5
  sfx_hero_crust: 1.1, // -10.3 dB → -9.5
  sfx_hero_biggun: 1.03, // -9.8 dB → -9.5
  sfx_hero_photon: 0.89, // -12.4 dB → -13.5
  sfx_hero_boomtube: 1.05, // -9.9 dB → -9.5
  sfx_hero_boing: 0.89, // -12.5 dB → -13.5
  sfx_hero_arrow: 1.04, // -12.4 dB → -12.0
  sfx_hero_boxing: 1.08, // -10.2 dB → -9.5
  sfx_hero_dive: 1.08, // -10.1 dB → -9.5
  sfx_hero_blast: 0.89, // -12.5 dB → -13.5
  sfx_hero_sponsored: 1.07, // -10.1 dB → -9.5
  sfx_hero_backwards: 1.12, // -10.5 dB → -9.5
  sfx_hero_bog: 1.05, // -10.9 dB → -10.5
  sfx_hero_stick: 0.97, // -13.2 dB → -13.5
  sfx_hero_penance: 1.05, // -9.9 dB → -9.5
  sfx_hero_chain: 0.88, // -12.4 dB → -13.5
  sfx_hero_crescent: 1.17, // -10.8 dB → -9.5
  sfx_hero_objection: 1.05, // -9.9 dB → -9.5
  sfx_hero_buzz: 1.09, // -12.8 dB → -12.0
  sfx_hero_cards: 1.23, // -11.3 dB → -9.5
  sfx_hero_ice: 1.07, // -11.1 dB → -10.5
  sfx_hero_elastic: 1.11, // -10.4 dB → -9.5
  sfx_hero_squirrels: 1.07, // -10.1 dB → -9.5
  sfx_hero_gadget: 1.22, // -13.7 dB → -12.0
  sfx_hero_ping: 1.06, // -12.5 dB → -12.0
  sfx_hero_blur: 0.87, // -12.3 dB → -13.5
  sfx_hero_snip: 1.09, // -12.8 dB → -12.0
  sfx_hero_flyby: 0.77, // -12.2 dB → -14.5
  sfx_hero_glint: 0.79, // -12.4 dB → -14.5
  sfx_hero_saucer: 0.79, // -12.4 dB → -14.5
  sfx_hero_magic: 0.79, // -12.4 dB → -14.5
  sfx_hero_squeak: 0.79, // -12.5 dB → -14.5
  sfx_hero_catch: 1.05, // -10.9 dB → -10.5
  sfx_hero_secret: 1.09, // -11.3 dB → -10.5
  music_tape: 0.94, // -12.4 dB → -13.0
  // ——— end hero peels ———
  // ——— Act 9 · Greek myths (made by scripts/act9-audio/, same levels as the boss kit above: tells and hits near the
  // slap, signature hits a little over it, repeated ones under it). Feet and Charybdis sounds are core (load at boot).
  // The Minotaur
  sfx_minotaur_bellow: 1.05, // -9.0 dB → -8.5: bull bellow (entrance and phase roar)
  sfx_minotaur_snort: 1.11, // -11.9 dB → -11.0: pawing and steam snort (tell)
  sfx_minotaur_charge: 1.05, // -10.7 dB → -10.3: hooves thunder into a charge
  sfx_minotaur_gore: 1.1, // -11.3 dB → -10.5: horns hit a pizza
  sfx_minotaur_crash: 1.09, // -10.2 dB → -9.5: slams into a stone wall
  sfx_minotaur_walls: 1.06, // -14.1 dB → -13.6: maze walls grind and shift
  // Medusa
  sfx_medusa_glow: 1.04, // -11.5 dB → -11.2: eyes glow (tell)
  sfx_medusa_petrify: 1.05, // -11.2 dB → -10.8: a pizza turns to stone
  sfx_medusa_crack: 0.89, // -12.5 dB → -13.5: a statue cracks under a stomp
  sfx_medusa_crumble: 1.05, // -10.0 dB → -9.6: a statue crumbles
  sfx_medusa_mirror: 1.06, // -12.5 dB → -12.0: mirror shield appears
  sfx_medusa_reflect: 1.11, // -11.4 dB → -10.5: smack on her reflection
  sfx_medusa_cure: 1.1, // -11.4 dB → -10.6: curse broken on a statue
  sfx_medusa_hiss: 1.01, // -11.9 dB → -11.8: snakes hiss
  sfx_medusa_gaze: 1.05, // -11.0 dB → -10.6: the peel caught by her stare
  // Cerberus
  sfx_cerberus_bark: 1.1, // -10.6 dB → -9.7: triple bark (entrance)
  sfx_cerberus_growl: 1.06, // -11.3 dB → -10.8: triple growl (tell)
  sfx_cerberus_fire: 1.1, // -10.0 dB → -9.2: fire breath
  sfx_cerberus_ice: 1.13, // -11.6 dB → -10.5: frost blast
  sfx_cerberus_poison: 1.08, // -11.2 dB → -10.5: poison spit
  sfx_cerberus_howl: 1.1, // -9.1 dB → -8.2: a head beaten, the others go wild
  // Hades and the Titans
  sfx_hades_toll: 1.05, // -10.7 dB → -10.2: death bell (entrance)
  sfx_hades_rise: 1.05, // -11.0 dB → -10.6: a Titan rises from the floor
  sfx_hades_chains: 1.11, // -12.9 dB → -12.0: chains rattle
  sfx_hades_tick: 1.08, // -14.1 dB → -13.4: Kronos clock tick, sits under
  sfx_hades_slow: 1.05, // -11.4 dB → -11.0: time slows (tell)
  sfx_hades_shatter: 1.31, // -12.8 dB → -10.5: hourglass smashed
  sfx_hades_tilt: 0.99, // -10.9 dB → -11.0: Atlas tilts the table (tell)
  sfx_hades_slide: 1.06, // -11.5 dB → -11.0: pizzas slide
  sfx_hades_flare: 1.1, // -11.9 dB → -11.1: Hyperion solar flare
  sfx_hades_douse: 1.09, // -12.7 dB → -12.0: flames smacked out
  sfx_hades_banish: 1.05, // -10.0 dB → -9.6: a Titan sent back
  sfx_hades_shadow: 1.06, // -12.5 dB → -12.0: shadow creeps out
  sfx_hades_grab: 1.08, // -11.2 dB → -10.5: shadow steals a slice
  // Act 9 feet and events
  sfx_sirensong: 0.89, // -11.3 dB → -12.3: Siren Slippers sing, sits under
  sfx_harpy: 1.05, // -12.9 dB → -12.5: Harpy Talons screech and flap
  sfx_eyepoke: 1.05, // -10.9 dB → -10.5: Cyclops Sandals poked in the eye
  sfx_whirlpool: 1.11, // -11.2 dB → -10.3: Charybdis whirlpool opens
  sfx_gulp: 1.05, // -11.5 dB → -11.0: Charybdis swallows
  // Stings are normalised to the music loudness (-16.4 LUFS, like music_gameover). audio.sting() plays
  // them at music volume and does not read TRIM; these gains apply if they're played through sfx().
  music_victory: 2.04, // -15.7 dB → -9.5: the 60-wave finish, a little over the slap
  music_act: 1.74, // -15.3 dB → -10.5: act-complete sting at slap level
  // ——— Act 10 · Finale (scripts/finale-audio/) ———
  // Same levels as the boss SFX: signature hits -9.5, slap-level hits -10.5, tells -11, the rest -12, repeated
  // or mashable ones -13.5. The Act 10 music and ambience loops are levelled to -16.5 LUFS and do not use TRIM.
  // Mirror Peel (mini-boss)
  sfx_mirrorpeel_enter: 1.09, // -11.3 dB → -10.6: mirror peel shimmers in
  sfx_mirrorpeel_charge: 1.06, // -11.5 dB → -11.0: mirrored wind-up (tell)
  sfx_mirrorpeel_fire: 0.97, // -10.2 dB → -10.5: reversed slam and zap
  sfx_mirrorpeel_interrupt: 1.09, // -11.2 dB → -10.5: glass crack (charge broken)
  sfx_mirrorpeel_echo: 0.92, // -12.8 dB → -13.5: dark peel echo swoops down
  sfx_mirrorpeel_shatter: 0.92, // -12.8 dB → -13.5: falling echo smacked to glass shards
  sfx_mirrorpeel_land: 1.05, // -12.4 dB → -12.0: dark echo thuds onto a pizza
  sfx_mirrorpeel_death: 1.1, // -10.4 dB → -9.6: mirror peel shatters
  // The Sole Proprietor (first meeting)
  sfx_soleprop_enter: 1.05, // -11.7 dB → -11.2: ominous gong chord and coins
  sfx_soleprop_voice: 1.06, // -11.9 dB → -11.4: low "hmm-hm" murmur
  sfx_soleprop_stamp: 1.05, // -10.0 dB → -9.6: heavy SOLD stamp thunk
  sfx_soleprop_cash: 1.13, // -13.1 dB → -12.1: cash register ka-ching
  sfx_soleprop_leave: 1.04, // -11.3 dB → -11.0: portal whoosh out
  sfx_soleprop_agent: 0.98, // -13.3 dB → -13.5: briefcase snaps open (agent arrives)
  sfx_soleprop_clock: 1.09, // -14.5 dB → -13.7: clock tick
  sfx_soleprop_bell: 1.1, // -12.6 dB → -11.7: shift-over bell and whistle
  // Ghost of Feet Future (mini-boss)
  sfx_ghostfuture_enter: 1.03, // -10.8 dB → -10.5: reversed ghostly swell
  sfx_ghostfuture_foresee: 0.87, // -12.3 dB → -13.5: ghost phases out
  sfx_ghostfuture_mark: 1.05, // -11.4 dB → -11.0: future footprint appears (tell)
  sfx_ghostfuture_stomp: 1.05, // -11.0 dB → -10.6: pale ethereal stomp lands
  sfx_ghostfuture_paradox: 1.05, // -10.9 dB → -10.5: peel caught in a paradox: warped zap
  sfx_ghostfuture_rewind: 1.09, // -12.2 dB → -11.5: tape rewind
  sfx_ghostfuture_death: 1.09, // -11.3 dB → -10.6: ghost dissolves
  // Sole Proprietor Unbound (final boss)
  sfx_soleunbound_enter: 1.05, // -11.3 dB → -10.9: massive impact and low choir chord
  sfx_soleunbound_fist: 1.09, // -11.7 dB → -11.0: gauntlet fist wind-up whoosh (tell)
  sfx_soleunbound_krak: 1.1, // -10.3 dB → -9.5: comic KRAK impact
  sfx_soleunbound_frost: 1.14, // -12.8 dB → -11.7: ice crackle freeze
  sfx_soleunbound_fire: 1.09, // -10.2 dB → -9.4: fire whoomph ignites
  sfx_soleunbound_douse: 1.06, // -13.4 dB → -12.9: flame smacked out: hiss
  sfx_soleunbound_gaze: 1.05, // -11.4 dB → -11.0: glowing eyes hum (tell)
  sfx_soleunbound_stone: 1.07, // -11.1 dB → -10.5: petrify crunch
  sfx_soleunbound_reflect: 1.06, // -12.5 dB → -12.0: mirror shield reflects: ping
  sfx_soleunbound_hole: 1.04, // -11.4 dB → -11.1: black hole opens: deep suction drone
  sfx_soleunbound_collapse: 1.01, // -10.6 dB → -10.5: black hole collapses
  sfx_soleunbound_eat: 1.12, // -10.5 dB → -9.5: huge chomp and gulp as he eats a pizza
  sfx_soleunbound_gather: 1.05, // -11.5 dB → -11.1: power gathers (riser)
  sfx_soleunbound_montage: 0.87, // -12.3 dB → -13.5: punchy whoosh-hit (montage, many fast)
  sfx_soleunbound_final: 1.08, // -10.2 dB → -9.5: the final smack: the biggest impact in the game
  sfx_soleunbound_crack: 1.1, // -10.3 dB → -9.5: the sole cracks open into light
  // Finale shared
  sfx_finale_warp: 1.07, // -11.6 dB → -11.0: memory-lane warp between backdrops (tell)
  sfx_finale_glitch: 0.89, // -12.5 dB → -13.5: glitching echo foot blip
  sfx_finale_peelwall: 0.89, // -12.5 dB → -13.5: peel on the wall lights up: chime
  // ——— Batpeel's Gotham (nemesis stage, scripts/gotham-audio): Bunion and the Jokester's moves, the Dark Kneader ———
  sfx_bunion_enter: 1.05, // -11.2 dB → -10.8: Bunion drops in: a heavy crunching landing and a low grunt
  sfx_bunion_pump: 1.06, // -13.6 dB → -13.1: a venom tube fills to full: pump gurgle and hiss (tell)
  sfx_bunion_surge: 1.13, // -12.3 dB → -11.2: VENOM SURGE tell: a monstrous roar with bubbling
  sfx_bunion_smash: 1.09, // -10.7 dB → -9.9: the VENOM SURGE stomp lands on a pizza
  sfx_bunion_tubehit: 0.89, // -13.4 dB → -14.4: smack on a venom tube: a thick rubber and glass thunk with a slosh
  sfx_bunion_drain: 1.04, // -11.6 dB → -11.3: a venom tube is drained: a glugging hiss, deflating
  sfx_bunion_grab: 1.08, // -10.7 dB → -10.1: THE BREAK starts: he grabs a pizza (leather creak and a grunt)
  sfx_bunion_strain: 1.16, // -14.9 dB → -13.6: the crust creaks under the strain (repeats)
  sfx_bunion_break: 1.16, // -12.1 dB → -10.8: the pizza breaks: a big crunchy crack
  sfx_bunion_saved: 1.09, // -11.3 dB → -10.6: you foil THE BREAK: he's shoved back (thud and whoosh)
  sfx_bunion_death: 1.11, // -11.7 dB → -10.8: his tubes burst and he deflates (hiss, splatter, thud)
  sfx_jokester_enter: 1.20, // -11.3 dB → -9.7: the Jokester's entrance: a jack-in-the-box spring BOING and a confetti pop
  sfx_jokester_laugh: 1.05, // -11.9 dB → -11.5: his manic cackle "ha-ha-ha-HA" (tell)
  sfx_jokester_toss: 1.13, // -12.9 dB → -11.8: a joke box is tossed (whoosh and a ribbon jingle)
  sfx_jokester_land: 1.10, // -12.9 dB → -12.1: a joke box lands on a pizza (cardboard thud)
  sfx_jokester_tick: 1.08, // -15.1 dB → -14.5: a bomb box ticks (about 1 s)
  sfx_jokester_boom: 1.05, // -10.9 dB → -10.5: a bomb box blows (cartoon blast with a party-horn tail)
  sfx_jokester_defuse: 1.13, // -12.0 dB → -10.9: a smack defuses a bomb box (snip and fizzle)
  sfx_jokester_gift: 1.05, // -12.6 dB → -12.2: a gift box opens itself (sparkle chime and party blower)
  sfx_jokester_gas: 1.10, // -12.8 dB → -12.0: laughing gas puffs out (hiss and pfft)
  sfx_jokester_clear: 1.11, // -10.1 dB → -9.1: the laughing gas is blown away (whoosh)
  sfx_jokester_giggle: 0.89, // -12.4 dB → -13.4: feet giggle in the laughing gas (little high giggles)
  sfx_jokester_jack: 1.05, // -10.8 dB → -10.3: THE GAUNTLET: the jack-in-the-box crank tune winds up (music-box notes, tell)
  sfx_jokester_spring: 1.09, // -10.9 dB → -10.1: the jack springs out (BOING and slap)
  sfx_jokester_pie: 1.05, // -11.2 dB → -10.8: a cream pie is thrown (whoosh)
  sfx_jokester_splat: 1.05, // -12.6 dB → -12.2: the cream pie splats
  sfx_jokester_teeth: 1.19, // -13.8 dB → -12.3: wind-up chattering teeth clatter (about 1.2 s)
  sfx_jokester_weight: 1.05, // -12.0 dB → -11.5: a cartoon weight falls (the whistle, about 1.8 s)
  sfx_jokester_thud: 1.06, // -10.9 dB → -10.4: the falling weight lands (big clank and thud)
  sfx_jokester_bang: 1.07, // -10.9 dB → -10.3: the BANG! flag gun pops (pop and a cloth snap)
  sfx_jokester_window: 1.15, // -11.4 dB → -10.2: the punchline window opens: he's dizzy (a sad trombone "wah-wah")
  sfx_jokester_death: 1.09, // -11.8 dB → -11.0: his death: a last laugh fading into a big confetti bang
  sfx_hero_darkfalls: 1.05, // -10.0 dB → -9.5: the Dark Kneader's darkness falls: a heavy low boom, a wing whoosh and a sub tail
  sfx_hero_split: 1.10, // -12.8 dB → -12.0: a Dark Kneader wing-boomerang splits in two on impact (a metallic shing)
  // ——— Nemesis bosses and hero variants (scripts/nemesis-audio): Kronos the Titan King, Zeus, the Red Sole, Venomnom, the Cheetoe, and the upgraded hero peels ———
  sfx_titanking_enter: 1.05, // -10.8 dB → -10.4: Kronos lands: a colossal stone foot, rattling chains and a deep rumble
  sfx_titanking_roar: 1.20, // -12.2 dB → -10.6: Kronos roars as a new phase starts: an ancient titan bellow
  sfx_titanking_flip: 1.11, // -11.6 dB → -10.6: the giant hourglass flips: stone grinding and a glassy whoosh (tell)
  sfx_titanking_tick: 0.89, // -13.0 dB → -14.0: one deep tick of the Titan's clock (repeats while the sand runs)
  sfx_titanking_shatter: 1.14, // -10.7 dB → -9.5: the hourglass is smashed: a great glass shatter and a pour of sand
  sfx_titanking_slow: 1.06, // -11.5 dB → -11.0: time slows on you: a warped, falling tape-stop whoosh
  sfx_titanking_chomp: 1.06, // -11.9 dB → -11.4: Devour: the stone jaw clamps onto a pizza with a heavy chomp
  sfx_titanking_chew: 0.89, // -10.9 dB → -11.9: the stone jaw grinds and chews (repeats while it eats)
  sfx_titanking_jawhit: 1.06, // -12.6 dB → -12.1: a smack on the stone jaw: a hard stone clack
  sfx_titanking_freed: 1.09, // -11.4 dB → -10.7: the jaw is forced open and the pizza is freed: a crack and a relief chime
  sfx_titanking_chain: 1.10, // -12.9 dB → -12.0: Reign of the Titans: chains crash down across a lane (tell)
  sfx_titanking_chainhit: 1.24, // -12.4 dB → -10.5: a smack on a locking chain: a metallic clank
  sfx_titanking_chainbreak: 1.23, // -12.9 dB → -11.1: a chain snaps and its links scatter
  sfx_titanking_death: 1.10, // -12.0 dB → -11.1: Kronos crumbles: stone collapsing, a hiss of sand and falling chains
  sfx_titanking_strain: 1.08, // -11.5 dB → -10.8: Kronos hauls on his chains: iron chains creaking taut and a low straining titan grunt (repeats while he pulls)
  sfx_titanking_weakhit: 1.15, // -13.0 dB → -11.8: a smack on a chain's red-hot weak link: a hot iron clang with a sizzle
  sfx_titanking_weakbreak: 1.14, // -11.4 dB → -10.3: the weak link shatters and the chain snaps: a big metal crack, links whipping away and a rattle
  sfx_titanking_rip: 1.11, // -11.6 dB → -10.7: Kronos rips a chain out of the wall: tearing rock, a titan roar and a massive chain rattle (tell)
  sfx_titanking_scrape: 1.16, // -11.1 dB → -9.8: the ripped chain scrapes along the table: grinding metal on stone, sparks and crunching
  sfx_titanking_unchained: 1.11, // -10.7 dB → -9.8: TITAN UNCHAINED: an enormous roar, broken chains rattling and a rumble
  sfx_titanking_swing: 1.06, // -11.1 dB → -10.6: a broken chain with a blade on its end swings down: a heavy whoosh with a chain rattle (tell)
  sfx_titanking_bladehit: 1.12, // -12.8 dB → -11.8: a smack on the chain's blade: a ringing iron clang
  sfx_titanking_crumble: 1.05, // -13.3 dB → -12.9: the walls of Tartarus crumble: a deep rumble, stones cracking and gravel pouring (repeats)
  sfx_titanking_rockcrack: 1.11, // -13.5 dB → -12.6: a boulder cracks loose from the roof: a sharp stone crack and grind (tell before it falls)
  sfx_titanking_rockfall: 1.05, // -12.2 dB → -11.7: the boulder falls: a descending whoosh with tumbling grit
  sfx_titanking_rocksmash: 1.16, // -12.0 dB → -10.7: a falling boulder is smashed apart in the air by a smack: a stone burst and scattering debris
  sfx_titanking_rockland: 1.05, // -11.4 dB → -10.9: a boulder lands on a pizza: a heavy stone thud and crunch
  sfx_titanking_shieldup: 1.03, // -11.3 dB → -11.0: Kronos raises his golden time-forcefield: a shimmering hum swelling with a clock-like chime (tell)
  sfx_titanking_pierce: 1.11, // -10.3 dB → -9.4: a blade drives through the forcefield: a glassy energy shatter and an iron stab
  sfx_titanking_shielddown: 1.06, // -12.5 dB → -12.0: the forcefield collapses: a falling sparkle and a power-down
  sfx_titanking_rise: 1.05, // -13.0 dB → -12.6: Kronos's giant stone head rises from behind the table: grinding stone, a rumble and a low growl (tell)
  sfx_titanking_headchew: 0.93, // -13.0 dB → -13.6: the stone head chews a pizza: a grinding stone crunch with crust crackle (repeats while it eats)
  sfx_titanking_sink: 1.05, // -13.9 dB → -13.5: the beaten stone head sinks away: a descending grinding rumble
  sfx_titanking_gulp: 1.06, // -11.1 dB → -10.6: Kronos swallows a mouthful of pizza: a deep cavernous gulp
  sfx_titanking_inhale: 1.0, // -14.9 dB: DEVOUR: the Titan head's long, hollow inhale (loops while it pulls a pizza in; sits under the hits)
  sfx_titanking_choke: 1.0, // -10.7 dB: DEVOUR: the Titan head chokes on its breath: a stone crack, a strangled gag and a cough
  sfx_titanking_lavaburst: 1.06, // -12.6 dB → -12.1: DEVOUR: the Titan head breaks the lava's surface: a lava surge, splash and steam hiss
  sfx_zeus_enter: 1.07, // -10.7 dB → -10.1: Zeus descends: a thunderclap, a choir swell and a marble landing
  sfx_zeus_thunder: 1.05, // -11.7 dB → -11.3: a huge rolling thunder as Zeus starts a new phase
  sfx_zeus_charge: 1.07, // -11.6 dB → -11.0: a storm cloud charges over a lane: a building crackle (tell, about 1.5 s)
  sfx_zeus_bolt: 1.07, // -10.5 dB → -9.9: a lightning bolt strikes: a sharp crack and boom
  sfx_zeus_scatter: 1.09, // -11.2 dB → -10.5: a storm cloud is smacked away: a puff and a dying fizzle
  sfx_zeus_hurl: 1.03, // -12.7 dB → -12.4: Zeus hurls a thunderbolt at your peel: a zapping whoosh
  sfx_zeus_deflect: 1.11, // -11.4 dB → -10.5: the thunderbolt is batted back: an electric ping
  sfx_zeus_poseidon: 1.04, // -11.3 dB → -10.9: Zeus calls Poseidon: a conch horn over a rising swell of water (tell)
  sfx_zeus_wave: 1.05, // -10.9 dB → -10.5: Poseidon's wave crashes across the table
  sfx_zeus_trident: 1.21, // -12.9 dB → -11.3: the trident is knocked away: a metal clang and a splash
  sfx_zeus_ares: 1.08, // -11.2 dB → -10.5: Zeus calls Ares: a blast on a war horn (tell)
  sfx_zeus_warcry: 1.14, // -12.1 dB → -10.9: the feet answer Ares's war cry: a roaring crowd shout
  sfx_zeus_silence: 1.11, // -10.4 dB → -9.5: Ares's war helmet is smashed: a bronze clang
  sfx_zeus_hera: 1.06, // -11.5 dB → -11.0: Zeus calls Hera: her crown descends with a regal chime and shimmer
  sfx_zeus_peacock: 1.15, // -11.7 dB → -10.5: a smack on a peacock-eye gem in Hera's crown: a glassy ping
  sfx_zeus_crown: 1.15, // -10.6 dB → -9.3: Hera's crown breaks: a shatter of gold
  sfx_zeus_death: 1.11, // -9.4 dB → -8.5: Zeus falls: fading thunder, cracking marble and a choir cut short
  sfx_redsole_enter: 1.08, // -8.8 dB → -8.2: the Red Sole marches in: jackboots and a sinister laugh
  sfx_redsole_laugh: 1.04, // -9.8 dB → -9.5: the Red Sole's villain laugh (tell)
  sfx_redsole_cube: 1.08, // -11.6 dB → -10.9: the cosmic cube hums as it charges (tell, about 2 s)
  sfx_redsole_beam: 1.16, // -10.8 dB → -9.5: the cube fires an energy beam down a lane
  sfx_redsole_misfire: 1.05, // -10.0 dB → -9.6: the cube backfires on him: an overload zap and a boom
  sfx_redsole_cubehit: 1.11, // -11.4 dB → -10.5: a smack on the cosmic cube: a crystal thunk
  sfx_redsole_turret: 1.05, // -11.5 dB → -11.1: a hydrant turret rises from the table edge: a mechanical clunk and hiss
  sfx_redsole_spray: 1.02, // -10.8 dB → -10.6: a hydrant turret sprays: a pressurised burst
  sfx_redsole_cap: 1.03, // -11.9 dB → -11.7: a turret is capped: a metal clang as the hiss dies
  sfx_redsole_march: 1.17, // -12.3 dB → -10.9: the Skull Blitz: his goose-step heel clicks (tell)
  sfx_redsole_stomp: 1.05, // -10.1 dB → -9.7: a heavy jackboot stomp lands
  sfx_redsole_death: 1.07, // -11.0 dB → -10.4: the Red Sole goes down: his skull mask cracks, an alarm whoops and the bunker blows
  sfx_venomnom_enter: 1.12, // -11.6 dB → -10.6: Venomnom splats down: wet goo and a deep, double-voiced growl
  sfx_venomnom_growl: 1.20, // -12.6 dB → -11.0: Venomnom's wet growl (tell)
  sfx_venomnom_tongue: 1.07, // -11.8 dB → -11.2: his long tongue lashes out: a wet whip
  sfx_venomnom_snatch: 1.05, // -12.6 dB → -12.1: a slice is gulped down
  sfx_venomnom_cut: 1.04, // -10.9 dB → -10.5: his tongue is smacked: a slap and a yelp
  sfx_venomnom_goo: 1.08, // -12.2 dB → -11.6: a tendril binds a pizza: a sticky stretching squelch
  sfx_venomnom_drain: 1.10, // -12.2 dB → -11.3: the bound pizza is slurped: a slice drains away
  sfx_venomnom_tendril: 1.13, // -11.5 dB → -10.4: a smack on a goo tendril: a rubbery thwack
  sfx_venomnom_sonic: 1.08, // -10.2 dB → -9.5: a sonic emitter fires a piercing pulse
  sfx_venomnom_shriek: 1.14, // -12.2 dB → -11.1: the sound hurts him: Venomnom shrieks
  sfx_venomnom_split: 1.06, // -11.7 dB → -11.2: the goo tears into copies of him
  sfx_venomnom_death: 1.23, // -11.2 dB → -9.4: Venomnom melts: a sonic shriek, then goo dissolving and splattering
  sfx_cheetoe_enter: 1.07, // -10.9 dB → -10.3: the Cheetoe leaps in: a big-cat roar and a landing
  sfx_cheetoe_dash: 1.05, // -13.4 dB → -13.0: she dashes from lane to lane: a fast whoosh
  sfx_cheetoe_crouch: 1.27, // -14.0 dB → -11.9: she crouches to pounce: a low growl (tell)
  sfx_cheetoe_pounce: 1.07, // -10.7 dB → -10.1: the pounce lands: a thump and a snarl
  sfx_cheetoe_slash: 1.03, // -12.5 dB → -12.2: a claw swipe
  sfx_cheetoe_scratch: 1.11, // -12.0 dB → -11.1: claws rake a pizza
  sfx_cheetoe_hiss: 1.17, // -12.2 dB → -10.9: the Cheetoe hisses
  sfx_cheetoe_rustle: 0.90, // -12.3 dB → -13.2: the jungle leaves rustle where she hides
  sfx_cheetoe_flush: 1.04, // -9.5 dB → -9.2: she's flushed out of the leaves: a yowl and a burst of foliage
  sfx_cheetoe_death: 1.12, // -10.3 dB → -9.3: the Cheetoe is beaten: a defeated yowl and a collapse
  sfx_hero_ghostsparta: 1.10, // -11.2 dB → -10.3: Kratos, Ghost of Sparta: a deeper, distorted war shout and a whoosh of fire
  sfx_hero_firetrail: 0.88, // -11.3 dB → -12.4: Ghost of Sparta's rage leaves fire on the table: a short fire whoosh (repeats)
  sfx_hero_primebeam: 1.24, // -11.4 dB → -9.5: Superpeel Prime: Heat Vision sweeps the whole screen
  sfx_hero_infinity: 1.11, // -10.4 dB → -9.5: Iron Pan Mark Infinity: a cosmic charge and the sweeping Infinity Beam
  sfx_hero_endgame: 1.09, // -10.5 dB → -9.7: an Endgame variant's move: portals open and a heroic brass stab
  sfx_hero_unleashed: 1.10, // -10.6 dB → -9.7: Thor, Thunder Unleashed: a massive rolling thunderstorm
  sfx_hero_ascended: 1.11, // -9.8 dB → -8.9: Odin Allfather Ascended: a deep horn and raven caws
  sfx_hero_unbound: 1.05, // -11.1 dB → -10.6: Zeus, King Unbound: an overcharged lightning-sword blast
  sfx_hero_liberty: 1.10, // -12.8 dB → -12.0: Shield of Liberty: a bright shield ricochet ping
  sfx_hero_tendril: 1.10, // -11.8 dB → -11.0: Symbiote Pan: a web tendril snatches a foot (a sticky squelch)
  sfx_hero_amazon: 1.10, // -11.6 dB → -10.8: Amazon Queen: a golden lasso crack and a war cry
  // ——— Leonidas's nemesis, the Hot Gates (scripts/nemesis-audio/recipes_hotgates.py): the Immortal Brute, Xerxes, King Leonidas and the Hot Gates variant ———
  sfx_immortalbrute_enter: 1.05, // -11.6 dB → -11.1: the Immortal Brute lands: a hulking crash, chain rattle and a roar behind his mask
  sfx_immortalbrute_horde: 1.06, // -11.4 dB → -10.9: a horde wave of Immortals comes: a Persian war horn over marching feet (tell)
  sfx_immortalbrute_whirl: 1.06, // -11.5 dB → -11.0: the Brute whirls his chain blade overhead (tell, about 1.5 s)
  sfx_immortalbrute_slam: 1.10, // -11.7 dB → -10.8: the chain blade slams down: a metal crash
  sfx_immortalbrute_snag: 1.28, // -12.3 dB → -10.1: the chain blade is snagged: a big metallic clank and a grunt
  sfx_immortalbrute_roar: 1.28, // -11.8 dB → -9.6: the Immortal Brute roars as a new phase starts
  sfx_immortalbrute_death: 0.99, // -10.7 dB → -10.8: the Immortal Brute topples: an armour crash and a clatter of chain
  sfx_xerxes_enter: 1.06, // -10.7 dB → -10.2: Xerxes arrives: gongs, a deep choir swell and a heavy golden landing
  sfx_xerxes_laugh: 1.08, // -10.3 dB → -9.6: Xerxes laughs: a deep, regal god-king laugh (tell)
  sfx_xerxes_arrows: 1.05, // -11.1 dB → -10.7: the arrow storm: thousands of bows loose and the sky darkens with a rising hiss
  sfx_xerxes_volley: 1.08, // -11.5 dB → -10.8: one volley of arrows whistling down onto the table
  sfx_xerxes_bat: 1.11, // -11.4 dB → -10.5: arrows batted away: a wooden clatter
  sfx_xerxes_rhino: 1.11, // -10.7 dB → -9.8: a war rhino snorts and paws the ground before it charges (tell)
  sfx_xerxes_charge: 1.05, // -10.7 dB → -10.2: the war rhino charges down a lane: a thundering gallop and a crash
  sfx_xerxes_turn: 1.05, // -11.5 dB → -11.1: the war rhino is turned away: a snort and a retreat
  sfx_xerxes_elephants: 1.12, // -11.6 dB → -10.6: war elephants trumpet
  sfx_xerxes_guard: 1.05, // -12.4 dB → -12.0: a golden guard ward hums up round Xerxes
  sfx_xerxes_death: 1.08, // -11.6 dB → -11.0: the god-king falls: a crash of gold armour, chains and a fading gong
  sfx_hero_holdline: 1.08, // -10.5 dB → -9.8: King Leonidas's Hold the Line: a wall of bronze shields slams down with a shout
  sfx_hero_spear: 1.09, // -12.0 dB → -11.2: King Leonidas's spear is hurled: a strong whoosh and a thunk
  sfx_hero_shieldblock: 1.13, // -11.6 dB → -10.5: a stomp clangs off a bronze shield in the shield wall
  sfx_hero_hotgates: 1.09, // -9.8 dB → -9.1: Leonidas, Hot Gates: a roaring Spartan war cry with shields beating
  sfx_hero_spartanchant: 1.11, // -10.4 dB → -9.5: King Leonidas's Hold the Line, raised or renewed: the phalanx's war chant, HOOOOH... HOO! HOO!, spears on bronze shields; real recordings (scripts/real-sfx/build.py)
  // ——— peel smacks (scripts/smack-sfx, generated into smackTrim.ts) ———
  ...SMACK_TRIM,
};

const AMBIENCE_GAIN = 0.4;
const SLAPS = ['sfx_slap_1', 'sfx_slap_2', 'sfx_slap_3'];

class AudioManager {
  private game!: Phaser.Game;
  private tracks: Record<Cat, Track | null> = { music: null, ambience: null };
  private fading = new Set<{ sound: Track['sound']; from: number; to: number; t0: number; dur: number; done?: () => void }>();
  private lastPlayed = new Map<string, number>();
  private loading = new Map<string, Promise<boolean>>();
  private duckLevel = 1;
  private raf = 0;

  init(game: Phaser.Game): void {
    this.game = game;
    this.applyMaster();
    onSettingsChange(() => this.applyVolumes());
    // Keep music running between scenes; Phaser pauses all audio when the tab is hidden.
    game.sound.pauseOnBlur = true;
  }

  has(key: string): boolean {
    return AVAILABLE.has(key);
  }

  private vol(cat: Cat | 'sfx'): number {
    const s = save.settings;
    return cat === 'music' ? s.music : cat === 'ambience' ? s.ambience * AMBIENCE_GAIN : s.sfx;
  }

  private applyMaster(): void {
    const s = save.settings;
    this.game.sound.volume = s.master;
    this.game.sound.mute = s.muted;
  }

  applyVolumes(): void {
    this.applyMaster();
    for (const cat of ['music', 'ambience'] as Cat[]) {
      const t = this.tracks[cat];
      if (t && !this.isFading(t.sound)) t.sound.volume = t.target * this.vol(cat) * this.duckLevel;
    }
  }

  private isFading(sound: Track['sound']): boolean {
    for (const f of this.fading) if (f.sound === sound) return true;
    return false;
  }

  /** Load an audio file through the given scene's loader if it isn't cached yet. */
  ensure(scene: Phaser.Scene, key: string): Promise<boolean> {
    if (!AVAILABLE.has(key)) return Promise.resolve(false);
    if (scene.cache.audio.exists(key)) return Promise.resolve(true);
    const pending = this.loading.get(key);
    if (pending) return pending;
    const p = new Promise<boolean>((resolve) => {
      const onDone = (fileKey: string) => {
        if (fileKey !== key) return;
        cleanup();
        resolve(scene.cache.audio.exists(key));
      };
      const onErr = (file: Phaser.Loader.File) => {
        if (file.key !== key) return;
        cleanup();
        resolve(false);
      };
      // if the scene shuts down mid-download, give up so a later scene can retry
      const onShutdown = () => {
        cleanup();
        resolve(false);
      };
      const onQueueDone = () => {
        cleanup();
        resolve(scene.cache.audio.exists(key));
      };
      const cleanup = () => {
        scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onDone);
        scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
        scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
        scene.load.off(Phaser.Loader.Events.COMPLETE, onQueueDone);
        this.loading.delete(key);
      };
      scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onDone);
      scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
      scene.load.on(Phaser.Loader.Events.COMPLETE, onQueueDone);
      scene.load.audio(key, `audio/${key}.mp3`);
      if (!scene.load.isLoading()) scene.load.start();
    });
    this.loading.set(key, p);
    return p;
  }

  /** Warm the cache in the background so later transitions are instant. */
  preload(scene: Phaser.Scene, keys: string[]): void {
    for (const k of keys) void this.ensure(scene, k);
  }

  sfx(key: string, opts: { volume?: number; rate?: number; detune?: number; throttle?: number; jitter?: number } = {}): void {
    if (!this.game || !this.game.cache.audio.exists(key)) return;
    const now = performance.now();
    const throttle = opts.throttle ?? 35;
    const last = this.lastPlayed.get(key) ?? -1e9;
    if (now - last < throttle) return;
    this.lastPlayed.set(key, now);
    const jitter = opts.jitter ?? 0.06;
    const rate = (opts.rate ?? 1) * (1 + (crand() * 2 - 1) * jitter);
    this.game.sound.play(key, {
      volume: (opts.volume ?? 1) * (TRIM[key] ?? 1) * this.vol('sfx'),
      rate,
      detune: opts.detune ?? 0,
    });
  }

  private lastSlap = 0;

  /** Round-robin through the slap variations (never the same one twice) with pitch variation. */
  private classicSlap(intensity: number): void {
    this.lastSlap = (this.lastSlap + 1 + Math.floor(crand() * 2)) % 3;
    this.sfx(SLAPS[this.lastSlap], { volume: 0.8 + 0.2 * intensity, rate: 1.06 - 0.12 * intensity, throttle: 25, jitter: 0.1 });
  }

  // ——— peel smacks (src/game/smacks.ts registers these) ———
  /** The peel whose look is on the cursor. */
  smackSource: (() => string) | null = null;
  /** A peel's smack files (null: the classic slap). */
  smackResolve: ((id: string) => SmackProfile | null) | null = null;
  private smackId = '';
  private smackProfile: SmackProfile | null = null;
  private lastTake = 0;
  private lastTail = 0;
  private requestedSmack = new Set<string>();

  /** The current look's smack (cached until the look changes), or null for the classic slap. */
  private currentSmack(): SmackProfile | null {
    if (!this.smackSource || !this.smackResolve || save.settings.peelSmacks === 'classic') return null;
    const id = this.smackSource();
    if (id !== this.smackId) {
      this.smackId = id;
      this.smackProfile = this.smackResolve(id);
    }
    return this.smackProfile;
  }

  /** The first active scene, to load through. */
  anyScene(): Phaser.Scene | null {
    return this.game?.scene.getScenes(true)[0] ?? null;
  }

  /** A smack: the peel's own sound (its look's), the classic slap, or nothing, by the "Peel smack sounds" setting.
   *  Intensity behaves as it always has (louder and lower when harder); 1 or more counts as a big hit. */
  slap(intensity = 1): void {
    if (save.settings.peelSmacks === 'off') return;
    this.smackWith(this.currentSmack(), intensity, intensity >= 1, false);
  }

  /** A critical smack: the heavy take (the classic crit for the Classic Peel). */
  critSmack(): void {
    if (save.settings.peelSmacks === 'off') return;
    this.smackWith(this.currentSmack(), 1, true, false);
  }

  /** Last smack key played, for dev checks. */
  lastSmack = '';

  /** Play a smack profile. `forceTail` plays the tail whatever its gap (the locker preview). */
  smackWith(p: SmackProfile | null, intensity: number, heavy: boolean, forceTail: boolean): void {
    if (!this.game) return;
    const cache = this.game.cache.audio;
    if (p && !cache.exists(p.heavy)) {
      // not loaded yet: start loading it and use the classic slap this once
      this.requestSmack(p);
      p = null;
    }
    if (!p) {
      if (heavy) this.play('sfx_crit', 1, 1, 40, 0.06);
      else this.classicSlap(intensity);
      this.lastSmack = heavy ? 'sfx_crit' : SLAPS[this.lastSlap];
      return;
    }
    // alternate takes (never the same twice), slight random pitch and volume, the peel's own pitch on top
    this.lastTake = (this.lastTake + 1 + Math.floor(crand() * 2)) % p.takes.length;
    const vol = (0.8 + 0.2 * intensity) * (0.92 + crand() * 0.08);
    const rate = p.rate * (heavy ? 0.97 : 1.06 - 0.12 * intensity);
    const key = heavy ? p.heavy : p.takes[this.lastTake];
    this.play(key, vol, rate, heavy ? 40 : 25, 0.07);
    this.lastSmack = key;
    if (p.layer) {
      const lk = heavy ? p.layer.heavy : p.layer.takes[this.lastTake % p.layer.takes.length];
      if (cache.exists(lk)) this.play(lk, vol * p.layer.vol, rate, 25, 0.05);
    }
    const t = p.tail;
    if (t && cache.exists(t.key)) {
      const now = performance.now();
      if (forceTail || now - this.lastTail >= (heavy ? 120 : t.gap)) {
        this.lastTail = now;
        this.play(t.key, t.vol * (heavy ? 1.1 : 0.95), p.rate, 60, 0.04);
      }
    }
  }

  private requestSmack(p: SmackProfile): void {
    if (this.requestedSmack.has(p.id)) return;
    this.requestedSmack.add(p.id);
    const scene = this.anyScene();
    // a failed or abandoned load (the scene shut down) can be asked for again
    if (scene) void Promise.all(p.keys.map((k) => this.ensure(scene, k))).then((ok) => ok.every(Boolean) || this.requestedSmack.delete(p.id));
    else this.requestedSmack.delete(p.id);
  }

  /** sfx() without an options object, for the smack path (it runs on every hit). */
  private play(key: string, volume: number, rate: number, throttle: number, jitter: number): void {
    if (!this.game || !this.game.cache.audio.exists(key)) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(key) ?? -1e9) < throttle) return;
    this.lastPlayed.set(key, now);
    this.game.sound.play(key, {
      volume: volume * (TRIM[key] ?? 1) * this.vol('sfx'),
      rate: rate * (1 + (crand() * 2 - 1) * jitter),
    });
  }

  /** Crossfade to the first available track among candidates. */
  async music(scene: Phaser.Scene, candidates: string[], fade = 1200): Promise<void> {
    await this.swap('music', scene, candidates, fade, 1);
  }

  async ambience(scene: Phaser.Scene, candidates: string[], fade = 2000): Promise<void> {
    await this.swap('ambience', scene, candidates, fade, 1);
  }

  private async swap(cat: Cat, scene: Phaser.Scene, candidates: string[], fade: number, target: number): Promise<void> {
    const key = candidates.find((k) => AVAILABLE.has(k));
    const cur = this.tracks[cat];
    this.requested[cat] = key ?? null;
    if (cur && cur.key === key) return;
    if (!key) {
      this.stop(cat, fade);
      return;
    }
    const ok = await this.ensure(scene, key);
    if (!ok || this.requested[cat] !== key) return;
    this.trimForLoop(key);
    this.stop(cat, fade);
    const sound = this.game.sound.add(key, { loop: true, volume: 0 }) as Track['sound'];
    sound.play();
    this.tracks[cat] = { key, sound, target };
    this.fade(sound, 0, target * this.vol(cat) * this.duckLevel, fade);
  }

  private requested: Record<Cat, string | null> = { music: null, ambience: null };
  private trimmed = new Set<string>();

  /**
   * MP3 encoders pad the start/end with silence, and not every browser strips it on decode,
   * which leaves an audible hiccup at the loop point. Trim near-silent edges once per track.
   */
  private trimForLoop(key: string): void {
    if (this.trimmed.has(key)) return;
    this.trimmed.add(key);
    const buf = this.game.cache.audio.get(key) as AudioBuffer | undefined;
    if (!buf || typeof buf.getChannelData !== 'function') return;
    const maxScan = Math.min(8192, Math.floor(buf.length / 4));
    const th = 1e-3;
    let lead = maxScan;
    let tail = maxScan;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      let i = 0;
      while (i < maxScan && Math.abs(d[i]) < th) i++;
      lead = Math.min(lead, i);
      let j = 0;
      while (j < maxScan && Math.abs(d[d.length - 1 - j]) < th) j++;
      tail = Math.min(tail, j);
    }
    if (lead + tail < 32) return;
    const len = buf.length - lead - tail;
    const ctx = (this.game.sound as Phaser.Sound.WebAudioSoundManager).context;
    if (!ctx) return;
    const out = ctx.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(lead, lead + len), c);
    (this.game.cache.audio as unknown as { entries: Phaser.Structs.Map<string, unknown> }).entries.set(key, out);
  }

  /** A sound effect's gain at the sfx volume (its trim included), for a loop whose volume is set by hand. */
  sfxGain(key: string): number {
    return (TRIM[key] ?? 1) * this.vol('sfx');
  }

  /** A looping sound effect (a boss's sustained move, e.g. an inhale) at the sfx volume, edges trimmed for a seamless
   *  loop. The caller stops and destroys it. */
  loopSfx(key: string, volume = 1): (Phaser.Sound.BaseSound & { volume: number }) | null {
    if (!this.game || !this.game.cache.audio.exists(key)) return null;
    this.trimForLoop(key);
    const s = this.game.sound.add(key, { loop: true, volume: volume * (TRIM[key] ?? 1) * this.vol('sfx') }) as Phaser.Sound.BaseSound & { volume: number };
    s.play();
    return s;
  }

  /** One-shot music sting (e.g. game over) that ducks the current music. */
  sting(key: string, volume = 1): void {
    if (!this.game || !this.game.cache.audio.exists(key)) return;
    this.game.sound.play(key, { volume: volume * this.vol('music') });
  }

  stop(cat: Cat, fade = 800): void {
    this.requested[cat] = null; // a track still downloading must not start after a stop
    const t = this.tracks[cat];
    if (!t) return;
    this.tracks[cat] = null;
    this.fade(t.sound, t.sound.volume, 0, fade, () => t.sound.destroy());
  }

  /** Lower music + ambience (e.g. behind menus). 1 = normal. */
  duck(level: number, ms = 400): void {
    this.duckLevel = level;
    for (const cat of ['music', 'ambience'] as Cat[]) {
      const t = this.tracks[cat];
      if (t) this.fade(t.sound, t.sound.volume, t.target * this.vol(cat) * level, ms);
    }
  }

  get currentMusic(): string | null {
    return this.tracks.music?.key ?? null;
  }

  private fade(sound: Track['sound'], from: number, to: number, dur: number, done?: () => void): void {
    for (const f of [...this.fading]) if (f.sound === sound) this.fading.delete(f);
    if (dur <= 0) {
      sound.volume = to;
      done?.();
      return;
    }
    this.fading.add({ sound, from, to, t0: performance.now(), dur, done });
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (): void => {
    const now = performance.now();
    for (const f of [...this.fading]) {
      const k = Math.min(1, (now - f.t0) / f.dur);
      const e = k * k * (3 - 2 * k);
      try {
        f.sound.volume = f.from + (f.to - f.from) * e;
      } catch {
        this.fading.delete(f);
        continue;
      }
      if (k >= 1) {
        this.fading.delete(f);
        f.done?.();
      }
    }
    this.raf = this.fading.size ? requestAnimationFrame(this.tick) : 0;
  };
}

export const audio = new AudioManager();
