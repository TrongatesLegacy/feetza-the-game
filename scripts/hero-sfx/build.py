"""Hero peel SFX (src/game/heroMoves.ts, src/game/sightings.ts, src/game/heroFeet.ts): a sound for every signature
move, the transformations' start and end, the sightings, the two new feet, and the Awesome Mix tape.
Built with the boss-sfx kit (../boss-sfx: dsp.py, render.py), so levels are measured the same way.

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR [key-substring ...]   # Kenney CC0 packs (../boss-sfx/getpacks.sh)
  python3 -I integrate.py OUTDIR <repo>                                     # copy, credit (TRIM by hand from report.json)

Levels are the 50 ms RMS peak target after TRIM (the slap is about -10.5): signature moments a touch over it
(-9.5), transformation starts and shouts near it (-10.5), repeated hits under it (-13.5), beds and flybys -14."""
import json
import math
import multiprocessing as mp
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
from dsp import K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant, am, jitter_am, bell, whoosh, thump  # noqa: E402
from render import S, REG, build  # noqa: E402

SIG, START, REF, MID, LOW, BED = -9.5, -10.5, -10.5, -12.0, -13.5, -14.5


def voice(dur, f, vowels, wave='saw', vib=None, q=7):
    """a crude vocal: a saw through formant band-passes."""
    return formant(tone(dur, f, wave, vib=vib), vowels, q=q, amps=[1.0, 0.6, 0.35][:len(vowels)])


def shout(dur, f0, f1, vowels, rasp=0.5, seed=3):
    """a heroic shout: a gliding vocal with breath and a little grit."""
    f = glide([(0, f0), (dur * 0.15, f0 * 1.25), (dur * 0.7, f1 * 1.1), (dur, f1)])
    v = drive(voice(dur, f, vowels, vib=(5.5, 5)), 2.2)
    breath = svf(noise(dur, 'pink', seed=seed), 1800, 0.8, 'bp')
    body = mix(v, gain(jitter_am(breath, 30, rasp, seed=seed), -8))
    return shape(svf(body, 4200, 0.7), [(0, 0), (0.06, 1), (0.75, 0.9), (1, 0)])


def rise(dur, f0, f1, wave='saw', q=2.0):
    return shape(svf(tone(dur, sweep(f0, f1, dur), wave), sweep(f0 * 3, f1 * 4, dur), q, 'lp'), [(0, 0), (0.2, 0.8), (1, 1)])


def sparkle(n_, f0=1400, gap=0.05, d=0.2):
    return mix(*[at(gain(bell(0.4, f0 * (1.12 ** i), d=d), -6 - i), i * gap) for i in range(n_)])


def zap(dur, f0, f1):
    return env(svf(tone(dur, sweep(f0, f1, dur), 'saw'), 3000, 1.0), a=0.002, d=dur / 2, r=0.02)


# ——— transformations: start and end ———
@S('sfx_hero_end', LOW, 0.7, syn='a synthesized falling hiss and puff')
def _():
    hiss = whoosh(0.6, 3000, 500, q=0.9, pts=((0, 0.8), (0.3, 1), (1, 0)))
    return mix(gain(hiss, -2), K('dgt/phaserDown1', rate=1.1, db=-10))


@S('sfx_hero_nightfalls', START, 1.4, syn='a synthesized lights-off clunk and a fluttering bat swarm', fade=0.2)
def _():
    flap = am(svf(noise(1.1, 'pink'), 900, 1.2, 'bp'), 14, 0.9)
    return mix(K('ui/switch_007', rate=0.7), at(K('imp/impactPlate_heavy_001', rate=0.6, db=-8), 0.02), at(gain(shape(flap, [(0, 0), (0.2, 1), (1, 0)]), -4), 0.15),
               at(gain(env(tone(1.0, sweep(220, 110, 1.0), 'tri'), a=0.05, r=0.4), -12), 0.05))


@S('sfx_hero_speedforce', START, 1.1, syn='a synthesized whoosh, crackle and a time-stretch drop')
def _():
    w = whoosh(0.5, 400, 6000, q=1.4, pts=((0, 0), (0.6, 1), (1, 0)))
    crack = grains(0.8, 220, seed=4, dec=0.0008)
    drop = env(tone(0.9, sweep(900, 120, 0.9), 'saw'), a=0.01, r=0.3)
    return mix(gain(w, 0), at(gain(svf(crack, 5000, 0.8, 'hp'), -6), 0.1), at(gain(svf(drop, 2000, 0.8), -10), 0.25), K('dgt/zap1', rate=0.8, db=-8))


@S('sfx_hero_suitup', START, 1.3, syn='synthesized servo whirs between the armour clanks')
def _():
    servo = am(tone(0.9, sweep(300, 900, 0.9), 'sq'), 30, 0.5)
    clanks = mix(*[at(K(r, rate=1.0 + i * 0.08, db=-2 - i), i * 0.16) for i, r in enumerate(['imp/impactMetal_medium_000', 'imp/impactMetal_light_002', 'imp/impactPlate_medium_001', 'imp/impactMetal_heavy_000'])])
    return mix(clanks, gain(svf(servo, 2200, 0.8), -14), at(K('sci/forceField_000', 0, 0.6, db=-6), 0.6))


@S('sfx_hero_berserker', START, 1.0, syn='a synthesized growl under the claws popping out')
def _():
    growl = drive(voice(0.7, glide([(0, 90), (0.3, 120), (0.7, 80)]), [500, 1000, 2400]), 3)
    snikt = mix(*[at(K('rpg/drawKnife2', rate=1.2 + i * 0.1, db=-1), i * 0.07) for i in range(3)])
    return mix(snikt, at(gain(jitter_am(growl, 40, 0.6, seed=2), -6), 0.12))


@S('sfx_hero_giant', START, 1.4, syn='a synthesized swelling growth and a deep thud', fade=0.2)
def _():
    grow = rise(1.0, 60, 240, 'saw', q=1.4)
    return mix(gain(grow, -2), at(gain(thump(0.6, 90, 40, 0.2), 0), 0.9), at(K('imp/impactPunch_heavy_002', rate=0.6, db=-4), 0.9))


@S('sfx_hero_radar', START, 1.2, syn='a synthesized radar ping and heartbeat', fade=0.2)
def _():
    ping = env(tone(0.9, 1320, 'sin', harm=[(1, 1), (2, 0.3)]), a=0.003, d=0.25, r=0.2)
    beat = mix(gain(thump(0.18, 70, 45, 0.06), 0), at(gain(thump(0.18, 65, 40, 0.06), -3), 0.24))
    return mix(gain(ping, -6), at(beat, 0.1), K('sci/forceField_002', 0, 0.5, rate=0.7, db=-12))


@S('sfx_hero_tapeclick', START, 0.8, syn='a synthesized tape-deck clunk and spin-up')
def _():
    spin = am(tone(0.5, sweep(30, 220, 0.4), 'tri'), 18, 0.6)
    return mix(K('ui/switch_003', rate=0.8), at(K('imp/impactPlate_light_001', rate=0.7, db=-6), 0.05), at(gain(spin, -8), 0.1))


@S('sfx_hero_binary', START, 1.3, syn='a synthesized cosmic power-up chord', fade=0.2)
def _():
    chord = mix(*[gain(env(tone(1.1, sweep(f, f * 2, 0.5), 'saw'), a=0.1, r=0.4), -6) for f in (220, 277, 330)])
    return mix(svf(chord, 2600, 0.9), K('dgt/powerUp7', db=-4), at(sparkle(5, 1600), 0.4))


@S('sfx_hero_shazamozza', SIG, 1.6, syn='a synthesized shout of "SHAZAMOZZA!" over a lightning strike', fade=0.25)
def _():
    sh = mix(shout(0.32, 180, 200, [800, 1200, 2600], seed=1), at(shout(0.3, 200, 220, [500, 900, 2400], seed=2), 0.3), at(shout(0.55, 230, 170, [700, 1100, 2500], seed=3), 0.58))
    strike = mix(K('sci/explosionCrunch_000', rate=1.2, db=-2), gain(svf(grains(0.4, 600, seed=5, dec=0.0006), 3000, 0.7, 'hp'), -6))
    return mix(sh, at(strike, 1.05))


@S('sfx_hero_sidekick', START, 0.9, syn='a synthesized cheerful two-note call')
def _():
    call = mix(gain(env(tone(0.16, 880, 'sq'), a=0.003, r=0.04), -8), at(gain(env(tone(0.24, 1320, 'sq'), a=0.003, r=0.08), -8), 0.15))
    return mix(K('imp/impactPunch_medium_001', rate=1.3, db=-3), at(svf(call, 3000, 0.8), 0.06), at(whoosh(0.3, 800, 3000), 0.0))


@S('sfx_hero_heist', START, 1.2, syn='a synthesized sneaky plucked line', fade=0.15)
def _():
    notes = [(0, 220), (0.15, 262), (0.3, 233), (0.45, 196), (0.65, 220)]
    pl = mix(*[at(env(tone(0.2, f, 'tri'), a=0.002, d=0.06, r=0.03), t) for t, f in notes])
    return mix(gain(svf(pl, 1800, 0.8), 0), at(K('rpg/handleCoins', db=-6), 0.7), K('ui/toggle_002', db=-10))


@S('sfx_hero_shift', START, 1.1, syn='a synthesized wobbling morph', fade=0.2)
def _():
    m = am(tone(0.9, glide([(0, 200), (0.4, 600), (0.9, 300)]), 'sin'), glide([(0, 6), (0.9, 24)]), 0.8)
    return mix(gain(formant(m, [600, 1400], q=4), 0), K('dgt/phaseJump3', db=-6), K('sci/slime_001', 0, 0.6, db=-10))


@S('sfx_hero_stretch', START, 0.9, syn='a synthesized rubbery stretch')
def _():
    s = env(tone(0.7, glide([(0, 150), (0.5, 500), (0.7, 260)]), 'saw', vib=(18, 20)), a=0.01, r=0.15)
    return mix(gain(formant(s, [500, 1200], q=4), 0), K('sci/slime_000', 0, 0.4, rate=1.3, db=-8))


@S('sfx_hero_scarab', START, 1.0, syn='a synthesized chitin clatter and power hum')
def _():
    clat = grains(0.4, 180, seed=8, dec=0.002)
    hum = env(tone(0.8, sweep(120, 240, 0.6), 'sq'), a=0.08, r=0.3)
    return mix(gain(svf(clat, 3500, 1.0, 'bp'), -2), at(gain(svf(hum, 1500, 0.8), -10), 0.1), K('sci/forceField_001', 0, 0.8, db=-6))


@S('sfx_hero_overload', START, 1.0, syn='a synthesized electric crackle build')
def _():
    crack = svf(grains(0.9, 400, seed=9, dec=0.0007), 4000, 0.7, 'hp')
    buzz = am(tone(0.9, 120, 'saw'), 60, 0.7)
    return mix(gain(shape(crack, [(0, 0.2), (0.8, 1), (1, 0)]), -2), gain(svf(buzz, 1800, 0.9), -10), K('dgt/zap2', db=-4))


@S('sfx_hero_escrima', START, 0.7, syn=None)
def _():
    return mix(K('imp/impactWood_light_002', rate=1.3), at(K('imp/impactWood_light_000', rate=1.5, db=-2), 0.1), at(K('imp/impactWood_medium_001', rate=1.2, db=-3), 0.2))


@S('sfx_hero_firedup', SIG, 1.4, syn='a synthesized "FIRED UP!" shout and a roaring ignition', fade=0.25)
def _():
    sh = mix(shout(0.28, 200, 230, [700, 1150, 2500], seed=4), at(shout(0.45, 240, 180, [400, 900, 2400], seed=5), 0.26))
    roar = svf(noise(1.0, 'brown'), sweep(300, 1600, 0.9), 0.9, 'lp')
    return mix(sh, at(gain(shape(roar, [(0, 0), (0.25, 1), (1, 0)]), 0), 0.3), at(K('sci/thrusterFire_002', 0, 0.8, db=-4), 0.3))


@S('sfx_hero_bulk', SIG, 1.4, syn='a synthesized "GREEN RAGE!" roar', fade=0.25)
def _():
    d = 1.2
    f = glide([(0, 85), (0.2, 130), (0.8, 110), (d, 70)])
    v = drive(voice(d, f, [600, 1150, 2400], vib=(6, 5)), 3.2)
    return mix(svf(jitter_am(v, 35, 0.5, seed=6), 3600, 0.7), K('imp/impactPunch_heavy_004', rate=0.7, db=-4), K('sci/lowFrequency_explosion_000', 0, 0.9, db=-10))


# ——— signature moves ———
@S('sfx_hero_heatvision', SIG, 2.2, syn='a synthesized charge-up and a searing twin beam', fade=0.3)
def _():
    charge = rise(0.5, 200, 900, 'saw', q=1.6)
    beam = am(svf(tone(1.6, 520, 'saw'), 2400, 1.4, 'bp'), 22, 0.35)
    sizzle = svf(noise(1.6, 'white'), 5000, 0.8, 'hp')
    return mix(gain(charge, -4), at(gain(shape(beam, [(0, 0), (0.05, 1), (0.85, 1), (1, 0)]), 0), 0.45), at(gain(shape(sizzle, [(0, 0), (0.1, 1), (1, 0)]), -14), 0.45), at(K('sci/laserLarge_003', db=-6), 0.45))


@S('sfx_hero_lasso', MID, 0.9, syn='a synthesized lasso swing and a golden shimmer')
def _():
    swing = am(whoosh(0.5, 400, 1600, q=1.3), 8, 0.9)
    return mix(swing, at(K('rpg/beltHandle1', rate=1.1, db=-4), 0.45), at(sparkle(4, 1800, 0.05), 0.5))


@S('sfx_hero_calldeep', START, 1.4, syn='a synthesized deep surge and bubbling water', fade=0.25)
def _():
    surge = svf(noise(1.2, 'brown'), sweep(150, 700, 1.0), 1.1, 'lp')
    return mix(gain(shape(surge, [(0, 0), (0.4, 1), (1, 0)]), 0), gain(bubbles(1.2, 24, seed=3), -8), at(gain(env(tone(0.8, sweep(110, 70, 0.8), 'tri'), a=0.1, r=0.3), -6), 0.1))


@S('sfx_hero_bite', LOW, 0.4, syn='a synthesized snap of jaws')
def _():
    return mix(K('imp/impactPunch_medium_003', rate=1.2), gain(bubbles(0.25, 6, seed=2), -10), K('rpg/chop', rate=1.4, db=-6))


@S('sfx_hero_construct', SIG, 1.4, syn='a synthesized glowing construct forming', fade=0.2)
def _():
    hum = mix(*[gain(env(tone(1.2, sweep(f, f * 1.5, 0.6), 'sin', harm=[(1, 1), (2, 0.4), (3, 0.2)]), a=0.2, r=0.4), -4) for f in (165, 247)])
    return mix(hum, sparkle(6, 900, 0.07, 0.3), at(K('sci/forceField_004', 0, 0.8, db=-6), 0.3))


@S('sfx_hero_sweep', MID, 0.6, syn='a synthesized big glowing swing')
def _():
    return mix(whoosh(0.5, 200, 2400, q=1.0), gain(env(tone(0.4, sweep(330, 165, 0.4), 'tri'), a=0.02, r=0.2), -10))


@S('sfx_hero_webceiling', START, 1.0, syn='synthesized silk thwips')
def _():
    thwip = lambda: shape(svf(noise(0.12, 'white'), sweep(5000, 1500, 0.12), 2, 'bp'), [(0, 0), (0.1, 1), (1, 0)])  # noqa: E731
    return mix(*[at(gain(thwip(), -2 - i), i * 0.12) for i in range(5)], at(K('sci/slime_001', 0, 0.4, rate=1.6, db=-12), 0.1))


@S('sfx_hero_web', LOW, 0.4, syn='a synthesized sticky splat of web')
def _():
    return mix(K('sci/slime_000', 0, 0.3, rate=1.4), gain(shape(svf(noise(0.15), 3500, 2, 'bp'), [(0, 0), (0.1, 1), (1, 0)]), -6))


@S('sfx_hero_repulsor', LOW, 0.4)
def _():
    return mix(K('sci/laserSmall_002', rate=0.9), K('dgt/zap2', rate=1.2, db=-10))


@S('sfx_hero_unibeam', SIG, 1.3, syn='a synthesized charging whine and a heavy beam', fade=0.2)
def _():
    whine = rise(0.35, 400, 2400, 'saw', q=2.0)
    return mix(gain(whine, -6), at(K('sci/laserLarge_000', rate=0.7), 0.3), at(K('sci/explosionCrunch_001', rate=0.9, db=-4), 0.35))


@S('sfx_hero_shield', MID, 0.8, syn=None)
def _():
    return mix(K('imp/impactMetal_heavy_002', rate=1.1), at(K('imp/impactBell_heavy_001', rate=1.4, db=-6), 0.0), at(whoosh(0.4, 600, 2000), 0.05))


@S('sfx_hero_ledger', MID, 0.8, syn='a synthesized pen scratch and a low sting')
def _():
    sting = env(tone(0.5, 110, 'saw'), a=0.01, r=0.3)
    return mix(K('ui/scratch_003', rate=0.9), at(gain(svf(sting, 900, 0.8), -6), 0.2), at(K('ui/scratch_001', db=-4), 0.25))


@S('sfx_hero_quiver', MID, 0.8, syn='synthesized bowstring twangs')
def _():
    tw = lambda f: env(tone(0.25, sweep(f, f * 0.9, 0.25), 'tri', vib=(20, 8)), a=0.002, d=0.07, r=0.03)  # noqa: E731
    return mix(*[at(gain(tw(220 + i * 30), -4), i * 0.17) for i in range(4)], K('rpg/drawKnife1', db=-6))


@S('sfx_hero_slash', LOW, 0.35)
def _():
    return mix(K('rpg/knifeSlice2', rate=1.2), K('rpg/drawKnife3', rate=1.4, db=-8))


@S('sfx_hero_storm', START, 1.6, syn='a synthesized rolling thunderhead and wind', fade=0.3)
def _():
    roll = jitter_am(svf(noise(1.5, 'brown'), 260, 0.8, 'lp'), 18, 0.7, seed=12)
    wind = whoosh(1.5, 300, 900, q=1.0, pts=((0, 0), (0.5, 1), (1, 0.2)))
    return mix(gain(roll, 0), gain(wind, -8), K('sci/lowFrequency_explosion_001', 0, 1.0, db=-8))


@S('sfx_hero_thunder', MID, 0.9, syn='a synthesized lightning crack and rumble')
def _():
    crack = svf(grains(0.15, 900, seed=13, dec=0.0005), 3000, 0.7, 'hp')
    rum = svf(noise(0.8, 'brown'), 200, 0.8, 'lp')
    return mix(gain(crack, 0), at(gain(shape(rum, [(0, 1), (1, 0)]), -2), 0.05))


@S('sfx_hero_optic', SIG, 1.8, syn='a synthesized visor click and a steady humming beam', fade=0.3)
def _():
    beam = am(svf(tone(1.5, 330, 'saw'), 1800, 1.2, 'bp'), 9, 0.25)
    return mix(K('ui/switch_005', rate=0.9, db=-2), at(gain(shape(beam, [(0, 0), (0.05, 1), (0.9, 1), (1, 0)]), 0), 0.12), at(K('sci/laserLarge_002', db=-8), 0.12))


@S('sfx_hero_kinetic', SIG, 1.3, syn='a synthesized purple shockwave boom', fade=0.25)
def _():
    boom = mix(gain(thump(0.9, 120, 35, 0.25), 0), svf(noise(0.9, 'pink'), sweep(2000, 200, 0.8), 0.9, 'lp'))
    return mix(K('dgt/phaserUp3', rate=0.7, db=-6), at(boom, 0.15), at(K('sci/explosionCrunch_003', db=-6), 0.15))


@S('sfx_hero_timestone', SIG, 1.6, syn='a synthesized reversed chime and tape rewind', fade=0.25)
def _():
    chime = list(reversed(mix(*[at(gain(bell(0.9, f, d=0.4), -4), i * 0.06) for i, f in enumerate((660, 880, 990, 1320))])))
    rew = am(tone(1.2, sweep(800, 200, 1.2), 'saw'), sweep(20, 6, 1.2), 0.8)
    return mix(gain(chime, 0), gain(svf(rew, 2400, 1.0), -10), at(sparkle(4, 1200, 0.06), 0.9))


@S('sfx_hero_mystic', MID, 0.9, syn='a synthesized shimmering ward')
def _():
    return mix(sparkle(5, 1046, 0.06, 0.3), K('sci/forceField_000', 0, 0.7, db=-6))


@S('sfx_hero_hex', SIG, 1.2, syn='a synthesized swirling hex spell', fade=0.2)
def _():
    sw = am(tone(1.0, glide([(0, 300), (0.5, 700), (1.0, 400)]), 'tri'), 12, 0.7)
    return mix(gain(formant(sw, [700, 1800], q=3), 0), K('dgt/phaseJump1', db=-6), at(sparkle(6, 1300, 0.05), 0.3))


@S('sfx_hero_shrink', LOW, 0.5)
def _():
    return mix(K('dgt/phaserDown3', rate=1.2), K('dgt/zap1', rate=1.6, db=-10))


@S('sfx_hero_coins', SIG, 1.4, syn='a synthesized rattle of tossed coins', fade=0.2)
def _():
    jingle = mix(*[at(gain(bell(0.25, 2000 + (i * 397) % 900, d=0.1), -8), i * 0.045) for i in range(18)])
    return mix(K('rpg/handleCoins2'), at(K('rpg/handleCoins', db=-2), 0.2), at(jingle, 0.1))


@S('sfx_hero_board', SIG, 1.4, syn='a synthesized cosmic surge', fade=0.25)
def _():
    return mix(whoosh(1.2, 300, 5000, q=1.1, pts=((0, 0), (0.3, 1), (1, 0))), K('sci/spaceEngineSmall_001', 0, 1.0, db=-8), at(sparkle(4, 2000), 0.3))


@S('sfx_hero_whoosh', LOW, 0.5, syn='a synthesized silver whoosh')
def _():
    return whoosh(0.45, 500, 4000, q=1.2)


@S('sfx_hero_crust', SIG, 1.3, syn='a synthesized creaking growth and a warm "I am Crust" hum', fade=0.2)
def _():
    hum = voice(0.9, glide([(0, 140), (0.3, 120), (0.6, 135), (0.9, 110)]), [600, 1000, 2400], wave='tri')
    return mix(K('rpg/creak2', rate=0.8), at(K('rpg/creak1', rate=0.7, db=-4), 0.2), at(gain(shape(hum, [(0, 0), (0.1, 1), (1, 0)]), -4), 0.3))


@S('sfx_hero_biggun', SIG, 1.3, syn=None)
def _():
    shots = mix(*[at(K('sci/laserRetro_001', rate=0.8 + (i % 3) * 0.1, db=-2), i * 0.09) for i in range(8)])
    return mix(K('rpg/metalLatch', db=-4), at(shots, 0.08))


@S('sfx_hero_photon', LOW, 0.4)
def _():
    return mix(K('dgt/laser4', rate=1.2), K('imp/impactGlass_light_001', rate=1.3, db=-10))


@S('sfx_hero_boomtube', SIG, 1.6, syn='a synthesized portal whoomp and swirl', fade=0.3)
def _():
    swirl = am(svf(noise(1.4, 'pink'), sweep(400, 2400, 1.0), 2.0, 'bp'), sweep(4, 18, 1.4), 0.7)
    whoomp = mix(gain(thump(0.6, 160, 40, 0.2), 0), K('sci/forceField_003', 0, 0.6, rate=0.6, db=-4))
    return mix(whoomp, at(gain(swirl, -4), 0.1), at(K('sci/lowFrequency_explosion_000', 0, 0.8, db=-10), 1.0))


@S('sfx_hero_boing', LOW, 0.4, syn='a synthesized rubber boing')
def _():
    return env(tone(0.35, glide([(0, 180), (0.05, 420), (0.35, 260)]), 'tri', vib=(22, 30)), a=0.002, d=0.12, r=0.05)


@S('sfx_hero_arrow', MID, 0.6, syn=None)
def _():
    return mix(K('rpg/drawKnife1', rate=1.3, db=-2), at(whoosh(0.3, 1000, 4000, q=1.6), 0.05))


@S('sfx_hero_boxing', SIG, 0.8, syn='a synthesized spring boing under the punch')
def _():
    spring = env(tone(0.5, glide([(0, 300), (0.05, 600), (0.5, 340)]), 'tri', vib=(28, 40)), a=0.002, d=0.15, r=0.05)
    return mix(K('imp/impactPunch_heavy_001', rate=0.9), gain(spring, -6), at(whoosh(0.4, 600, 200), 0.05))


@S('sfx_hero_dive', SIG, 1.1, syn='a synthesized screaming dive and a ground slam')
def _():
    scream = env(tone(0.5, sweep(1800, 600, 0.5), 'saw'), a=0.02, r=0.1)
    return mix(gain(svf(scream, 3000, 1.0), -8), whoosh(0.45, 800, 3000, q=1.2), at(K('imp/impactPunch_heavy_000', rate=0.8), 0.38), at(gain(thump(0.5, 90, 40, 0.15), -2), 0.38))


@S('sfx_hero_blast', LOW, 0.35)
def _():
    return mix(K('sci/laserSmall_000', rate=1.1), K('dgt/pepSound2', db=-8))


@S('sfx_hero_sponsored', SIG, 1.4, syn='a synthesized cash-register ding and a golden beam', fade=0.2)
def _():
    ding = mix(gain(bell(0.6, 1760, d=0.3), -2), at(gain(bell(0.6, 2637, d=0.3), -4), 0.08))
    beam = am(svf(tone(1.0, 440, 'saw'), 2600, 1.2, 'bp'), 14, 0.3)
    return mix(K('rpg/handleCoins'), at(ding, 0.05), at(gain(shape(beam, [(0, 0), (0.1, 1), (1, 0)]), -4), 0.3))


@S('sfx_hero_backwards', SIG, 1.3, syn='a reversed synthesized magic chime and whoosh', fade=0.2)
def _():
    fwd = mix(sparkle(6, 1200, 0.06, 0.3), whoosh(0.8, 3000, 400, q=1.2))
    return mix(list(reversed(fwd)), at(K('dgt/phaseJump4', db=-6), 0.6))


@S('sfx_hero_bog', START, 1.5, syn='a synthesized swampy gloop and bubbles', fade=0.25)
def _():
    gloop = mix(*[at(env(tone(0.2, sweep(120 + i * 20, 60, 0.2), 'sin'), a=0.01, d=0.07, r=0.03), i * 0.18) for i in range(6)])
    return mix(gain(gloop, 0), gain(bubbles(1.4, 30, 120, 500, seed=6), -4), K('sci/slime_001', 0, 1.0, rate=0.7, db=-6))


@S('sfx_hero_stick', LOW, 0.3)
def _():
    return mix(K('imp/impactWood_light_003', rate=1.4), K('imp/impactPunch_medium_000', rate=1.5, db=-8))


@S('sfx_hero_penance', SIG, 1.6, syn='a synthesized hellish drone and a fire burst', fade=0.3)
def _():
    drone = drive(mix(tone(1.2, 55, 'saw'), gain(tone(1.2, 58, 'saw'), -2)), 2.5)
    fire = svf(noise(0.8, 'pink'), 1400, 0.8, 'lp')
    return mix(gain(svf(shape(drone, [(0, 0), (0.3, 1), (1, 0.6)]), 900, 0.8), -2), at(gain(shape(fire, [(0, 0), (0.1, 1), (1, 0)]), -2), 0.9), at(K('sci/thrusterFire_000', 0, 0.6, db=-6), 0.9))


@S('sfx_hero_chain', LOW, 0.6, syn=None)
def _():
    return mix(K('rpg/beltHandle2', rate=0.8), at(K('sci/thrusterFire_003', 0, 0.4, rate=1.2, db=-6), 0.05))


@S('sfx_hero_crescent', SIG, 1.0, syn='synthesized whistling blades')
def _():
    blades = mix(*[at(gain(whoosh(0.3, 2000 + i * 300, 6000, q=3.0), -4), i * 0.03) for i in range(6)])
    return mix(K('rpg/drawKnife2', rate=1.3, db=-4), blades, at(gain(bell(0.5, 2400, d=0.2), -10), 0.05))


@S('sfx_hero_objection', SIG, 1.4, syn='a synthesized "OBJECTION!" shout and a gavel bang', fade=0.25)
def _():
    sh = mix(shout(0.22, 210, 240, [500, 900, 2400], seed=7), at(shout(0.22, 240, 250, [800, 1200, 2600], seed=8), 0.2), at(shout(0.4, 260, 190, [450, 1100, 2400], seed=9), 0.4))
    return mix(sh, at(K('imp/impactWood_heavy_002', rate=0.9), 0.8), at(K('imp/impactPlank_medium_001', rate=0.8, db=-2), 0.82))


@S('sfx_hero_buzz', MID, 1.3, syn='a synthesized wasp buzz', fade=0.2)
def _():
    src = tone(1.2, glide([(0, 220), (0.6, 260), (1.2, 240)]), 'saw', vib=(9, 14))
    b = am(drive(formant(src, [900, 2200], q=2.5, amps=[1.0, 0.6]), 2.5), 30, 0.35)
    return shape(b, [(0, 0), (0.1, 1), (0.85, 1), (1, 0)])


@S('sfx_hero_cards', SIG, 1.1, syn=None)
def _():
    return mix(K('cas/card-fan-1'), at(K('cas/card-shuffle', 0, 0.5, db=-2), 0.1), at(K('dgt/powerUp3', rate=1.2, db=-8), 0.2))


@S('sfx_hero_ice', START, 1.3, syn='a synthesized crackling freeze', fade=0.2)
def _():
    crack = svf(grains(1.0, 300, seed=14, dec=0.001), 4000, 0.8, 'hp')
    shim = sparkle(5, 2200, 0.08, 0.2)
    return mix(gain(shape(crack, [(0, 0.3), (0.3, 1), (1, 0)]), -2), shim, K('imp/impactGlass_medium_002', rate=1.2, db=-4))


@S('sfx_hero_elastic', SIG, 1.1, syn='a synthesized boingy stretch-and-snap')
def _():
    st = env(tone(0.9, glide([(0, 120), (0.6, 640), (0.9, 200)]), 'saw', vib=(16, 30)), a=0.02, r=0.2)
    return mix(gain(formant(st, [600, 1500], q=4), 0), at(K('imp/impactPunch_medium_002', rate=1.2, db=-4), 0.7))


@S('sfx_hero_squirrels', SIG, 1.4, syn='synthesized chittering and pattering feet', fade=0.2)
def _():
    chit = mix(*[at(env(tone(0.06, 2600 + (i * 211) % 900, 'sq'), a=0.002, r=0.02), i * 0.05) for i in range(20)])
    patter = mix(*[at(K('imp/footstep_carpet_00%d' % (i % 5), rate=2.0, db=-8), i * 0.06) for i in range(16)])
    return mix(gain(svf(chit, 4000, 1.0, 'bp'), -4), patter)


@S('sfx_hero_gadget', MID, 0.5, syn=None)
def _():
    return mix(K('rpg/metalClick', db=3), at(K('ui/switch_002', db=-1), 0.05), at(K('imp/impactMetal_light_000', rate=1.4, db=-4), 0.02))


@S('sfx_hero_ping', MID, 0.5, syn='a synthesized bracer ping')
def _():
    return mix(gain(bell(0.4, 2093, d=0.15), -2), K('imp/impactMetal_light_001', rate=1.6, db=-6))


@S('sfx_hero_blur', LOW, 0.4, syn='a synthesized speedy zip')
def _():
    return mix(whoosh(0.25, 2000, 7000, q=2.0), gain(zap(0.2, 1800, 600), -10))


@S('sfx_hero_snip', MID, 0.4, syn=None)
def _():
    return mix(K('rpg/knifeSlice', rate=1.4), K('ui/pluck_002', rate=1.2, db=-6))


# ——— sightings and secrets ———
@S('sfx_hero_flyby', BED, 1.6, syn='a synthesized doppler whoosh', fade=0.3)
def _():
    return whoosh(1.5, 300, 3000, q=1.3, pts=((0, 0), (0.45, 1), (0.6, 0.9), (1, 0)))


@S('sfx_hero_glint', BED, 1.2, syn='a synthesized glint and hum')
def _():
    return mix(gain(bell(0.8, 3136, d=0.3), -2), gain(env(tone(1.0, 220, 'saw'), a=0.2, r=0.3), -20), at(gain(bell(0.5, 4186, d=0.2), -6), 0.4))


@S('sfx_hero_saucer', BED, 1.6, syn='a synthesized warbling saucer', fade=0.3)
def _():
    return shape(tone(1.5, lambda t: 600 + 180 * math.sin(2 * math.pi * 7 * t), 'sin', harm=[(1, 1), (2, 0.3)]), [(0, 0), (0.2, 1), (0.8, 1), (1, 0)])


@S('sfx_hero_magic', BED, 1.4, syn='a synthesized magic twinkle', fade=0.2)
def _():
    return mix(sparkle(7, 1500, 0.09, 0.25), whoosh(1.2, 800, 2400, q=1.0))


@S('sfx_hero_squeak', BED, 1.4, syn='synthesized squeaky chitters', fade=0.2)
def _():
    return mix(*[at(env(tone(0.07, glide([(0, 2400), (0.07, 3200)]), 'sq'), a=0.002, r=0.02), i * 0.11) for i in range(10)])


@S('sfx_hero_catch', REF, 0.9, syn='a synthesized heroic three-note fanfare')
def _():
    notes = [(0, 523), (0.1, 659), (0.2, 784), (0.3, 1046)]
    fan = mix(*[at(env(tone(0.35, f, 'sq'), a=0.004, d=0.15, r=0.05), t) for t, f in notes])
    return mix(gain(svf(fan, 3500, 0.8), -2), K('imp/impactPunch_medium_004', rate=1.2, db=-8), at(sparkle(3, 2000), 0.3))


@S('sfx_hero_secret', REF, 1.2, syn='a synthesized mysterious discovery chime', fade=0.2)
def _():
    notes = [(0, 392), (0.12, 466), (0.24, 587), (0.4, 784)]
    return mix(*[at(gain(bell(0.7, f, d=0.35), -3), t) for t, f in notes], K('ui/maximize_006', db=-8))


# ——— the Awesome Mix tape: 12 s of an original retro groove (120 bpm, A minor), with wow and hiss ———
@S('music_tape', -13.0, 12.2, syn='an original synthesized retro groove (bass, drums, square lead) with tape wow and hiss', fade=0.5)
def _():
    beat = 0.5
    dur = 12.0
    bass_notes = [55, 55, 65.4, 73.4, 55, 55, 49, 61.7]  # A, A, C, D, A, A, G, B (per two beats)
    def bass_f(t):
        return bass_notes[int(t / (beat * 2)) % len(bass_notes)]
    bass = svf(tone(dur, bass_f, 'saw'), 700, 1.1)
    bass = am(bass, 1 / beat, 0.6)
    lead_seq = [440, 0, 523, 494, 440, 0, 392, 440, 523, 587, 659, 0, 587, 523, 494, 440]
    def lead_f(t):
        return lead_seq[int(t / (beat / 2)) % len(lead_seq)] or 1.0
    lead = tone(dur, lead_f, 'sq')
    gate = [1.0 if lead_seq[int((i / 44100) / (beat / 2)) % len(lead_seq)] else 0.0 for i in range(len(lead))]
    lead = [v * g for v, g in zip(lead, gate)]
    lead = svf(lead, 2400, 0.8)
    kicks = mix(*[at(thump(0.3, 120, 45, 0.08), i * beat) for i in range(int(dur / beat))])
    snares = mix(*[at(gain(shape(svf(noise(0.2, 'white', seed=i), 1800, 0.8, 'bp'), [(0, 1), (1, 0)]), -4), i * beat + beat) for i in range(0, int(dur / beat), 2)])
    hats = mix(*[at(gain(shape(svf(noise(0.05, 'white', seed=100 + i), 7000, 0.8, 'hp'), [(0, 1), (1, 0)]), -14), i * beat / 2 + beat / 4) for i in range(int(dur / beat * 2))])
    groove = mix(gain(bass, -2), gain(lead, -10), gain(kicks, 0), snares, hats)
    # tape wow: a slow pitch wobble, then a warm low-pass and a little hiss
    wow = []
    L = len(groove)
    for i in range(L):
        p = i + 60 * math.sin(2 * math.pi * 0.7 * i / 44100)
        j = int(p)
        wow.append(groove[min(max(j, 0), L - 1)])
    warm = svf(wow, 5200, 0.7)
    hiss = gain(svf(noise(dur, 'white', seed=77), 6000, 0.8, 'hp'), -34)
    return mix(warm, hiss)


def job(i):
    try:
        return build(REG[i], sys.argv[1])
    except Exception:
        return dict(key=REG[i]['key'], error=traceback.format_exc())


if __name__ == '__main__':
    out = sys.argv[1]
    sel = sys.argv[2:]
    os.makedirs(out, exist_ok=True)
    keys = [r['key'] for r in REG]
    dup = {k for k in keys if keys.count(k) > 1}
    if dup:
        sys.exit(f'duplicate keys {dup}')
    idx = [i for i, r in enumerate(REG) if not sel or any(s in r['key'] for s in sel)]
    with mp.get_context('fork').Pool(8) as p:
        res = p.map(job, idx)
    rp = os.path.join(out, 'report.json')
    old = {d['key']: d for d in json.load(open(rp))} if os.path.exists(rp) else {}
    for d in res:
        old[d['key']] = d
    json.dump([old[k] for k in keys if k in old], open(rp, 'w'), indent=1)
    for d in res:
        if 'error' in d:
            print('ERROR', d['key'], d['error'])
        else:
            print(f"{d['key']:24s} dur={d['dur']:.2f} meas={d['measured']:6.1f} tgt={d['target']:6.1f} trim={d['trim']:.2f} peak={d['peak']:5.1f} lead={d['lead']:4.1f} clip={d['clip']}")
    print(len(REG), 'recipes')
