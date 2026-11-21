"""Act 7 · Comics sound effects: the four bosses' moves (sfx_<boss>_<move>, loaded a wave ahead of each fight) and
the act's own one-word sounds (thunder, jetpack, bomb fuse and blast, the henchman gang's whistle).
Built on the boss-sfx kit in ../boss-sfx (dsp.py, render.py).

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR      # renders every recipe here and writes report.json
  python3 -I integrate.py OUTDIR REPO                      # copies MP3s, adds TRIM lines and credits

Levels are the 50 ms RMS peak target after TRIM: REF -10.5 (slap), HI -9.5, TELL -11, MID -12, LOW -13.5, BED -14.5."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'boss-sfx'))
from dsp import (K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant,  # noqa: E402,F401
                 am, bell, whoosh, thump, fx)
from render import S  # noqa: E402

REF, HI, TELL, MID, LOW, BED = -10.5, -9.5, -11.0, -12.0, -13.5, -14.5

# where each sound plays (for credits and the TRIM comments)
WHERE = {}


def where(key, text):
    WHERE[key] = text


# ======================= act sounds (one word: loaded at boot) =======================
where('sfx_thunder', 'Act 7 weather: thunder after a lightning flash')


@S('sfx_thunder', TELL, 3.2, syn='a synthesized rolling thunder rumble')
def _():
    crack = env(svf(noise(0.3, 'white'), 2400, 0.8, 'hp'), a=0.001, d=0.06, r=0.05)
    roll = shape(svf(noise(3.0, 'brown'), 160, 0.7, 'lp'), [(0, 0), (0.06, 1), (0.3, 0.7), (0.55, 0.85), (1, 0)])
    return mix(gain(crack, -10), gain(drive(roll, 2.0), 0), K('sci/lowFrequency_explosion_000', db=-6, rate=0.8))


where('sfx_jetpack', 'Jetpack Jackboots fly in from the side')


@S('sfx_jetpack', MID, 1.3, syn='a synthesized jet roar swelling past')
def _():
    roar = shape(svf(noise(1.2, 'pink'), sweep(500, 1800, 1.2), 0.9, 'bp'), [(0, 0), (0.4, 1), (1, 0)])
    return mix(gain(roar, -2), K('sci/thrusterFire_002', db=-4))


where('sfx_bombfuse', 'Goon Galoshes light a fuse (tell); also a defused bomb')


@S('sfx_bombfuse', MID, 0.9, syn='a synthesized fizzing fuse')
def _():
    fizz = env(svf(grains(0.9, 900, seed=3), 5000, 0.7, 'hp'), a=0.01, r=0.15)
    return mix(gain(fizz, 0), K('ui/scratch_002', db=-10, rate=1.5))


where('sfx_bombboom', 'a Goon\'s bomb lands on a pizza')


@S('sfx_bombboom', REF, 1.2, syn='a synthesized cartoon blast')
def _():
    return mix(K('sci/explosionCrunch_002'), gain(thump(0.5, 140, 50, 0.15), -2), K('imp/impactPlate_heavy_000', db=-10))


where('sfx_gang', 'a gang of Henchman Spats arrives')


@S('sfx_gang', MID, 1.0, syn='a synthesized two-note gangster whistle')
def _():
    w1 = env(tone(0.22, glide([(0, 1400), (0.2, 1900)]), 'sin', vib=(6, 0.01)), a=0.01, r=0.04)
    w2 = env(tone(0.38, glide([(0, 1900), (0.3, 1200)]), 'sin', vib=(6, 0.01)), a=0.01, r=0.08)
    return mix(at(w1, 0), at(w2, 0.27), at(K('rpg/footstep03', db=-8), 0.5), at(K('rpg/footstep05', db=-8), 0.65))


# ======================= Lex Lugtoe =======================
where('sfx_lexlugtoe_cash', 'HOSTILE TAKEOVER: a pizza is acquired (SOLD!), cash register')


@S('sfx_lexlugtoe_cash', TELL, 1.0, syn='a synthesized cash-register bell')
def _():
    return mix(K('cas/chips-stack-3'), at(gain(bell(0.8, 2093, d=0.35), -4), 0.12), at(K('rpg/handleCoins', db=-4), 0.05))


where('sfx_lexlugtoe_glass', 'the glass case drops over the pizza')


@S('sfx_lexlugtoe_glass', MID, 0.8, syn=None)
def _():
    return mix(K('imp/impactGlass_heavy_001'), K('imp/impactMetal_light_001', db=-8))


where('sfx_lexlugtoe_lock', 'smack on the case\'s lock')


@S('sfx_lexlugtoe_lock', LOW, 0.4, syn=None)
def _():
    return mix(K('rpg/metalClick', rate=1.1), K('imp/impactMetal_light_003', db=-6))


where('sfx_lexlugtoe_shatter', 'the case breaks open (and his death)')


@S('sfx_lexlugtoe_shatter', REF, 1.2, syn=None)
def _():
    return mix(K('imp/impactGlass_heavy_003'), at(K('imp/impactGlass_medium_002', db=-3), 0.08), at(K('imp/impactGlass_light_004', db=-6), 0.2))


where('sfx_lexlugtoe_tags', 'his entrance: price tags and coins flutter in')


@S('sfx_lexlugtoe_tags', MID, 1.2, syn=None)
def _():
    return mix(K('rpg/bookFlip2'), at(K('rpg/handleCoins2', db=-3), 0.2), at(K('cas/chips-collide-2', db=-4), 0.5))


# ======================= Doomstomp =======================
where('sfx_doomstomp_roar', 'RAMPAGE tell: he roars and paws the table')


@S('sfx_doomstomp_roar', TELL, 1.4, syn='a synthesized monster roar')
def _():
    src = drive(tone(1.3, glide([(0, 70), (0.3, 110), (1.3, 60)]), 'saw', vib=(9, 0.04)), 3)
    v = formant(src, [480, 950, 2300], q=5)
    gr = env(svf(noise(1.3, 'pink'), 700, 0.8, 'bp'), a=0.05, r=0.4)
    return shape(mix(v, gain(gr, -6)), [(0, 0), (0.1, 1), (0.7, 0.8), (1, 0)])


where('sfx_doomstomp_stomp', 'each RAMPAGE stomp lands on a pizza (and his entrance)')


@S('sfx_doomstomp_stomp', HI, 0.9, syn='a synthesized sub thud')
def _():
    return mix(gain(thump(0.6, 120, 38, 0.2), 0), K('imp/impactMining_001', db=-4), K('sci/lowFrequency_explosion_001', db=-8))


where('sfx_doomstomp_quake', 'BONE QUAKE tell: the table shudders')


@S('sfx_doomstomp_quake', TELL, 1.4, syn='a synthesized earth rumble')
def _():
    r = shape(drive(svf(noise(1.4, 'brown'), 120, 0.7, 'lp'), 2), [(0, 0), (0.2, 1), (1, 0)])
    return mix(r, at(K('imp/impactPlank_medium_002', db=-6), 0.05), at(K('imp/impactPlank_medium_003', db=-8), 0.35))


where('sfx_doomstomp_spike', 'a bone spike bursts up behind a pizza')


@S('sfx_doomstomp_spike', MID, 0.6, syn=None)
def _():
    return mix(K('imp/impactMining_003'), K('rpg/drawKnife2', db=-4))


where('sfx_doomstomp_bonebreak', 'smack on a bone spike (it snaps on the last)')


@S('sfx_doomstomp_bonebreak', LOW, 0.5, syn=None)
def _():
    return mix(K('imp/impactPlank_medium_001', rate=1.3), K('rpg/chop', db=-4))


where('sfx_doomstomp_ko', 'he\'s knocked out (a life lost) and his death')


@S('sfx_doomstomp_ko', HI, 1.6, syn='a synthesized boxing-bell double ding')
def _():
    b = gain(bell(1.2, 880, d=0.5), -2)
    return mix(K('imp/impactBell_heavy_002', db=-2), at(b, 0.0), at(b, 0.35), at(K('imp/impactMining_000', db=-6), 0.05))


where('sfx_doomstomp_rise', 'he gets back up, bigger')


@S('sfx_doomstomp_rise', TELL, 1.4, syn='a synthesized swelling growl')
def _():
    src = drive(tone(1.3, glide([(0, 50), (1.1, 140)]), 'saw'), 2.5)
    v = formant(src, [380, 800, 2100], q=5)
    return mix(shape(v, [(0, 0), (0.6, 1), (1, 0)]), K('dgt/powerUp4', db=-12, rate=0.6))


where('sfx_doomstomp_dazed', 'LAST LIFE: he slumps, dazed (finish him)')


@S('sfx_doomstomp_dazed', MID, 1.5, syn='synthesized circling cartoon tweets')
def _():
    tw = []
    for i in range(5):
        tw.append(at(env(tone(0.12, glide([(0, 2400), (0.1, 3100)]), 'sin'), a=0.005, r=0.05), i * 0.24))
        tw.append(at(gain(env(tone(0.1, glide([(0, 2900), (0.09, 2300)]), 'sin'), a=0.005, r=0.04), -3), i * 0.24 + 0.12))
    return mix(*tw, K('ui/glitch_003', db=-16))


# ======================= Ultoe =======================
where('sfx_ultoe_upload', 'UPLOAD tell: the UPLOADING bar fills')


@S('sfx_ultoe_upload', BED, 2.2, syn='a synthesized rising data chirp')
def _():
    chirps = []
    for i in range(16):
        f = 600 + i * 110
        chirps.append(at(env(tone(0.05, f, 'saw'), a=0.002, r=0.01), i * 0.12))
    riser = shape(tone(2.0, sweep(200, 900, 2.0), 'saw'), [(0, 0), (0.8, 1), (1, 0)])
    return mix(*chirps, gain(svf(riser, 1500, 0.8, 'lp'), -8))


where('sfx_ultoe_glitch', 'he jumps bodies: every drone glitches')


@S('sfx_ultoe_glitch', REF, 0.7, syn=None)
def _():
    return mix(K('ui/glitch_002'), at(K('ui/glitch_004', db=-2), 0.1), K('dgt/zapThreeToneDown', db=-6))


where('sfx_ultoe_boot', 'a drone boots up (and his entrance)')


@S('sfx_ultoe_boot', LOW, 0.8, syn=None)
def _():
    return mix(K('sci/computerNoise_001', 0, 0.5), K('dgt/powerUp2', db=-6))


where('sfx_ultoe_crash', 'his death: every drone powers down')


@S('sfx_ultoe_crash', HI, 1.6, syn='a synthesized power-down whine')
def _():
    w = shape(tone(1.4, sweep(900, 60, 1.4), 'saw'), [(0, 1), (1, 0)])
    return mix(K('sci/explosionCrunch_000'), gain(svf(w, 2000, 0.7, 'lp'), -6), at(K('ui/glitch_001', db=-4), 0.1))


# ======================= Thanfoot =======================
where('sfx_thanfoot_stone', 'a stone streaks across the sky towards the sock (tell)')


@S('sfx_thanfoot_stone', MID, 1.2, syn='a synthesized shimmering streak')
def _():
    s = whoosh(1.1, 600, 4000, q=2.0)
    sh = env(tone(1.1, sweep(1200, 2400, 1.1), 'tri', vib=(14, 0.02)), a=0.2, r=0.2)
    return mix(s, gain(sh, -10))


where('sfx_thanfoot_socket', 'a stone clicks into the sock')


@S('sfx_thanfoot_socket', TELL, 0.8, syn='a synthesized crystal chime')
def _():
    return mix(K('rpg/metalLatch'), at(gain(bell(0.7, 1568, d=0.3), -5), 0.03))


where('sfx_thanfoot_stonehit', 'smack on a stone in the sock')


@S('sfx_thanfoot_stonehit', LOW, 0.4, syn=None)
def _():
    return mix(K('imp/impactGlass_light_002', rate=1.1), K('imp/impactBell_heavy_000', db=-14, rate=1.6))


where('sfx_thanfoot_stoneout', 'a stone is knocked out of the sock')


@S('sfx_thanfoot_stoneout', REF, 0.9, syn='a synthesized falling sparkle')
def _():
    sp = env(tone(0.7, sweep(2600, 900, 0.7), 'tri'), a=0.002, d=0.2, r=0.05)
    return mix(K('imp/impactGlass_medium_003'), gain(sp, -6))


where('sfx_thanfoot_snapwind', 'THE SNAP winds up (all six stones in)')


@S('sfx_thanfoot_snapwind', BED, 3.2, syn='a synthesized choir-like riser')
def _():
    ch = formant(tone(3.0, glide([(0, 110), (3, 220)]), 'saw', vib=(5, 0.01)), [600, 1050, 2400], q=6)
    return shape(mix(ch, gain(whoosh(3.0, 200, 3000, q=1.0), -6)), [(0, 0), (0.85, 1), (1, 0.3)])


where('sfx_thanfoot_snap', 'THE SNAP lands (and his death)')


@S('sfx_thanfoot_snap', HI, 2.2, syn='a synthesized finger snap and a dust-wind swell')
def _():
    snap = env(svf(noise(0.06, 'white'), 2600, 1.5, 'bp'), a=0.0005, d=0.012, r=0.01)
    dust = shape(svf(noise(2.0, 'pink'), sweep(3000, 400, 2.0), 0.8, 'lp'), [(0, 0), (0.1, 1), (1, 0)])
    return mix(gain(snap, 4), at(gain(dust, -4), 0.05), at(K('sci/lowFrequency_explosion_001', db=-6), 0.02))


where('sfx_thanfoot_portal', 'his entrance and the SPACE stone\'s blinks')


@S('sfx_thanfoot_portal', MID, 1.0, syn=None)
def _():
    return mix(K('sci/forceField_002'), K('dgt/phaseJump3', db=-4))


where('sfx_thanfoot_power', 'a stone power fires (POWER, REALITY, TIME)')


@S('sfx_thanfoot_power', MID, 0.9, syn=None)
def _():
    return mix(K('dgt/powerUp7'), K('sci/forceField_000', db=-6))
