// Audio: category volumes (master / music / sfx / ambience), music + ambience crossfades,
// lazy loading of the larger tracks, and SFX throttling/variation.

import Phaser from 'phaser';
import manifest from 'virtual:audio-manifest';
import { onSettingsChange, save } from './save';

type Cat = 'music' | 'ambience';

interface Track {
  key: string;
  sound: Phaser.Sound.BaseSound & { volume: number };
  target: number; // 0..1 relative gain inside the category
}

const AVAILABLE = new Set<string>(manifest);
// Small files loaded at boot; everything else streams in on demand.
// Boss move sounds (sfx_<boss>_<move>) load a wave ahead of their fight instead (see bossSfx).
export const BOOT_AUDIO = [...AVAILABLE].filter((k) => (k.startsWith('sfx_') && isCoreSfx(k)) || k === 'music_menu' || k === 'music_gameover');

/** The original sfx all have one-word names (sfx_slap_1 has a digit); boss move sounds are sfx_<boss>_<move>. */
function isCoreSfx(k: string): boolean {
  return !/^sfx_[a-z]+_[a-z]+$/.test(k) || k.startsWith('sfx_kit_');
}

/** A boss's move sounds, to preload before its fight. The Phantom King's echoes borrow other bosses' sounds. */
export function bossSfx(id: string): string[] {
  return [...AVAILABLE].filter((k) => !isCoreSfx(k) && (id === 'phantomking' || k.startsWith(`sfx_${id}_`)));
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
  sfx_headwaiter_traytoss: 1.13, // -12.0 dB → -10.9: tray thrown, spinning
  sfx_headwaiter_traybat: 1.27, // -12.5 dB → -10.4: tray batted back
  sfx_headwaiter_trayclang: 1.17, // -11.8 dB → -10.4: tray crashes on a pizza
  sfx_headwaiter_service: 1.05, // -11.4 dB → -11.0: desk-bell double ding
  // Bigfoot
  sfx_bigfoot_ring: 1.05, // -12.4 dB → -12.0: QTE ring appears
  sfx_bigfoot_ringok: 1.05, // -11.4 dB → -11.0: good QTE click
  sfx_bigfoot_bigstep: 1.05, // -9.9 dB → -9.5: the big step lands
  sfx_bigfoot_trapbuild: 1.21, // -15.2 dB → -13.5: bear trap ratchets together
  sfx_bigfoot_trapsnap: 1.5, // -13.0 dB → -9.5: bear trap snaps shut
  sfx_bigfoot_pound: 1.07, // -10.1 dB → -9.5: ground pound crashes down
  sfx_bigfoot_rampage: 1.05, // -10.9 dB → -10.5: second Bigfoot arrives
  // Chimney Sweep
  sfx_sweep_brush: 1.09, // -12.7 dB → -12.0: chimney brush scrubbing (tell)
  sfx_sweep_soot: 1.06, // -11.0 dB → -10.5: soot column whoomph
  sfx_sweep_hop: 1.18, // -12.4 dB → -11.0: pops out of one chimney into another
  sfx_sweep_brick: 1.05, // -12.4 dB → -12.0: chimney brick laid (enraged)
  // Iron Heel
  sfx_ironheel_charge: 0.79, // -12.4 dB → -14.4: power-blast charge riser, sits under
  sfx_ironheel_launcher: 1.05, // -11.4 dB → -11.0: rocket launcher deploys
  sfx_ironheel_rocket: 1.05, // -10.9 dB → -10.5: rocket launches
  sfx_ironheel_blast: 1.08, // -10.2 dB → -9.5: power blast fires
  sfx_ironheel_vent: 1.03, // -11.3 dB → -11.0: armour vents open
  sfx_ironheel_hiss: 0.88, // -12.4 dB → -13.5: steam warning hiss, sits under
  sfx_ironheel_steam: 1.07, // -11.1 dB → -10.5: steam burst
  sfx_ironheel_press: 1.18, // -11.9 dB → -10.5: hydraulic press stamps
  sfx_ironheel_valve: 1.05, // -11.4 dB → -11.0: valve wheel locks
  // Sandcastle Sam
  sfx_sandcastle_shovel: 1.13, // -13.0 dB → -11.9: shovel scrape (tell)
  sfx_sandcastle_walls: 1.05, // -10.9 dB → -10.5: sand walls rise
  sfx_sandcastle_pour: 1.09, // -12.8 dB → -12.1: sand pour
  sfx_sandcastle_sandland: 1.09, // -11.7 dB → -11.0: wet sand lands on a pizza
  // King Honk
  sfx_clownking_honkwind: 1.05, // -11.4 dB → -11.0: bulb-horn squeeze wind-up
  sfx_clownking_honk: 1.04, // -9.9 dB → -9.6: clown horn blast
  sfx_clownking_leap: 1.05, // -11.4 dB → -11.0: slide-whistle leap away
  sfx_clownking_decoydrop: 1.05, // -12.4 dB → -12.0: slide-whistle drop
  sfx_clownking_pie: 1.06, // -12.5 dB → -12.0: wobbly pie throw
  sfx_clownking_piesplat: 1.1, // -10.3 dB → -9.5: big cream-pie splat
  // Short-Order Shoe
  sfx_shortorder_bell: 1.1, // -11.4 dB → -10.6: order bell ding
  sfx_shortorder_grab: 1.09, // -11.7 dB → -11.0: grabbing hand lunges in
  sfx_shortorder_togo: 1.11, // -11.9 dB → -11.0: hand snatches a slice
  sfx_shortorder_rush: 1.05, // -10.9 dB → -10.5: rush-hour triple bell and ticket chatter
  // T-Rex Toes
  sfx_trex_dinosqueak: 1.05, // -12.4 dB → -12.0: baby dino squeak
  sfx_trex_dinorun: 1.07, // -14.1 dB → -13.5: baby dino pitter-patter
  sfx_trex_growl: 1.05, // -11.4 dB → -11.0: snack-time growl (tell)
  sfx_trex_snack: 1.08, // -11.2 dB → -10.5: jaws snap on a foot
  sfx_trex_breath: 0.91, // -12.7 dB → -13.5: deep breath in (tell)
  sfx_trex_roar: 1.05, // -9.9 dB → -9.5: the roar
  // Ice Skate Ivy
  sfx_iceskate_snow: 1.02, // -12.2 dB → -12.0: snow cloud gust (tell)
  sfx_iceskate_freeze: 1.28, // -12.6 dB → -10.5: lane freezes over
  sfx_iceskate_frostbite: 1.12, // -12.0 dB → -11.0: peel stung in the snow
  sfx_iceskate_axel: 1.09, // -11.7 dB → -11.0: triple skate swish
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
  sfx_cosmiccroc_meteor: 1.06, // -12.5 dB → -12.0: meteor falling whistle
  sfx_cosmiccroc_impact: 1.11, // -11.4 dB → -10.5: meteor impact
  sfx_cosmiccroc_flip: 1.03, // -11.3 dB → -11.0: gravity warp
  sfx_cosmiccroc_blackhole: 1.02, // -11.2 dB → -11.0: black hole opens
  sfx_cosmiccroc_holeclose: 0.95, // -10.5 dB → -10.9: black hole implodes
  // Dough Boy
  sfx_doughboy_ball: 1.05, // -12.5 dB → -12.1: dough ball blorps out
  sfx_doughboy_splat: 1.05, // -11.4 dB → -11.0: dough splat
  sfx_doughboy_rise: 0.77, // -12.2 dB → -14.5: yeasty bubbling rise, sits under
  // Nonna's Slipper
  sfx_nonna_pin: 1.05, // -12.4 dB → -12.0: rolling pin rumble
  sfx_nonna_pinsmash: 1.1, // -10.3 dB → -9.5: rolling pin crashes into the pizzas
  sfx_nonna_slippers: 1.13, // -13.1 dB → -12.0: slippers flap (tell)
  sfx_nonna_slipper: 1.05, // -10.9 dB → -10.5: slipper thwack
  sfx_nonna_spoon: 1.1, // -11.8 dB → -11.0: wooden spoon swings and grabs
  sfx_nonna_tug: 1.04, // -13.8 dB → -13.5: tug-of-war creak, sits under
  // The Pigeon King
  sfx_pigeonking_coo: 1.05, // -12.4 dB → -12.0: pigeon coo
  sfx_pigeonking_splat: 1.08, // -11.6 dB → -10.9: bird bomb splat
  sfx_pigeonking_flock: 1.05, // -11.4 dB → -11.0: flock flutters in
  // The Gargoyle
  sfx_gargoyle_swoop: 1.02, // -12.2 dB → -12.0: stony wing swoop
  sfx_gargoyle_stone: 1.1, // -11.8 dB → -11.0: turns to stone (grind)
  sfx_gargoyle_stonecrack: 0.89, // -12.4 dB → -13.4: stone cracks under a smack
  sfx_gargoyle_stonebreak: 1.05, // -10.0 dB → -9.6: stone crumbles
  sfx_gargoyle_storm: 1.05, // -11.4 dB → -11.0: mini-gargoyle screech chorus
  // Jellyfish Flip-Flop
  sfx_jellyfish_charge: 1.27, // -14.1 dB → -12.0: jelly charge hum
  sfx_jellyfish_sting: 1.05, // -10.9 dB → -10.5: jelly zap on the peel
  sfx_jellyfish_bright: 1.06, // -11.5 dB → -11.0: bright-glow crackle
  // Kraken Toes
  sfx_kraken_splash: 1.1, // -11.3 dB → -10.5: water splash
  sfx_kraken_tentacle: 1.05, // -11.4 dB → -11.0: tentacle squelches up
  sfx_kraken_drag: 1.06, // -11.5 dB → -11.0: dragged under, gurgling
  sfx_kraken_squirt: 1.13, // -12.1 dB → -11.0: ink squirt
  sfx_kraken_inked: 1.05, // -11.5 dB → -11.1: ink splats on a pizza
  // Milkshake Max
  sfx_milkshake_freeze: 1.05, // -11.5 dB → -11.1: brain-freeze chime (tell)
  sfx_milkshake_frozen: 1.12, // -11.5 dB → -10.5: brain freeze lands on the peel
  sfx_milkshake_straw: 1.05, // -12.4 dB → -12.0: straw plonks in
  sfx_milkshake_slurp: 0.89, // -12.5 dB → -13.5: slurp, sits under
  sfx_milkshake_snap: 1.33, // -13.0 dB → -10.5: straw snaps
  // Queen of the Rink
  sfx_rinkqueen_puck: 1.17, // -11.9 dB → -10.5: slapshot
  sfx_rinkqueen_roll: 1.01, // -12.1 dB → -12.0: pizzas glide across the ice
  sfx_rinkqueen_dash: 1.22, // -12.2 dB → -10.5: speed-dash swish and ice spray
  // The Lumberjack
  sfx_lumberjack_timber: 1.05, // -11.4 dB → -11.0: tree creak and crack (tell)
  sfx_lumberjack_chainsaw: 1.05, // -12.5 dB → -12.1: chainsaw revs
  sfx_lumberjack_sawbite: 1.1, // -11.3 dB → -10.5: chainsaw bites a pizza
  sfx_lumberjack_axe: 1.05, // -12.4 dB → -12.0: spinning axe
  sfx_lumberjack_thunk: 1.21, // -12.2 dB → -10.5: axe thunks into the table
  // The Yeti Ski Boot
  sfx_yeti_icicle: 1.11, // -12.9 dB → -12.0: icicle forms and cracks loose
  sfx_yeti_iciclehit: 1.3, // -12.8 dB → -10.5: icicle shatters on a pizza
  sfx_yeti_snowball: 1.09, // -12.7 dB → -12.0: snowball packed and thrown
  sfx_yeti_avalanche: 1.08, // -11.2 dB → -10.5: avalanche rumble (tell)
  sfx_yeti_bigball: 1.08, // -11.7 dB → -11.0: big snowball lands
  // The Zombie Loafer
  sfx_poltergeist_groan: 1.05, // -11.4 dB → -11.0: zombie groan (tell)
  sfx_poltergeist_bite: 1.33, // -13.0 dB → -10.5: zombie bite
  sfx_poltergeist_cough: 1.21, // -12.7 dB → -11.0: coughing fit
  sfx_poltergeist_sick: 1.05, // -12.5 dB → -12.1: pizza turns zombie
  sfx_poltergeist_munch: 1.11, // -12.9 dB → -12.0: zombie pizza munches a slice
  // Phantom King
  sfx_phantomking_fade: 1.04, // -12.4 dB → -12.1: ghostly fade
  sfx_phantomking_echo: 1.06, // -11.5 dB → -11.0: ghostly echo appears
  sfx_phantomking_stir: 1.07, // -12.6 dB → -12.0: curse stirs (tell)
  sfx_phantomking_curse: 1.09, // -11.7 dB → -11.0: curse jumps pizzas
  sfx_phantomking_exorcise: 1.05, // -10.9 dB → -10.5: exorcism chime
  // Thrown props (src/game/projectiles.ts; made by scripts/throw-sfx/). Launches fire often, so they sit well under
  // the slap (-14.5); impacts just under it (-12.5); the explosion near it (-11).
  sfx_tosssoft: 0.79, // -12.4 dB → -14.5: soft prop leaves the peel
  sfx_tossflick: 0.81, // -12.7 dB → -14.5: small prop flicked
  sfx_tossspin: 0.84, // -13.0 dB → -14.5: spinning disc thrown
  sfx_tossheavy: 0.78, // -12.4 dB → -14.5: heavy prop heaved
  sfx_tossrope: 0.82, // -12.8 dB → -14.5: ring or lasso swung
  sfx_hitsplat: 1.06, // -13.0 dB → -12.5: soft prop splats
  sfx_hittink: 1.22, // -14.2 dB → -12.5: small hard prop ticks off
  sfx_hitcoin: 0.99, // -12.4 dB → -12.5: coin bonk
  sfx_hitclang: 1.15, // -13.7 dB → -12.5: plate, can or board clangs
  sfx_hitbonk: 1.0, // -12.5 dB → -12.5: rubbery bonk
  sfx_hitthud: 0.99, // -12.4 dB → -12.5: heavy prop lands
  sfx_hitboom: 1.05, // -11.5 dB → -11.0: cannonball or grenade explodes
  sfx_hitrope: 1.02, // -12.7 dB → -12.5: rope snaps tight
  sfx_hitsqueak: 0.99, // -12.4 dB → -12.5: rubber duck squeak
  sfx_hitrattle: 1.26, // -14.5 dB → -12.5: rattle shakes
  sfx_rollrumble: 0.99, // -12.4 dB → -12.5: ball rolls along a lane
  sfx_beam: 1.0, // -12.5 dB → -12.5: beam fires
  // ——— Act 7 · Comics (scripts/act7-audio): the act's weather and villain feet, then each boss's moves ———
  sfx_thunder: 1.05, // -11.4 dB → -11.0: Act 7 weather: thunder after a lightning flash
  sfx_jetpack: 1.09, // -12.8 dB → -12.1: Jetpack Jackboots fly in from the side
  sfx_bombfuse: 1.31, // -14.4 dB → -12.1: Goon Galoshes light a fuse (tell); also a defused bomb
  sfx_bombboom: 1.05, // -10.9 dB → -10.5: a Goon's bomb lands on a pizza
  sfx_gang: 1.05, // -12.4 dB → -12.0: a gang of Henchman Spats arrives
  sfx_lexlugtoe_cash: 1.05, // -11.4 dB → -11.0: HOSTILE TAKEOVER: a pizza is acquired (SOLD!), cash register
  sfx_lexlugtoe_glass: 1.26, // -14.0 dB → -12.0: the glass case drops over the pizza
  sfx_lexlugtoe_lock: 0.88, // -12.4 dB → -13.5: smack on the case's lock
  sfx_lexlugtoe_shatter: 1.26, // -12.5 dB → -10.5: the case breaks open (and his death)
  sfx_lexlugtoe_tags: 1.06, // -12.5 dB → -12.0: his entrance: price tags and coins flutter in
  sfx_doomstomp_roar: 2.02, // -17.1 dB → -11.0: RAMPAGE tell: he roars and paws the table
  sfx_doomstomp_stomp: 1.05, // -9.9 dB → -9.5: each RAMPAGE stomp lands on a pizza (and his entrance)
  sfx_doomstomp_quake: 1.08, // -11.7 dB → -11.0: BONE QUAKE tell: the table shudders
  sfx_doomstomp_spike: 1.07, // -12.5 dB → -11.9: a bone spike bursts up behind a pizza
  sfx_doomstomp_bonebreak: 0.89, // -12.5 dB → -13.5: smack on a bone spike (it snaps on the last)
  sfx_doomstomp_ko: 1.05, // -9.9 dB → -9.5: he's knocked out (a life lost) and his death
  sfx_doomstomp_rise: 1.63, // -15.2 dB → -11.0: he gets back up, bigger
  sfx_doomstomp_dazed: 1.05, // -12.4 dB → -12.0: LAST LIFE: he slumps, dazed (finish him)
  sfx_ultoe_upload: 0.79, // -12.4 dB → -14.4: UPLOAD tell: the UPLOADING bar fills
  sfx_ultoe_glitch: 1.05, // -10.9 dB → -10.5: he jumps bodies: every drone glitches
  sfx_ultoe_boot: 0.89, // -12.5 dB → -13.5: a drone boots up (and his entrance)
  sfx_ultoe_crash: 1.10, // -10.4 dB → -9.6: his death: every drone powers down
  sfx_thanfoot_stone: 1.06, // -12.5 dB → -12.0: a stone streaks across the sky towards the sock (tell)
  sfx_thanfoot_socket: 1.05, // -11.4 dB → -11.0: a stone clicks into the sock
  sfx_thanfoot_stonehit: 0.93, // -12.9 dB → -13.5: smack on a stone in the sock
  sfx_thanfoot_stoneout: 1.11, // -11.4 dB → -10.5: a stone is knocked out of the sock
  sfx_thanfoot_snapwind: 1.10, // -15.3 dB → -14.5: THE SNAP winds up (all six stones in)
  sfx_thanfoot_snap: 1.05, // -9.9 dB → -9.5: THE SNAP lands (and his death)
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
  sfx_fenrir_death: 1.05, // -10.9 dB → -10.5: whimpering howl (death)
  // Thrym the Frost King
  sfx_thrym_enter: 1.14, // -10.7 dB → -9.6: ice cracks and a giant rumble (entrance)
  sfx_thrym_freeze: 1.11, // -11.4 dB → -10.5: a pizza freezes solid
  sfx_thrym_thaw: 1.12, // -11.4 dB → -10.4: ice shell smashed off a pizza
  sfx_thrym_block: 1.12, // -12.0 dB → -11.0: an ice block forms
  sfx_thrym_crack: 0.93, // -12.9 dB → -13.5: ice block takes a hit
  sfx_thrym_shatter: 1.1, // -11.3 dB → -10.5: ice block broken
  sfx_thrym_close: 1.05, // -9.9 dB → -9.5: the fortress walls meet
  sfx_thrym_keystone: 1.05, // -12.4 dB → -12.0: keystone takes a hit
  sfx_thrym_blizzard: 1.1, // -11.8 dB → -11.0: blizzard gust
  sfx_thrym_hail: 1.05, // -12.4 dB → -12.0: falling ice shard
  sfx_thrym_spread: 0.88, // -12.4 dB → -13.5: ice creeps to the next pizza
  sfx_thrym_death: 1.08, // -10.1 dB → -9.4: huge shatter and collapse (death)
  // Jörmungandr
  sfx_jormungandr_enter: 1.13, // -10.5 dB → -9.4: deep sea surge (entrance)
  sfx_jormungandr_surface: 1.08, // -11.7 dB → -11.0: the head rises from the water
  sfx_jormungandr_hiss: 1.14, // -12.2 dB → -11.1: serpent hiss (tell)
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
  sfx_surtr_fuse: 0.89, // -12.5 dB → -13.5: fire runs along the bridge
  sfx_surtr_raise: 1.07, // -11.5 dB → -10.9: sword raised (riser, tell)
  sfx_surtr_window: 1.09, // -11.3 dB → -10.6: the sword flashes: the timing window
  sfx_surtr_sweep: 1.1, // -10.3 dB → -9.5: flaming sword sweeps the table
  sfx_surtr_parry: 1.04, // -9.9 dB → -9.6: perfect counter: the sweep is cancelled
  sfx_surtr_roar: 1.05, // -11.0 dB → -10.6: giant roar
  sfx_surtr_death: 1.08, // -10.2 dB → -9.5: collapse as the fire dies (death)
  // Norse feet
  sfx_frostchill: 0.88, // -12.4 dB → -13.5: frost creeps over a pizza
  sfx_trollstone: 1.05, // -10.9 dB → -10.5: a troll turns to stone
  sfx_draugrrise: 1.05, // -11.4 dB → -11.0: the dead rise again
  sfx_valkyrieswoop: 1.21, // -13.6 dB → -11.9: a pair of clogs swoops in
  sfx_sungap: 1.13, // -12.1 dB → -11.0: the clouds part
  // ——— Act 9 · Greek myths (made by scripts/act9-audio/, same levels as the boss kit above: tells and hits near the
  // slap, signature hits a little over it, repeated ones under it). Feet and Charybdis sounds are core (load at boot).
  // The Minotaur
  sfx_minotaur_bellow: 1.05, // -9.9 dB → -9.5: bull bellow (entrance and phase roar)
  sfx_minotaur_snort: 1.11, // -11.9 dB → -11.0: pawing and steam snort (tell)
  sfx_minotaur_charge: 1.05, // -10.0 dB → -9.6: hooves thunder into a charge
  sfx_minotaur_gore: 1.1, // -11.3 dB → -10.5: horns hit a pizza
  sfx_minotaur_crash: 1.09, // -10.2 dB → -9.5: slams into a stone wall
  sfx_minotaur_walls: 1.06, // -12.5 dB → -12.0: maze walls grind and shift
  // Medusa
  sfx_medusa_glow: 1.04, // -11.3 dB → -11.0: eyes glow (tell)
  sfx_medusa_petrify: 1.05, // -10.9 dB → -10.5: a pizza turns to stone
  sfx_medusa_crack: 0.89, // -12.5 dB → -13.5: a statue cracks under a stomp
  sfx_medusa_crumble: 1.05, // -10.0 dB → -9.6: a statue crumbles
  sfx_medusa_mirror: 1.06, // -12.5 dB → -12.0: mirror shield appears
  sfx_medusa_reflect: 1.11, // -11.4 dB → -10.5: smack on her reflection
  sfx_medusa_cure: 1.1, // -11.4 dB → -10.6: curse broken on a statue
  sfx_medusa_hiss: 1.01, // -12.1 dB → -12.0: snakes hiss
  sfx_medusa_gaze: 1.05, // -11.0 dB → -10.6: the peel caught by her stare
  // Cerberus
  sfx_cerberus_bark: 1.1, // -10.3 dB → -9.5: triple bark (entrance)
  sfx_cerberus_growl: 1.06, // -11.5 dB → -11.0: triple growl (tell)
  sfx_cerberus_fire: 1.1, // -11.3 dB → -10.5: fire breath
  sfx_cerberus_ice: 1.13, // -11.6 dB → -10.5: frost blast
  sfx_cerberus_poison: 1.08, // -11.2 dB → -10.5: poison spit
  sfx_cerberus_howl: 1.1, // -10.3 dB → -9.5: a head beaten, the others go wild
  // Hades and the Titans
  sfx_hades_toll: 1.05, // -10.0 dB → -9.6: death bell (entrance)
  sfx_hades_rise: 1.05, // -10.0 dB → -9.6: a Titan rises from the floor
  sfx_hades_chains: 1.11, // -12.9 dB → -12.0: chains rattle
  sfx_hades_tick: 1.08, // -14.1 dB → -13.4: Kronos clock tick, sits under
  sfx_hades_slow: 1.05, // -11.4 dB → -11.0: time slows (tell)
  sfx_hades_shatter: 1.31, // -12.8 dB → -10.5: hourglass smashed
  sfx_hades_tilt: 0.99, // -10.9 dB → -11.0: Atlas tilts the table (tell)
  sfx_hades_slide: 1.06, // -12.5 dB → -12.0: pizzas slide
  sfx_hades_flare: 1.1, // -11.3 dB → -10.5: Hyperion solar flare
  sfx_hades_douse: 1.09, // -12.7 dB → -12.0: flames smacked out
  sfx_hades_banish: 1.05, // -10.0 dB → -9.6: a Titan sent back
  sfx_hades_shadow: 1.06, // -12.5 dB → -12.0: shadow creeps out
  sfx_hades_grab: 1.08, // -11.2 dB → -10.5: shadow steals a slice
  // Act 9 feet and events
  sfx_sirensong: 0.89, // -12.5 dB → -13.5: Siren Slippers sing, sits under
  sfx_harpy: 1.05, // -11.4 dB → -11.0: Harpy Talons screech and flap
  sfx_eyepoke: 1.05, // -10.9 dB → -10.5: Cyclops Sandals poked in the eye
  sfx_whirlpool: 1.11, // -11.9 dB → -11.0: Charybdis whirlpool opens
  sfx_gulp: 1.05, // -10.9 dB → -10.5: Charybdis swallows
  // Stings are normalised to the music loudness (-16.4 LUFS, like music_gameover). audio.sting() plays
  // them at music volume and does not read TRIM; these gains apply if they're played through sfx().
  music_victory: 2.04, // -15.7 dB → -9.5: the 60-wave finish, a little over the slap
  music_act: 1.74, // -15.3 dB → -10.5: act-complete sting at slap level
};

const AMBIENCE_GAIN = 0.4;

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
    const rate = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
    this.game.sound.play(key, {
      volume: (opts.volume ?? 1) * (TRIM[key] ?? 1) * this.vol('sfx'),
      rate,
      detune: opts.detune ?? 0,
    });
  }

  private lastSlap = 0;

  /** Round-robin through the slap variations (never the same one twice) with pitch variation. */
  slap(intensity = 1): void {
    this.lastSlap = (this.lastSlap + 1 + Math.floor(Math.random() * 2)) % 3;
    this.sfx(`sfx_slap_${this.lastSlap + 1}`, { volume: 0.8 + 0.2 * intensity, rate: 1.06 - 0.12 * intensity, throttle: 25, jitter: 0.1 });
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

  /** One-shot music sting (e.g. game over) that ducks the current music. */
  sting(key: string, volume = 1): void {
    if (!this.game.cache.audio.exists(key)) return;
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
