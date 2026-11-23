"""God peel SFX (src/game/godMoves.ts, src/game/acts/gods.ts): a sound for every god's signature move, the Kratos
Peel's rage (shout, fire loop, flaming smacks, blades and the end hiss), the God Peel (Divine Feast and its reveal),
and the two new feet (Persian Elephant Feet and Spartan Sandals). Every layer is synthesized here, so all of it is
CC0. Built with the boss-sfx kit (../boss-sfx: dsp.py, render.py), so levels are measured the same way.

  KENNEY=/none python3 -I build.py OUTDIR [key-substring ...]
  python3 -I ../hero-sfx/integrate.py OUTDIR <repo>   (or copy by hand; credits and TRIM are in the repo)

Levels are the 50 ms RMS peak target after TRIM (the slap is about -10.5): signature moments a touch over it
(-9.5), shouts near it (-10.5), repeated hits under it (-13.5), loops and beds -14.5."""
import json
import math
import multiprocessing as mp
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
from dsp import mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, svf, formant, am, jitter_am, bell, whoosh, thump  # noqa: E402
from render import S, REG, build  # noqa: E402

SIG, START, REF, MID, LOW, BED = -9.5, -10.5, -10.5, -12.0, -13.5, -14.5


def voice(dur, f, vowels, wave='saw', vib=None, q=7):
    return formant(tone(dur, f, wave, vib=vib), vowels, q=q, amps=[1.0, 0.6, 0.35][:len(vowels)])


def shout(dur, f0, f1, vowels, rasp=0.5, seed=3):
    f = glide([(0, f0), (dur * 0.15, f0 * 1.25), (dur * 0.7, f1 * 1.1), (dur, f1)])
    v = drive(voice(dur, f, vowels, vib=(5.5, 5)), 2.4)
    breath = svf(noise(dur, 'pink', seed=seed), 1800, 0.8, 'bp')
    body = mix(v, gain(jitter_am(breath, 30, rasp, seed=seed), -8))
    return shape(svf(body, 4200, 0.7), [(0, 0), (0.06, 1), (0.75, 0.9), (1, 0)])


def chord(dur, freqs, wave='saw', cut=2200, pts=((0, 0), (0.15, 1), (0.8, 0.8), (1, 0)), vib=(5, 3)):
    return shape(svf(mix(*[gain(tone(dur, f, wave, vib=vib), -4) for f in freqs]), cut, 0.8), list(pts))


def choir(dur, freqs, vowels=(700, 1150, 2800), pts=((0, 0), (0.2, 1), (0.8, 0.9), (1, 0))):
    """an 'aah' choir: detuned voices through formants."""
    vs = []
    for i, f in enumerate(freqs):
        for d in (-1.5, 1.5):
            vs.append(gain(voice(dur, f + d, list(vowels), vib=(4.8 + i * 0.3, 3)), -6))
    return shape(mix(*vs), list(pts))


def crack(dur=0.15, seed=1):
    return svf(grains(dur, 900, seed=seed, dec=0.0005), 3000, 0.7, 'hp')


def rumble(dur, fc=220, seed=2):
    return svf(noise(dur, 'brown', seed=seed), fc, 0.8, 'lp')


def fire(dur, seed=4):
    roar = svf(noise(dur, 'pink', seed=seed), 700, 0.6, 'lp')
    crackle = svf(grains(dur, 140, seed=seed + 1, dec=0.001), 2500, 0.8, 'hp')
    return mix(jitter_am(roar, 12, 0.5, seed=seed), gain(crackle, -6))


def horn(dur, f, bright=1800):
    body = mix(tone(dur, f, 'saw', vib=(4, 2)), gain(tone(dur, f * 1.5, 'saw', vib=(4.4, 2)), -8))
    return shape(svf(drive(body, 1.6), sweep(500, bright, dur * 0.3), 1.2), [(0, 0), (0.1, 1), (0.85, 0.85), (1, 0)])


def chime(n_, f0=1200, step=1.19, gap=0.06, d=0.3):
    return mix(*[at(gain(bell(0.6, f0 * (step ** i), d=d), -5 - i), i * gap) for i in range(n_)])


def clang(f=520, d=0.5):
    return mix(bell(0.9, f, d=d), gain(svf(noise(0.06, 'white'), 4000, 0.7, 'hp'), -8))


# ——— Greek gods ———
@S('sfx_hero_zeus', SIG, 1.8, syn='a synthesized sky-splitting thunder crack and rolling rumble', fade=0.3)
def _():
    return mix(gain(crack(0.2, 3), 2), at(gain(shape(rumble(1.6, 240, 4), [(0, 1), (0.3, 0.8), (1, 0)]), 0), 0.04), at(gain(crack(0.12, 9), -4), 0.5))


@S('sfx_hero_decree', SIG, 1.6, syn='a synthesized royal brass fanfare and a glittering crown chime', fade=0.25)
def _():
    a = chord(0.35, [392, 494, 587], 'saw', 2400)
    b = chord(0.9, [523, 659, 784], 'saw', 2800)
    return mix(a, at(b, 0.33), at(gain(chime(5, 1600), -4), 0.4))


@S('sfx_hero_earthshaker', SIG, 1.8, syn='a synthesized trident strike and a crashing wave', fade=0.3)
def _():
    hit = thump(0.5, 140, 40, 0.18)
    wave = whoosh(1.5, 300, 2600, q=0.6, color='white', pts=((0, 0), (0.35, 1), (0.6, 0.9), (1, 0)))
    return mix(gain(hit, 2), gain(clang(620, 0.25), -6), at(gain(wave, -2), 0.12))


@S('sfx_hero_harvest', START, 1.4, syn='a synthesized rustle of wheat and a warm rising chime', fade=0.3)
def _():
    rustle = svf(grains(1.2, 600, seed=21, dec=0.002), 3000, 0.8, 'bp')
    return mix(gain(shape(rustle, [(0, 0), (0.3, 1), (1, 0)]), -4), at(chime(6, 700, 1.12, 0.09, 0.5), 0.1))


@S('sfx_hero_aegis', SIG, 1.6, syn='a synthesized great shield clang and a protective hum', fade=0.3)
def _():
    hum = shape(am(svf(tone(1.4, 110, 'saw'), 600, 1.0), 6, 0.3), [(0, 0), (0.2, 1), (0.8, 0.8), (1, 0)])
    return mix(gain(clang(330, 0.6), 0), at(gain(hum, -6), 0.05), at(gain(chime(3, 1400), -10), 0.2))


@S('sfx_hero_chariot', SIG, 1.8, syn='a synthesized blazing chariot: fire roar, galloping hooves and a whoosh', fade=0.3)
def _():
    hooves = mix(*[at(gain(thump(0.08, 300, 120, 0.03), -2 - (i % 2) * 3), i * 0.11) for i in range(12)])
    return mix(gain(fire(1.6, 30), -2), hooves, gain(whoosh(1.6, 400, 1800, q=1.0), -6))


@S('sfx_hero_moon', START, 1.6, syn='a synthesized silver shimmer and a soft rising tone', fade=0.4)
def _():
    pad = shape(mix(tone(1.5, 880, 'sin', vib=(5, 4)), gain(tone(1.5, 1320, 'sin', vib=(5.5, 4)), -6)), [(0, 0), (0.3, 1), (1, 0)])
    return mix(gain(pad, -4), chime(7, 1800, 1.08, 0.07, 0.4))


@S('sfx_hero_warcry', SIG, 1.6, syn='a synthesized bronze war horn blast and a battle shout', fade=0.3)
def _():
    return mix(horn(1.4, 98, 1400), at(gain(shout(0.7, 180, 140, [700, 1150, 2600], rasp=0.7, seed=5), -4), 0.3))


@S('sfx_hero_charm', START, 1.4, syn='a synthesized harp glissando and sparkling hearts', fade=0.3)
def _():
    gl = mix(*[at(gain(env(tone(0.5, 523 * 2 ** (i / 7), 'tri'), a=0.002, d=0.25), -6), i * 0.05) for i in range(14)])
    return mix(gl, at(gain(chime(4, 2000), -8), 0.5))


@S('sfx_hero_forge', SIG, 1.2, syn='a synthesized anvil drop and a ringing hammer clang', fade=0.25)
def _():
    return mix(gain(thump(0.4, 120, 50, 0.15), 2), at(clang(880, 0.5), 0.12), at(gain(clang(1180, 0.3), -6), 0.4))


@S('sfx_hero_spark', LOW, 0.4, syn='a synthesized hammer ping and a spark crackle')
def _():
    return mix(gain(bell(0.35, 1500, d=0.12), -2), gain(svf(grains(0.2, 300, seed=44, dec=0.0006), 4000, 0.7, 'hp'), -6))


@S('sfx_hero_messenger', START, 1.0, syn='a synthesized wing flutter and a quick whoosh')
def _():
    flap = am(svf(noise(0.9, 'pink'), 1100, 1.2, 'bp'), 18, 0.9)
    return mix(shape(flap, [(0, 0), (0.2, 1), (1, 0)]), gain(whoosh(0.6, 600, 3000, q=1.4), -2))


@S('sfx_hero_dart', LOW, 0.35, syn='a synthesized short zip')
def _():
    return whoosh(0.3, 1200, 4000, q=1.6, color='white', pts=((0, 0), (0.3, 1), (1, 0)))


@S('sfx_hero_revel', START, 1.6, syn='a synthesized party horn, cheers and a wobbly lute', fade=0.3)
def _():
    toot = shape(svf(tone(0.5, glide([(0, 330), (0.3, 440), (0.5, 400)]), 'sq'), 1800, 1.0), [(0, 0), (0.1, 1), (1, 0)])
    cheer = svf(jitter_am(noise(1.2, 'pink', seed=8), 14, 0.6, seed=8), 1400, 0.7, 'bp')
    lute = mix(*[at(gain(env(tone(0.3, f, 'tri', vib=(7, 6)), a=0.002, d=0.15), -6), i * 0.14) for i, f in enumerate([392, 440, 523, 440, 392, 330])])
    return mix(toot, at(gain(shape(cheer, [(0, 0), (0.2, 1), (1, 0)]), -4), 0.15), at(lute, 0.4))


@S('sfx_hero_hearth', START, 1.6, syn='a synthesized warm crackling fire and a soft major chord', fade=0.4)
def _():
    return mix(gain(fire(1.5, 50), -6), gain(chord(1.5, [262, 330, 392], 'tri', 1600), -2))


@S('sfx_hero_underworld', SIG, 1.8, syn='a synthesized ground-splitting crack and a deep underworld groan', fade=0.35)
def _():
    groan = shape(svf(tone(1.5, sweep(80, 45, 1.5), 'saw'), 300, 1.4), [(0, 0), (0.2, 1), (1, 0)])
    return mix(gain(crack(0.25, 12), 0), gain(rumble(1.6, 160, 13), -2), at(gain(groan, -2), 0.1))


@S('sfx_hero_spring', START, 1.4, syn='synthesized birdsong chirps and a blooming chime', fade=0.3)
def _():
    chirps = mix(*[at(gain(env(tone(0.09, sweep(2600 + i * 200, 3800, 0.09)), a=0.002, d=0.04), -4), i * 0.13) for i in range(7)])
    return mix(chirps, at(gain(chime(5, 900, 1.15, 0.08, 0.5), -2), 0.2))


@S('sfx_hero_wings', START, 1.4, syn='a synthesized great wingbeat swell and a victory chime', fade=0.3)
def _():
    beats = mix(*[at(gain(whoosh(0.3, 300, 900, q=1.0), -2), i * 0.28) for i in range(4)])
    return mix(beats, at(chord(0.8, [523, 659, 784, 1046], 'tri', 3000), 0.5))


@S('sfx_hero_nightfall', SIG, 1.6, syn='a synthesized falling dark drone and a hush', fade=0.4)
def _():
    drone = shape(svf(mix(tone(1.5, sweep(220, 55, 1.2), 'saw'), gain(tone(1.5, sweep(330, 82, 1.2), 'saw'), -6)), 700, 1.0), [(0, 1), (0.6, 0.8), (1, 0)])
    hush = whoosh(1.2, 2000, 400, q=0.8, color='white', pts=((0, 1), (1, 0)))
    return mix(gain(drone, 0), gain(hush, -6))


# ——— the Kratos Peel ———
@S('sfx_hero_spartaaa', SIG, 2.0, syn='a synthesized roaring “THIS IS SPARTAAA!” war shout', fade=0.3)
def _():
    a = shout(0.32, 160, 170, [600, 1100, 2500], rasp=0.6, seed=11)
    b = shout(1.4, 190, 150, [750, 1200, 2700], rasp=0.8, seed=12)
    return mix(a, at(gain(b, 2), 0.38), at(gain(thump(0.4, 90, 40, 0.2), -4), 0.38))


@S('sfx_hero_spartanrage', SIG, 2.0, syn='a synthesized bestial war roar ("RAAAGH!") with a burst of fire', fade=0.3)
def _():
    # a guttural build, a huge open-throated roar (open "ah" formants, heavy grit, low and doubled), and the rage
    # catching fire under it
    build_ = shout(0.35, 95, 120, [650, 1080, 2450], rasp=0.9, seed=21)
    roar = mix(shout(1.35, 135, 105, [780, 1150, 2550], rasp=1.0, seed=22), gain(shout(1.35, 68, 55, [700, 1050, 2400], rasp=1.0, seed=23), -3))
    flame = whoosh(1.2, 600, 2400, q=0.7, color='pink', pts=((0, 0), (0.25, 1), (1, 0)))
    return mix(gain(build_, -3), at(gain(roar, 3), 0.3), at(gain(thump(0.5, 70, 35, 0.25), -2), 0.3), at(gain(flame, -9), 0.35))


@S('sfx_hero_rage', BED, 2.0, syn='a synthesized roaring fire loop', fade=0.01)
def _():
    x = fire(2.2, 60)
    # crossfade the tail into the head so it loops without a seam
    n_ = len(x)
    k = int(0.2 * 44100)
    body = x[:n_ - k]
    for i in range(k):
        t = i / k
        body[i] = body[i] * t + x[n_ - k + i] * (1 - t)
    return body


@S('sfx_hero_flamesmack', LOW, 0.5, syn='a synthesized heavy smack with a whoosh of flame')
def _():
    return mix(gain(thump(0.2, 160, 60, 0.07), 2), gain(whoosh(0.4, 400, 1600, q=0.9), -3), gain(fire(0.4, 70), -8))


@S('sfx_hero_ragehiss', MID, 1.2, syn='a synthesized hiss of dying flames and a smoke puff', fade=0.3)
def _():
    return mix(whoosh(1.1, 5000, 800, q=0.8, color='white', pts=((0, 1), (0.3, 0.8), (1, 0))), gain(thump(0.3, 120, 60, 0.1), -6))


@S('sfx_hero_blade', LOW, 0.35, syn='a synthesized blade slash and a chain rattle')
def _():
    slash = whoosh(0.25, 2000, 6000, q=1.4, color='white', pts=((0, 0), (0.2, 1), (1, 0)))
    rattle = svf(grains(0.2, 400, seed=81, dec=0.0008), 5000, 0.8, 'bp')
    return mix(slash, gain(rattle, -4), gain(bell(0.25, 2400, d=0.06), -8))


# ——— Norse gods ———
@S('sfx_hero_allfather', SIG, 1.8, syn='a synthesized deep horn call, an eye opening and raven caws', fade=0.3)
def _():
    caw = lambda s: shape(svf(drive(tone(0.22, sweep(900, 600, 0.22), 'saw'), 3), 1600, 2.0, 'bp'), [(0, 0), (0.1, 1), (1, 0)])
    return mix(horn(1.2, 73, 900), at(gain(caw(1), -2), 0.6), at(gain(caw(2), -3), 0.9), at(gain(thump(0.5, 60, 30, 0.3), -2), 1.2))


@S('sfx_hero_thundergod', SIG, 1.8, syn='a synthesized raised-hammer rumble and a chained lightning crack', fade=0.3)
def _():
    return mix(gain(shape(rumble(0.6, 300, 31), [(0, 0), (1, 1)]), -2), at(gain(crack(0.25, 32), 2), 0.5), at(gain(rumble(1.2, 220, 33), -2), 0.55))


@S('sfx_hero_mjolnir', LOW, 0.7, syn='a synthesized spinning hammer whoosh')
def _():
    return am(whoosh(0.6, 300, 900, q=1.2), 14, 0.7)


@S('sfx_hero_mischief', START, 1.4, syn='a synthesized sly giggle and a puff of trickery', fade=0.3)
def _():
    gig = mix(*[at(gain(voice(0.08, 420 + (i % 2) * 60, [800, 1300], vib=(6, 8)), -2), i * 0.09) for i in range(7)])
    poof = mix(*[at(gain(whoosh(0.25, 600, 3000, q=1.0), -4), t) for t in (0.6, 0.75, 0.9)])
    return mix(env(gig, a=0.01, r=0.1), poof)


@S('sfx_hero_foresight', START, 1.4, syn='a synthesized glassy shimmer and a reversed swell', fade=0.3)
def _():
    sw = shape(svf(noise(0.8, 'white', seed=40), sweep(600, 6000, 0.8), 1.4, 'bp'), [(0, 0), (1, 1)])
    return mix(gain(sw, -6), at(chime(6, 1400, 1.06, 0.06, 0.6), 0.7))


@S('sfx_hero_falcon', START, 1.0, syn='a synthesized falcon screech and a diving whoosh')
def _():
    scr = shape(svf(drive(tone(0.5, glide([(0, 2400), (0.1, 3200), (0.5, 2200)]), 'saw', vib=(30, 60)), 2), 3000, 2.0, 'bp'), [(0, 0), (0.1, 1), (1, 0)])
    return mix(scr, at(gain(whoosh(0.4, 600, 3000), -4), 0.4))


@S('sfx_hero_boar', SIG, 1.6, syn='a synthesized boar grunt, a charge of hooves and a jingle of coins', fade=0.3)
def _():
    grunt = shape(svf(drive(tone(0.4, sweep(160, 90, 0.4), 'saw'), 3), 700, 1.6, 'bp'), [(0, 0), (0.1, 1), (1, 0)])
    hooves = mix(*[at(gain(thump(0.07, 260, 100, 0.03), -2), 0.3 + i * 0.09) for i in range(10)])
    return mix(grunt, hooves, at(gain(chime(5, 2600, 1.05, 0.05, 0.12), -6), 0.8))


@S('sfx_hero_oath', SIG, 1.8, syn='a synthesized solemn gong and a low oath hum', fade=0.4)
def _():
    gong = bell(1.7, 120, partials=((1, 1, 2.0), (1.48, 0.6, 1.4), (2.1, 0.5, 1.0), (2.9, 0.3, 0.6)), d=0.8)
    return mix(gain(gong, 0), gain(svf(tone(1.6, 60, 'saw'), 300, 1.0), -10))


@S('sfx_hero_gjallarhorn', SIG, 1.8, syn='a synthesized mighty horn blast echoing across the sky', fade=0.4)
def _():
    h = horn(1.3, 110, 2200)
    return mix(h, at(gain(h, -10), 0.25), at(gain(h, -16), 0.5))


@S('sfx_hero_radiance', START, 1.8, syn='a synthesized shining choir chord and a bell of light', fade=0.4)
def _():
    return mix(choir(1.6, [262, 330, 392, 523]), gain(bell(1.0, 1568, d=0.5), -8))


@S('sfx_hero_halfdeath', SIG, 1.6, syn='a synthesized eerie half-chord and a cold wind', fade=0.4)
def _():
    eerie = shape(svf(mix(tone(1.4, 233, 'tri', vib=(3, 8)), gain(tone(1.4, 330, 'tri', vib=(3.3, 9)), -3)), 1400, 1.0), [(0, 0), (0.2, 1), (1, 0)])
    return mix(eerie, gain(whoosh(1.4, 800, 300, q=0.7), -6))


@S('sfx_hero_seawind', START, 1.6, syn='a synthesized rising gale with a creak of rigging', fade=0.4)
def _():
    gale = whoosh(1.5, 300, 1800, q=0.7, pts=((0, 0), (0.4, 1), (0.8, 0.9), (1, 0)))
    creak = shape(svf(tone(0.4, sweep(180, 260, 0.4), 'saw'), 900, 3.0, 'bp'), [(0, 0), (0.5, 1), (1, 0)])
    return mix(gale, at(gain(creak, -8), 0.5))


@S('sfx_hero_winterhunt', START, 1.4, syn='a synthesized icy wind and tinkling frost', fade=0.3)
def _():
    return mix(gain(whoosh(1.3, 1200, 3000, q=0.9, color='white'), -2), gain(chime(8, 2400, 1.07, 0.08, 0.2), -6))


@S('sfx_hero_freeze', LOW, 0.4, syn='a synthesized ice crackle')
def _():
    return mix(svf(grains(0.3, 500, seed=91, dec=0.0006), 3500, 0.8, 'hp'), gain(bell(0.3, 3200, d=0.08), -6))


@S('sfx_hero_apples', START, 1.4, syn='synthesized falling-apple thunks and a golden chime', fade=0.3)
def _():
    thunks = mix(*[at(gain(thump(0.12, 220 - i * 10, 100, 0.05), -2), i * 0.12) for i in range(6)])
    return mix(thunks, at(gain(chime(5, 1300, 1.12, 0.07, 0.5), -2), 0.4))


@S('sfx_hero_saga', START, 1.6, syn='a synthesized harp strum and a bard’s hum', fade=0.4)
def _():
    strum = mix(*[at(gain(env(tone(1.2, f, 'tri'), a=0.002, d=0.6), -6), i * 0.04) for i, f in enumerate([196, 247, 294, 392, 494, 587])])
    hum = gain(voice(1.2, 196, [500, 900], vib=(5, 3)), -12)
    return mix(strum, at(shape(hum, [(0, 0), (0.3, 1), (1, 0)]), 0.2))


@S('sfx_hero_verse', LOW, 0.6, syn='a synthesized short harp flourish')
def _():
    return mix(*[at(gain(env(tone(0.4, f, 'tri'), a=0.002, d=0.2), -4), i * 0.05) for i, f in enumerate([392, 494, 587, 784])])


# ——— the God Peel ———
@S('sfx_divinefeast', SIG, 2.4, syn='a synthesized heavenly choir swell, a thunder clap and a golden shimmer', fade=0.4)
def _():
    c = choir(2.2, [262, 330, 392, 523, 659])
    return mix(c, at(gain(crack(0.2, 101), 0), 0.5), at(gain(rumble(1.2, 200, 102), -4), 0.55), at(gain(chime(8, 1800, 1.08, 0.06, 0.4), -6), 0.6))


@S('sfx_godreveal', SIG, 3.0, syn='a synthesized choir sting: a rising “aah” to a bright major chord and bells', fade=0.6)
def _():
    rise = choir(1.0, [196, 247, 294], pts=((0, 0), (1, 1)))
    sting = choir(1.9, [262, 330, 392, 523, 659, 784], pts=((0, 1), (0.6, 0.85), (1, 0)))
    return mix(rise, at(sting, 0.95), at(gain(chime(6, 1046, 1.26, 0.1, 0.8), -4), 0.95))


# ——— the two new feet ———
@S('sfx_trumpet', MID, 1.0, syn='a synthesized elephant trumpet')
def _():
    f = glide([(0, 380), (0.15, 620), (0.6, 560), (0.8, 420)])
    t = drive(mix(tone(0.8, f, 'saw', vib=(9, 18)), gain(tone(0.8, lambda tt: f(tt) * 2, 'saw', vib=(9, 30)), -8)), 2.5)
    return shape(svf(t, 2400, 1.4, 'bp'), [(0, 0), (0.08, 1), (0.7, 0.8), (1, 0)])


@S('sfx_spartanroar', MID, 1.0, syn='a synthesized battle roar')
def _():
    return shout(0.8, 140, 110, [650, 1050, 2400], rasp=0.9, seed=121)


@S('sfx_bronzeshield', LOW, 0.5, syn='a synthesized bronze shield clang')
def _():
    return clang(460, 0.18)


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
    # a light pool: these are quick, and the machine is shared
    with mp.get_context('fork').Pool(3) as p:
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
