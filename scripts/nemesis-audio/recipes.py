"""Nemesis bosses and hero variants, sound effects. Kratos's Tartarus (Kronos the Titan King, mini, wave 88; Zeus,
wave 90), the Doom Lab's two nemesis minis (the Red Sole with Captain Pizzeria, Venomnom with Spider-Pan, wave 68),
Metropizza's (the Cheetoe with Wonder Wedge, wave 63), and the upgraded hero variants' moves (sfx_hero_*). Built on the
boss-sfx kit in ../boss-sfx (dsp.py, render.py), like Gotham's (../gotham-audio).

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR [key-substring ...]   # renders every recipe here, writes report.json
  python3 -I integrate.py OUTDIR REPO                                       # copies MP3s, adds the TRIM block and credits

Levels are the 50 ms RMS peak target after TRIM: REF -10.5 (slap), HI -9.5, TELL -11, MID -12, LOW -13.5."""
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'boss-sfx'))
from dsp import (K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant,  # noqa: E402,F401
                 am, jitter_am, bell, whoosh, thump, fx, n, SR)
from render import S  # noqa: E402

REF, HI, TELL, MID, LOW = -10.5, -9.5, -11.0, -12.0, -13.5
COMP = 'acompressor=threshold=0.08:ratio=6:attack=3:release=90:makeup=3'
SQUASH = 'acompressor=threshold=0.03:ratio=10:attack=0.1:release=30:makeup=6'

WHERE = {}


def where(key, text):
    WHERE[key] = text


# ======================= shared voices and materials (original synthesis) =======================
A_VOWEL = [800, 1250, 2600]
UH_VOWEL = [560, 1000, 2400]
EE_VOWEL = [320, 2300, 3100]
OO_VOWEL = [350, 700, 2400]


def grunt(dur, f0, f1, seed=1, rasp=0.6):
    v = drive(formant(tone(dur, glide([(0, f0), (dur * 0.3, f0 * 1.15), (dur, f1)]), 'saw', vib=(7, 3)), UH_VOWEL, q=5,
                      amps=[1.0, 0.55, 0.25]), 2.5)
    br = svf(noise(dur, 'pink', seed=seed), 900, 0.8, 'bp')
    return shape(svf(mix(jitter_am(v, 45, rasp, seed=seed), gain(br, -9)), 3000, 0.7), [(0, 0), (0.08, 1), (0.6, 0.8), (1, 0)])


def roar(dur, f0, fpk, f1, vowel=(480, 950, 2300), k=3.0, seed=11):
    src = drive(tone(dur, glide([(0, f0), (dur * 0.25, fpk), (dur, f1)]), 'saw', vib=(9, 5)), k)
    v = formant(src, list(vowel), q=5)
    gr = env(svf(noise(dur, 'pink', seed=seed), 650, 0.8, 'bp'), a=0.05, r=dur * 0.3)
    return shape(mix(jitter_am(v, 35, 0.4, seed=seed), gain(gr, -5)), [(0, 0), (0.08, 1), (0.7, 0.85), (1, 0)])


def ha(dur, f0, f1, vowel=A_VOWEL, seed=2, breath=0.04):
    h = env(svf(noise(breath + 0.02, 'pink', seed=seed), 1800, 0.9, 'bp'), a=0.005, r=0.02)
    v = formant(tone(dur, glide([(0, f0), (dur, f1)]), 'saw', vib=(11, 6)), vowel, q=6, amps=[1.0, 0.7, 0.35])
    v = shape(drive(v, 1.6), [(0, 0), (0.12, 1), (0.6, 0.85), (1, 0)])
    return mix(gain(h, -6), at(v, breath * 0.6))


def cackle(pitches, gap, last=None, vowel=A_VOWEL, syl=0.13, db_step=0.0):
    parts = [at(gain(ha(syl, p, p * 0.9, vowel, seed=10 + i), db_step * i), i * gap) for i, p in enumerate(pitches)]
    if last:
        f0, f1, dur = last
        parts.append(at(ha(dur, f0, f1, vowel, seed=99, breath=0.05), len(pitches) * gap))
    return mix(*parts)


def hiss(dur, fc=5000, pts=((0, 0), (0.1, 1), (1, 0)), seed=7):
    return shape(svf(noise(dur, 'white', seed=seed), fc, 0.8, 'hp'), list(pts))


def rumble(dur, f=45, seed=3, pts=((0, 0), (0.15, 1), (1, 0))):
    """a deep earth rumble: brown noise under a low sine."""
    b = svf(noise(dur, 'brown', seed=seed), 160, 0.7, 'lp')
    s = tone(dur, sweep(f * 1.2, f * 0.8, dur), 'sin')
    return shape(mix(b, gain(s, -6)), list(pts))


def thunder(dur, seed=5, crack=True):
    """a rolling thunderclap: a bright crack, then a long brown-noise roll with random swells."""
    r = random.Random(seed)
    roll = svf(noise(dur, 'brown', seed=seed), 380, 0.7, 'lp')
    pts = [(0, 0.2), (0.03, 1)]
    t = 0.08
    while t < 0.9:
        pts.append((t, r.uniform(0.45, 1.0)))
        t += r.uniform(0.05, 0.14)
    pts.append((1, 0))
    roll = shape(roll, pts)
    if not crack:
        return roll
    c = env(svf(noise(0.25, 'white', seed=seed + 1), 2500, 0.6, 'hp'), a=0.0005, d=0.05, r=0.05)
    return mix(gain(roll, 0), gain(c, -2), K('sci/lowFrequency_explosion_000', db=-6, rate=0.7))


def zap(dur, f0=2400, f1=600, seed=9):
    """an electric crackle: dense grains through a falling band, with a buzzing saw."""
    cr = svf(grains(dur, 4000, seed=seed, dec=0.0006), sweep(f0, f1, dur), 0.9, 'bp')
    bz = svf(tone(dur, sweep(f0 / 8, f1 / 8, dur), 'saw'), 2500, 0.7, 'lp')
    return shape(mix(gain(cr, 2), gain(jitter_am(bz, 120, 0.8, seed=seed), -10)), [(0, 0), (0.03, 1), (1, 0)])


def choir(dur, chord=(220, 277.2, 329.6), vowel=A_VOWEL, seed=13, pts=((0, 0), (0.3, 1), (0.8, 0.8), (1, 0))):
    """a soft synthetic choir: detuned saws through a vowel."""
    parts = []
    for i, f in enumerate(chord):
        for dt in (-0.6, 0.6):
            parts.append(gain(formant(tone(dur, f * (1 + dt / 100), 'saw', vib=(5 + i * 0.4, 4)), vowel, q=7, amps=[1.0, 0.6, 0.3]), -6))
    return shape(svf(mix(*parts), 3500, 0.7), list(pts))


def stone(dur=0.4, seed=15, fc=900):
    """a stone crunch: gritty grains and a rock impact."""
    g = shape(svf(grains(dur, 2200, seed=seed, dec=0.001), fc, 0.8, 'bp'), [(0, 1), (1, 0)])
    return mix(K('imp/impactMining_00%d' % (seed % 5)), gain(g, -2))


def grind(dur, seed=16, f=220):
    """stone grinding on stone: band noise with a slow, rough flutter."""
    x = svf(noise(dur, 'pink', seed=seed), f * 2, 2.0, 'bp')
    return shape(jitter_am(mix(x, gain(svf(grains(dur, 900, seed=seed + 1, dec=0.002), 700, 1.0, 'bp'), -4)), 18, 0.7, seed=seed),
                 [(0, 0), (0.15, 1), (0.85, 0.9), (1, 0)])


def chains(dur, count=10, seed=17, rate=1.0):
    """a rattle of heavy chain links."""
    r = random.Random(seed)
    refs = ('imp/impactMetal_light_000', 'imp/impactMetal_light_002', 'imp/impactMetal_light_004', 'imp/impactTin_medium_001', 'rpg/metalClick')
    return mix(*[at(K(r.choice(refs), rate=rate * r.uniform(0.7, 1.1), db=r.uniform(-12, -3)), r.uniform(0, dur * 0.9)) for _ in range(count)])


def glass(dur=0.9, seed=18, rate=1.0):
    """glass shattering: Kenney glass hits and a shower of tinkly grains."""
    tink = shape(svf(grains(dur, 900, seed=seed, dec=0.0008), 6000, 0.7, 'hp'), [(0, 1), (0.3, 0.6), (1, 0)])
    return mix(K('imp/impactGlass_heavy_00%d' % (seed % 5), rate=rate), at(K('imp/impactGlass_medium_002', db=-4, rate=rate * 0.9), 0.02),
               at(gain(tink, -4), 0.01))


def sand(dur, seed=19):
    """sand pouring: dense soft grains, low-passed."""
    return shape(svf(grains(dur, 6000, seed=seed, dec=0.0009), 3500, 0.6, 'lp'), [(0, 0), (0.1, 1), (1, 0)])


def horn(dur, f, buzz=0.5, seed=20):
    """a big brass or horn blast: pulse + saw through a brassy band, swelling."""
    src = mix(tone(dur, glide([(0, f * 0.94), (0.08, f), (dur, f * 0.99)]), 'saw', vib=(5, 6)),
              gain(tone(dur, f * 2, 'pulse'), -8))
    b = svf(jitter_am(src, 40, buzz * 0.3, seed=seed), sweep(700, 2200, dur * 0.4), 1.0, 'bp')
    return shape(drive(mix(b, gain(svf(src, 600, 0.7, 'lp'), -4)), 1.8), [(0, 0), (0.1, 1), (0.8, 0.9), (1, 0)])


def wet(dur, seed=21, f0=2400, f1=500):
    """a wet splat: a falling band of pink noise."""
    return env(svf(noise(dur, 'pink', seed=seed), sweep(f0, f1, dur), 1.2, 'bp'), a=0.001, d=dur * 0.3, r=0.05)


def stretchy(dur, f0=200, f1=500, seed=22):
    """sticky goo stretching: a rising rubbery band with flutter."""
    src = svf(noise(dur, 'pink', seed=seed), sweep(f0 * 2, f1 * 2, dur), 3.0, 'bp')
    t = tone(dur, sweep(f0, f1, dur), 'saw', vib=(17, 20))
    return shape(mix(jitter_am(src, 30, 0.6, seed=seed), gain(svf(t, 900, 1.5, 'bp'), -8)), [(0, 0), (0.2, 1), (0.9, 0.8), (1, 0)])


def cat(dur, f0, fpk, f1, seed=23, k=3.5, vowel=(700, 1400, 2900)):
    """a big-cat roar or snarl: a driven saw with a growly flutter."""
    return roar(dur, f0, fpk, f1, vowel=vowel, k=k, seed=seed)


def catHiss(dur, seed=24):
    h = hiss(dur, 3500, ((0, 0), (0.05, 1), (0.7, 0.8), (1, 0)), seed=seed)
    return mix(h, gain(svf(noise(dur, 'pink', seed=seed + 1), 2600, 3.0, 'bp'), -6))


def leaves(dur, count=30, seed=25):
    """jungle leaves rustling: bursts of crackly band noise."""
    r = random.Random(seed)
    out = []
    for _ in range(count):
        L = r.uniform(0.03, 0.09)
        out.append(at(gain(env(svf(noise(L, 'white', seed=r.randrange(9999)), r.uniform(2500, 6000), 1.2, 'bp'), a=0.003, d=L / 2, r=0.01),
                           r.uniform(-10, 0)), r.uniform(0, dur - L)))
    return mix(*out, gain(K('rpg/cloth2', rate=1.3), -8))


def sonic(dur, f=2800, wub=11.0):
    """a sonic emitter: a piercing tone with a fast wobble and a sub pulse."""
    t = am(tone(dur, sweep(f * 0.8, f, 0.15), 'sin', vib=(wub * 2, 40)), wub, 0.8)
    s = am(tone(dur, 70, 'sin'), wub, 0.9)
    sq = svf(tone(dur, f / 2, 'pulse'), 4000, 1.2, 'bp')
    return shape(mix(t, gain(s, -4), gain(am(sq, wub, 0.8), -12)), [(0, 0), (0.05, 1), (0.85, 0.9), (1, 0)])


def double(x, semis=-5, db=-4):
    """a second, lower voice under the first (a symbiote's double voice)."""
    return mix(x, gain(fx(x, 'asetrate=%d,aresample=%d' % (int(SR * 2 ** (semis / 12)), SR)), db))


def boots(count, gap, seed=26, rate=1.0, db=0.0):
    """jackboot steps: concrete footsteps with a heel click."""
    out = []
    for i in range(count):
        out.append(at(mix(K('imp/footstep_concrete_00%d' % (i % 5), rate=rate, db=db), K('rpg/metalClick', db=db - 10, rate=1.5)), i * gap))
    return mix(*out)


def fire(dur, seed=27, pts=((0, 0), (0.2, 1), (1, 0))):
    """a fire whoosh: low pink rush with crackle."""
    rush = svf(noise(dur, 'pink', seed=seed), sweep(300, 1200, dur), 0.8, 'bp')
    cr = svf(grains(dur, 300, seed=seed + 1, dec=0.0015), 2500, 0.8, 'hp')
    return shape(mix(rush, gain(cr, -6)), list(pts))


# ======================= Kronos the Titan King (mini-boss, wave 88, with Kratos) =======================
where('sfx_titanking_enter', 'Kronos lands: a colossal stone foot, rattling chains and a deep rumble')


@S('sfx_titanking_enter', HI, 2.4, syn='a synthesized sub landing, stone crunch and rumble', fade=0.3)
def _():
    return mix(gain(thump(0.9, 90, 26, 0.35), 0), K('imp/impactMining_003', db=-2, rate=0.6), K('sci/explosionCrunch_003', db=-6, rate=0.6),
               at(gain(stone(0.6, 30, 600), -4), 0.02), at(gain(chains(1.2, 14, seed=31, rate=0.7), -2), 0.08),
               at(gain(rumble(2.0, 40, seed=32), -4), 0.05))


where('sfx_titanking_roar', 'Kronos roars as a new phase starts: an ancient titan bellow')


@S('sfx_titanking_roar', TELL, 2.0, syn='a synthesized two-voice titan roar over a rumble', fade=0.25)
def _():
    r = roar(1.7, 50, 85, 42, vowel=(400, 800, 2100), k=3.8, seed=33)
    r2 = roar(1.6, 95, 160, 80, vowel=(520, 1000, 2400), k=4.0, seed=34)
    return fx(mix(r, at(gain(r2, -9), 0.05), gain(rumble(1.9, 36, seed=35), -6)), COMP)


where('sfx_titanking_flip', 'the giant hourglass flips: stone grinding and a glassy whoosh (tell)')


@S('sfx_titanking_flip', TELL, 1.4, syn='a synthesized stone grind, glass whoosh and sand trickle')
def _():
    gl = whoosh(0.7, 600, 3200, q=1.6, pts=((0, 0), (0.5, 1), (1, 0)))
    ring = bell(0.9, 1320, d=0.25)
    return mix(gain(grind(0.9, 36, 180), -2), at(gain(gl, -4), 0.2), at(gain(ring, -12), 0.7), at(gain(sand(0.6, 37), -10), 0.75),
               at(K('imp/impactWood_heavy_003', db=-6, rate=0.6), 0.82))


where('sfx_titanking_tick', 'one deep tick of the Titan\'s clock (repeats while the sand runs)')


@S('sfx_titanking_tick', LOW, 0.6, syn='a synthesized deep clock tick with a stone body')
def _():
    body = env(svf(noise(0.1, 'white', seed=38), 700, 5.0, 'bp'), a=0.0005, d=0.04, r=0.02)
    return fx(mix(K('ui/tick_001', rate=0.5), gain(body, 2), gain(thump(0.25, 160, 70, 0.06), -6), at(gain(bell(0.4, 440, d=0.08), -14), 0.0)), COMP)


where('sfx_titanking_shatter', 'the hourglass is smashed: a great glass shatter and a pour of sand')


@S('sfx_titanking_shatter', HI, 1.8, syn='synthesized glass shards and pouring sand', fade=0.3)
def _():
    return mix(glass(1.0, 40, 0.7), at(K('imp/impactGlass_heavy_002', db=-2, rate=0.55), 0.0), at(gain(sand(1.4, 41), -4), 0.08),
               gain(thump(0.4, 140, 50, 0.12), -6))


where('sfx_titanking_slow', 'time slows on you: a warped, falling tape-stop whoosh')


@S('sfx_titanking_slow', TELL, 1.6, syn='a synthesized tape-stop sweep and a falling whoosh')
def _():
    t = shape(drive(tone(1.4, sweep(660, 70, 1.4), 'saw', vib=(3, 8)), 1.8), [(0, 0), (0.05, 1), (1, 0)])
    w = whoosh(1.4, 2600, 200, q=1.2, pts=((0, 0.3), (0.2, 1), (1, 0)))
    tick = at(K('ui/tick_002', rate=0.4, db=-6), 1.1)
    return mix(svf(t, 1800, 0.8), gain(w, -4), tick, gain(bell(1.2, 880, d=0.4), -14))


where('sfx_titanking_chomp', 'Devour: the stone jaw clamps onto a pizza with a heavy chomp')


@S('sfx_titanking_chomp', HI, 1.0, syn='a synthesized stone crunch and jaw slam')
def _():
    return mix(K('imp/impactPunch_heavy_002', rate=0.7), K('imp/impactMining_001', db=-3, rate=0.8), gain(stone(0.35, 42, 1100), -4),
               gain(thump(0.4, 120, 40, 0.12), -2), at(gain(grunt(0.5, 70, 55, seed=43), -6), 0.12))


where('sfx_titanking_chew', 'the stone jaw grinds and chews (repeats while it eats)')


@S('sfx_titanking_chew', LOW, 0.7, syn='a synthesized stone grind and crust crunch')
def _():
    crunch = shape(svf(grains(0.3, 2400, seed=44, dec=0.001), 1600, 0.7, 'hp'), [(0, 1), (1, 0)])
    return mix(gain(grind(0.55, 45, 160), 0), at(gain(crunch, -2), 0.1), at(K('imp/impactWood_medium_002', db=-8, rate=0.7), 0.12))


where('sfx_titanking_jawhit', 'a smack on the stone jaw: a hard stone clack')


@S('sfx_titanking_jawhit', REF, 0.6, syn='a synthesized stone clack')
def _():
    clack = env(svf(noise(0.08, 'white', seed=46), 1400, 3.0, 'bp'), a=0.0005, d=0.02, r=0.01)
    return mix(K('imp/impactMining_004', rate=1.1), K('imp/impactPunch_medium_002', db=-4), gain(clack, -2))


where('sfx_titanking_freed', 'the jaw is forced open and the pizza is freed: a crack and a relief chime')


@S('sfx_titanking_freed', REF, 1.2, syn='a synthesized stone crack and a rising relief chime')
def _():
    arp = mix(*[at(gain(bell(0.5, f, d=0.18), -2 - i), i * 0.06) for i, f in enumerate((784, 988, 1175, 1568))])
    return mix(K('imp/impactMining_000'), gain(stone(0.3, 47, 1300), -4), at(gain(arp, -2), 0.12))


where('sfx_titanking_chain', 'Reign of the Titans: chains crash down across a lane (tell)')


@S('sfx_titanking_chain', TELL, 1.4, syn='a synthesized chain rattle and a heavy slam')
def _():
    return mix(gain(chains(0.6, 12, seed=48, rate=0.8), -2), at(K('imp/impactMetal_heavy_001', rate=0.7), 0.45),
               at(gain(thump(0.5, 110, 35, 0.16), -3), 0.45), at(gain(chains(0.6, 10, seed=49, rate=0.6), -6), 0.5))


where('sfx_titanking_chainhit', 'a smack on a locking chain: a metallic clank')


@S('sfx_titanking_chainhit', REF, 0.6, syn=None)
def _():
    return mix(K('imp/impactMetal_medium_002'), K('imp/impactMetal_light_001', db=-6, rate=0.8), K('rpg/metalClick', db=-8, rate=0.9))


where('sfx_titanking_chainbreak', 'a chain snaps and its links scatter')


@S('sfx_titanking_chainbreak', HI, 1.2, syn='a synthesized snap and scattering links')
def _():
    snap = env(svf(noise(0.06, 'white', seed=50), 3000, 1.2, 'bp'), a=0.0005, d=0.01, r=0.01)
    return mix(K('imp/impactMetal_heavy_003', rate=1.1), gain(snap, 2), at(gain(chains(0.8, 14, seed=51, rate=1.2), -2), 0.04))


where('sfx_titanking_death', 'Kronos crumbles: stone collapsing, a hiss of sand and falling chains')


@S('sfx_titanking_death', HI, 2.8, syn='synthesized crumbling stone, sand hiss and rumble', fade=0.35)
def _():
    crumble = mix(*[at(gain(stone(0.5, 52 + i, 500 + 200 * i), -2 - i * 1.5), i * 0.22) for i in range(5)])
    return mix(gain(roar(0.9, 70, 60, 30, vowel=(400, 800, 2100), k=3.0, seed=57), -4), at(crumble, 0.3), at(gain(sand(1.8, 58), -6), 0.5),
               at(gain(chains(1.4, 16, seed=59, rate=0.75), -4), 0.6), at(gain(rumble(2.2, 38, seed=60), -2), 0.2),
               at(K('sci/lowFrequency_explosion_001', db=-4, rate=0.7), 0.3))


# ======================= Zeus (boss, wave 90, with Kratos) =======================
where('sfx_zeus_enter', 'Zeus descends: a thunderclap, a choir swell and a marble landing')


@S('sfx_zeus_enter', HI, 2.6, syn='synthesized thunder, a choir swell and a marble landing', fade=0.3)
def _():
    return mix(gain(thunder(1.8, seed=61), -2), at(gain(choir(1.6, (196, 246.9, 293.7, 392)), -8), 0.0),
               at(mix(K('imp/impactMining_002', rate=0.7), gain(thump(0.6, 110, 32, 0.2), -2), K('imp/impactBell_heavy_002', db=-10, rate=0.5)), 1.1))


where('sfx_zeus_thunder', 'a huge rolling thunder as Zeus starts a new phase')


@S('sfx_zeus_thunder', TELL, 2.4, syn='a synthesized rolling thunderclap', fade=0.4)
def _():
    return fx(mix(thunder(2.3, seed=62), at(gain(zap(0.25, 3000, 900, seed=63), -6), 0.0)), COMP)


where('sfx_zeus_charge', 'a storm cloud charges over a lane: a building crackle (tell, about 1.5 s)')


@S('sfx_zeus_charge', TELL, 1.6, syn='a synthesized rising electric crackle and hum')
def _():
    hum = am(tone(1.5, sweep(60, 120, 1.5), 'saw'), sweep(8, 30, 1.5), 0.6)
    cr = shape(svf(grains(1.5, 1800, seed=64, dec=0.0006), sweep(1200, 5000, 1.5), 0.9, 'bp'), [(0, 0.1), (0.9, 1), (1, 0.6)])
    return mix(gain(svf(hum, 900, 0.8), -6), cr, gain(thunder(1.5, seed=65, crack=False), -12))


where('sfx_zeus_bolt', 'a lightning bolt strikes: a sharp crack and boom')


@S('sfx_zeus_bolt', HI, 1.2, syn='a synthesized lightning crack and short roll')
def _():
    return mix(gain(zap(0.18, 5000, 1500, seed=66), 2), K('sci/explosionCrunch_000', db=-4), at(gain(thunder(1.0, seed=67), -4), 0.03))


where('sfx_zeus_scatter', 'a storm cloud is smacked away: a puff and a dying fizzle')


@S('sfx_zeus_scatter', REF, 0.9, syn='a synthesized puff and fizzle')
def _():
    puff = env(svf(noise(0.25, 'pink', seed=68), 900, 0.8, 'lp'), a=0.003, d=0.08, r=0.05)
    return mix(gain(puff, 4), K('imp/impactSoft_medium_001', db=-4), at(gain(zap(0.5, 3000, 500, seed=69), -8), 0.05))


where('sfx_zeus_hurl', 'Zeus hurls a thunderbolt at your peel: a zapping whoosh')


@S('sfx_zeus_hurl', MID, 0.9, syn='a synthesized zap and whoosh')
def _():
    return mix(gain(whoosh(0.6, 500, 3000, q=1.3), 0), gain(zap(0.6, 3500, 1200, seed=70), -4), K('dgt/zap1', db=-8, rate=0.8))


where('sfx_zeus_deflect', 'the thunderbolt is batted back: an electric ping')


@S('sfx_zeus_deflect', REF, 0.8, syn='a synthesized electric ping')
def _():
    return mix(K('imp/impactMetal_light_003', rate=1.2), gain(bell(0.6, 1760, d=0.15), -4), at(gain(zap(0.3, 6000, 2500, seed=71), -6), 0.01))


where('sfx_zeus_poseidon', 'Zeus calls Poseidon: a conch horn over a rising swell of water (tell)')


@S('sfx_zeus_poseidon', TELL, 1.8, syn='a synthesized conch horn and water swell', fade=0.3)
def _():
    conch = horn(1.2, 146.8, buzz=0.4, seed=72)
    swell = shape(svf(noise(1.7, 'pink', seed=73), sweep(300, 1400, 1.7), 0.7, 'bp'), [(0, 0), (0.8, 1), (1, 0.5)])
    return mix(gain(svf(conch, 1600, 0.8), 0), at(gain(swell, -4), 0.2), at(gain(bubbles(1.0, 14, 200, 700, seed=74), -12), 0.5))


where('sfx_zeus_wave', 'Poseidon\'s wave crashes across the table')


@S('sfx_zeus_wave', HI, 1.8, syn='a synthesized wave crash', fade=0.3)
def _():
    crash = shape(svf(noise(1.6, 'pink', seed=75), sweep(2400, 500, 1.6), 0.6, 'bp'), [(0, 0), (0.08, 1), (0.4, 0.7), (1, 0)])
    hissy = hiss(1.4, 3500, ((0, 0), (0.1, 1), (1, 0)), seed=76)
    return mix(crash, gain(hissy, -6), gain(thump(0.5, 100, 35, 0.15), -4), K('imp/impactSoft_heavy_000', db=-6))


where('sfx_zeus_trident', 'the trident is knocked away: a metal clang and a splash')


@S('sfx_zeus_trident', REF, 1.0, syn='a synthesized splash')
def _():
    return mix(K('imp/impactMetal_heavy_004'), K('imp/impactBell_heavy_003', db=-10, rate=1.2), at(gain(wet(0.4, 77, 3000, 700), -2), 0.03))


where('sfx_zeus_ares', 'Zeus calls Ares: a blast on a war horn (tell)')


@S('sfx_zeus_ares', TELL, 1.6, syn='a synthesized war horn blast', fade=0.25)
def _():
    h = mix(horn(1.3, 110, buzz=0.7, seed=78), gain(horn(1.3, 165, buzz=0.6, seed=79), -6))
    return mix(h, at(K('imp/impactPunch_heavy_000', db=-8), 0.0))


where('sfx_zeus_warcry', 'the feet answer Ares\'s war cry: a roaring crowd shout')


@S('sfx_zeus_warcry', MID, 1.4, syn='a synthesized crowd shout')
def _():
    r = random.Random(80)
    voices = [at(gain(roar(1.0, f, f * 1.4, f * 1.1, vowel=(r.uniform(500, 750), r.uniform(1000, 1300), 2500), k=2.5, seed=81 + i), r.uniform(-8, -2)),
                 r.uniform(0, 0.12)) for i, f in enumerate((110, 130, 150, 175, 95))]
    return fx(mix(*voices), COMP)


where('sfx_zeus_silence', 'Ares\'s war helmet is smashed: a bronze clang')


@S('sfx_zeus_silence', HI, 1.2, syn=None)
def _():
    return mix(K('imp/impactBell_heavy_000', rate=0.8), K('imp/impactMetal_heavy_000', db=-4), K('imp/impactPlate_heavy_002', db=-8))


where('sfx_zeus_hera', 'Zeus calls Hera: her crown descends with a regal chime and shimmer')


@S('sfx_zeus_hera', TELL, 1.8, syn='a synthesized regal chime arpeggio and shimmer', fade=0.3)
def _():
    arp = mix(*[at(gain(bell(0.9, f, d=0.4), -2 - i * 0.5), i * 0.11) for i, f in enumerate((523.3, 659.3, 784, 1046.5, 1318.5))])
    shim = shape(svf(grains(1.4, 400, seed=82, dec=0.002), 7000, 0.7, 'hp'), [(0, 0), (0.3, 1), (1, 0)])
    return mix(arp, gain(choir(1.4, (261.6, 329.6, 392), vowel=OO_VOWEL), -12), gain(shim, -10))


where('sfx_zeus_peacock', 'a smack on a peacock-eye gem in Hera\'s crown: a glassy ping')


@S('sfx_zeus_peacock', REF, 0.7, syn='a synthesized glassy ping')
def _():
    return mix(K('imp/impactGlass_light_002', rate=1.1), gain(bell(0.5, 2093, d=0.12), -3), gain(bell(0.4, 3136, d=0.08), -8))


where('sfx_zeus_crown', 'Hera\'s crown breaks: a shatter of gold')


@S('sfx_zeus_crown', HI, 1.4, syn='synthesized gold shards and chimes')
def _():
    bells = mix(*[at(gain(bell(0.6, f, d=0.15), -6), i * 0.04) for i, f in enumerate((1568, 1175, 1976, 1397, 2349))])
    return mix(glass(0.9, 83, 0.9), K('imp/impactBell_heavy_004', db=-6, rate=1.4), at(bells, 0.03), K('rpg/handleCoins', db=-6))


where('sfx_zeus_death', 'Zeus falls: fading thunder, cracking marble and a choir cut short')


@S('sfx_zeus_death', HI, 3.0, syn='synthesized thunder, marble cracks and a choir that cuts off', fade=0.4)
def _():
    ch = shape(choir(1.0, (196, 246.9, 293.7, 392)), [(0, 0), (0.3, 1), (0.95, 1), (1, 0)])
    cracks = mix(*[at(gain(stone(0.4, 84 + i, 1500), -2 - i * 2), 1.0 + i * 0.25) for i in range(4)])
    return mix(gain(thunder(2.8, seed=88), -2), at(gain(ch, -6), 0.1), cracks, at(gain(thump(0.7, 100, 28, 0.25), -2), 1.0),
               at(K('sci/lowFrequency_explosion_000', db=-4, rate=0.7), 1.0))


# ======================= the Red Sole (mini-boss, wave 68, with Captain Pizzeria) =======================
where('sfx_redsole_enter', 'the Red Sole marches in: jackboots and a sinister laugh')


@S('sfx_redsole_enter', HI, 2.4, syn='a synthesized sinister laugh over boot steps', fade=0.3)
def _():
    laugh = cackle([150, 140, 155, 145], 0.2, last=(180, 110, 0.6), vowel=UH_VOWEL, syl=0.16, db_step=0.4)
    return mix(boots(4, 0.24, rate=0.85), at(K('imp/impactPunch_heavy_004', db=-4, rate=0.8), 0.96), at(gain(thump(0.5, 110, 35, 0.16), -4), 0.96),
               at(gain(laugh, -1), 1.05))


where('sfx_redsole_laugh', 'the Red Sole\'s villain laugh (tell)')


@S('sfx_redsole_laugh', TELL, 1.6, syn='a synthesized low villain laugh')
def _():
    return fx(cackle([160, 150, 165, 155], 0.18, last=(200, 120, 0.55), vowel=UH_VOWEL, syl=0.15), COMP)


where('sfx_redsole_cube', 'the cosmic cube hums as it charges (tell, about 2 s)')


@S('sfx_redsole_cube', TELL, 2.1, syn='a synthesized rising cosmic hum')
def _():
    h = mix(tone(2.0, sweep(110, 220, 2.0), 'saw', vib=(4, 6)), gain(tone(2.0, sweep(220, 440, 2.0), 'tri'), -4),
            gain(tone(2.0, sweep(331, 662, 2.0), 'sin'), -6))
    h = svf(am(h, sweep(4, 18, 2.0), 0.5), sweep(600, 3000, 2.0), 1.4, 'bp')
    sp = shape(svf(grains(2.0, 300, seed=90, dec=0.001), 6000, 0.7, 'hp'), [(0, 0), (1, 1)])
    return shape(mix(h, gain(sp, -10), K('sci/forceField_001', db=-8)), [(0, 0), (0.15, 0.7), (0.95, 1), (1, 0)])


where('sfx_redsole_beam', 'the cube fires an energy beam down a lane')


@S('sfx_redsole_beam', HI, 1.2, syn='a synthesized energy beam')
def _():
    b = shape(svf(tone(1.0, sweep(900, 300, 1.0), 'saw', vib=(30, 40)), 2500, 1.2, 'bp'), [(0, 0), (0.03, 1), (0.6, 0.8), (1, 0)])
    return mix(K('sci/laserLarge_002', rate=0.8), b, gain(thump(0.3, 160, 60, 0.08), -6))


where('sfx_redsole_misfire', 'the cube backfires on him: an overload zap and a boom')


@S('sfx_redsole_misfire', HI, 1.6, syn='a synthesized overload zap and boom', fade=0.3)
def _():
    return mix(gain(zap(0.5, 4000, 800, seed=91), 0), K('dgt/zapThreeToneDown', db=-6), at(K('sci/explosionCrunch_004'), 0.35),
               at(gain(thump(0.6, 120, 32, 0.2), -2), 0.35))


where('sfx_redsole_cubehit', 'a smack on the cosmic cube: a crystal thunk')


@S('sfx_redsole_cubehit', REF, 0.6, syn='a synthesized crystal thunk')
def _():
    return mix(K('imp/impactGlass_medium_003', rate=0.8), K('imp/impactPunch_medium_003', db=-6), gain(bell(0.4, 1046.5, d=0.1), -8))


where('sfx_redsole_turret', 'a hydrant turret rises from the table edge: a mechanical clunk and hiss')


@S('sfx_redsole_turret', TELL, 1.2, syn='a synthesized hydraulic hiss')
def _():
    return mix(K('sci/doorOpen_001', rate=0.8), at(K('imp/impactMetal_heavy_002', db=-4, rate=0.9), 0.5), at(gain(hiss(0.6, 3000, seed=92), -8), 0.1),
               at(K('rpg/metalLatch', db=-6), 0.55))


where('sfx_redsole_spray', 'a hydrant turret sprays: a pressurised burst')


@S('sfx_redsole_spray', MID, 1.0, syn='a synthesized pressurised water spray')
def _():
    sp = shape(svf(noise(0.9, 'white', seed=93), 2800, 0.6, 'bp'), [(0, 0), (0.04, 1), (0.7, 0.8), (1, 0)])
    return mix(sp, gain(svf(noise(0.9, 'pink', seed=94), 600, 0.7, 'lp'), -6), K('rpg/metalClick', db=-8))


where('sfx_redsole_cap', 'a turret is capped: a metal clang as the hiss dies')


@S('sfx_redsole_cap', REF, 1.0, syn='a synthesized dying hiss')
def _():
    return mix(K('imp/impactMetal_medium_004'), K('imp/impactTin_medium_003', db=-6), at(gain(hiss(0.6, 3200, ((0, 1), (1, 0)), seed=95), -8), 0.03))


where('sfx_redsole_march', 'the Skull Blitz: his goose-step heel clicks (tell)')


@S('sfx_redsole_march', TELL, 1.0, syn=None)
def _():
    return fx(mix(boots(3, 0.22, seed=96, rate=1.0), at(K('rpg/metalClick', db=-2, rate=1.2), 0.66), at(K('imp/footstep_concrete_001', db=0, rate=0.8), 0.68)), SQUASH)


where('sfx_redsole_stomp', 'a heavy jackboot stomp lands')


@S('sfx_redsole_stomp', HI, 1.0, syn='a synthesized sub stomp')
def _():
    return mix(gain(thump(0.6, 130, 34, 0.2), 0), K('imp/impactPunch_heavy_003', db=-2), K('imp/footstep_concrete_004', db=-4, rate=0.6),
               K('imp/impactPlate_heavy_000', db=-10, rate=0.7))


where('sfx_redsole_death', 'the Red Sole goes down: his skull mask cracks, an alarm whoops and the bunker blows')


@S('sfx_redsole_death', HI, 2.8, syn='a synthesized alarm whoop and blast', fade=0.35)
def _():
    alarm = mix(*[at(gain(svf(tone(0.45, sweep(500, 1100, 0.45, 'lin'), 'saw'), 2000, 1.2, 'bp'), -6), i * 0.5) for i in range(3)])
    return mix(K('imp/impactMining_003', rate=1.2), gain(stone(0.4, 97, 1400), -4), at(alarm, 0.25), at(K('sci/explosionCrunch_002'), 1.4),
               at(gain(thump(0.8, 110, 28, 0.3), -2), 1.4), at(K('sci/lowFrequency_explosion_001', db=-4), 1.45))


# ======================= Venomnom (mini-boss, wave 68, with Spider-Pan) =======================
where('sfx_venomnom_enter', 'Venomnom splats down: wet goo and a deep, double-voiced growl')


@S('sfx_venomnom_enter', HI, 2.2, syn='a synthesized goo splat and a double-voiced growl', fade=0.3)
def _():
    g = double(roar(1.3, 80, 120, 70, vowel=(450, 900, 2200), k=4.0, seed=100), -7, -3)
    return mix(K('imp/impactSoft_heavy_003'), K('sci/slime_001', db=-2, rate=0.8), gain(wet(0.5, 101, 2000, 300), 0),
               at(gain(bubbles(0.6, 20, 150, 600, seed=102), -8), 0.05), at(g, 0.3))


where('sfx_venomnom_growl', 'Venomnom\'s wet growl (tell)')


@S('sfx_venomnom_growl', TELL, 1.3, syn='a synthesized wet double-voiced growl')
def _():
    g = double(roar(1.1, 90, 130, 80, vowel=(450, 900, 2200), k=4.5, seed=103), -7, -3)
    return fx(mix(g, gain(bubbles(1.0, 16, 150, 500, seed=104), -10)), SQUASH)


where('sfx_venomnom_tongue', 'his long tongue lashes out: a wet whip')


@S('sfx_venomnom_tongue', MID, 0.9, syn='a synthesized wet whip')
def _():
    return mix(gain(whoosh(0.35, 400, 3000, q=1.6, pts=((0, 0), (0.8, 1), (1, 0))), 0), at(gain(wet(0.3, 105, 3000, 800), -2), 0.3),
               at(K('sci/slime_000', db=-6, rate=1.2), 0.3))


where('sfx_venomnom_snatch', 'a slice is gulped down')


@S('sfx_venomnom_snatch', REF, 0.9, syn='a synthesized gulp')
def _():
    gulp = env(tone(0.25, sweep(300, 90, 0.25), 'sin'), a=0.005, d=0.1, r=0.05)
    return mix(K('sci/slime_001', rate=0.9), gain(gulp, 0), at(gain(wet(0.3, 106, 1500, 300), -4), 0.05),
               at(gain(grunt(0.3, 120, 90, seed=107), -10), 0.25))


where('sfx_venomnom_cut', 'his tongue is smacked: a slap and a yelp')


@S('sfx_venomnom_cut', REF, 0.9, syn='a synthesized yelp')
def _():
    yelp = double(ha(0.3, 420, 260, vowel=EE_VOWEL, seed=108), -7, -6)
    return mix(K('imp/impactPunch_medium_000'), gain(wet(0.2, 109, 3000, 1000), -4), at(gain(yelp, -2), 0.05))


where('sfx_venomnom_goo', 'a tendril binds a pizza: a sticky stretching squelch')


@S('sfx_venomnom_goo', MID, 1.1, syn='a synthesized sticky stretch')
def _():
    return mix(stretchy(1.0, 160, 420, seed=110), K('sci/slime_000', db=-4, rate=0.7), at(gain(bubbles(0.5, 8, 200, 700, seed=111), -10), 0.3))


where('sfx_venomnom_drain', 'the bound pizza is slurped: a slice drains away')


@S('sfx_venomnom_drain', MID, 0.9, syn='a synthesized slurp')
def _():
    slurp = svf(noise(0.6, 'pink', seed=112), sweep(400, 1800, 0.6), 4.0, 'bp')
    return mix(shape(jitter_am(slurp, 25, 0.7, seed=112), [(0, 0), (0.2, 1), (1, 0)]), K('sci/slime_001', db=-8, rate=1.3))


where('sfx_venomnom_tendril', 'a smack on a goo tendril: a rubbery thwack')


@S('sfx_venomnom_tendril', REF, 0.6, syn='a synthesized rubbery thwack')
def _():
    tw = env(tone(0.2, sweep(220, 120, 0.2), 'saw', vib=(30, 20)), a=0.001, d=0.05, r=0.03)
    return mix(K('imp/impactSoft_medium_003'), gain(svf(tw, 900, 1.5, 'bp'), -4), gain(wet(0.15, 113, 2000, 800), -6))


where('sfx_venomnom_sonic', 'a sonic emitter fires a piercing pulse')


@S('sfx_venomnom_sonic', HI, 1.3, syn='a synthesized piercing sonic wobble')
def _():
    return mix(sonic(1.2), K('sci/forceField_003', db=-6), at(K('dgt/phaserUp4', db=-10), 0.0))


where('sfx_venomnom_shriek', 'the sound hurts him: Venomnom shrieks')


@S('sfx_venomnom_shriek', TELL, 1.2, syn='a synthesized double-voiced shriek')
def _():
    s = double(roar(1.0, 400, 900, 300, vowel=(800, 1600, 3200), k=4.0, seed=114), -12, -4)
    return fx(mix(s, gain(hiss(0.9, 4000, seed=115), -10)), COMP)


where('sfx_venomnom_split', 'the goo tears into copies of him')


@S('sfx_venomnom_split', MID, 1.0, syn='a synthesized wet tear')
def _():
    tear = mix(stretchy(0.5, 300, 700, seed=116), at(gain(wet(0.3, 117, 3000, 600), 0), 0.45))
    return mix(tear, at(K('sci/slime_000', db=-4), 0.45), at(gain(bubbles(0.4, 10, 300, 900, seed=118), -8), 0.5))


where('sfx_venomnom_death', 'Venomnom melts: a sonic shriek, then goo dissolving and splattering')


@S('sfx_venomnom_death', HI, 2.8, syn='a synthesized shriek, sonic tone and melting goo', fade=0.35)
def _():
    s = double(roar(1.2, 300, 800, 120, vowel=(800, 1600, 3200), k=4.0, seed=119), -12, -4)
    melt = shape(svf(bubbles(1.6, 50, 120, 500, blen=(0.04, 0.1), seed=120), 1500, 0.7, 'lp'), [(0, 1), (1, 0)])
    return mix(gain(sonic(0.9, 3200, 14), -6), s, at(melt, 0.8), at(K('imp/impactSoft_heavy_004'), 1.0), at(K('sci/slime_001', db=-2, rate=0.6), 1.05),
               at(gain(wet(0.6, 121, 2000, 200), -2), 1.05))


# ======================= the Cheetoe (mini-boss, wave 63, with Wonder Wedge) =======================
where('sfx_cheetoe_enter', 'the Cheetoe leaps in: a big-cat roar and a landing')


@S('sfx_cheetoe_enter', HI, 1.8, syn='a synthesized big-cat roar and landing', fade=0.25)
def _():
    return mix(K('imp/impactSoft_heavy_001'), gain(thump(0.4, 140, 50, 0.12), -4), gain(leaves(0.5, 18, seed=130), -8),
               at(cat(1.2, 180, 300, 150, seed=131), 0.12))


where('sfx_cheetoe_dash', 'she dashes from lane to lane: a fast whoosh')


@S('sfx_cheetoe_dash', MID, 0.6, syn='a synthesized fast whoosh')
def _():
    return mix(gain(whoosh(0.4, 600, 4000, q=1.4, pts=((0, 0), (0.4, 1), (1, 0))), 0), K('imp/footstep_grass_001', db=-8, rate=1.4))


where('sfx_cheetoe_crouch', 'she crouches to pounce: a low growl (tell)')


@S('sfx_cheetoe_crouch', TELL, 1.2, syn='a synthesized low cat growl')
def _():
    g = roar(1.1, 75, 95, 80, vowel=(500, 1000, 2400), k=3.0, seed=132)
    return fx(jitter_am(g, 28, 0.6, seed=133), SQUASH)


where('sfx_cheetoe_pounce', 'the pounce lands: a thump and a snarl')


@S('sfx_cheetoe_pounce', HI, 1.0, syn='a synthesized snarl')
def _():
    return mix(K('imp/impactPunch_heavy_001'), gain(thump(0.4, 140, 45, 0.12), -2), at(gain(cat(0.5, 260, 380, 220, seed=134, k=4.5), -2), 0.03))


where('sfx_cheetoe_slash', 'a claw swipe')


@S('sfx_cheetoe_slash', MID, 0.6, syn='a synthesized swipe')
def _():
    return mix(gain(whoosh(0.3, 1500, 6000, q=1.5, pts=((0, 0), (0.6, 1), (1, 0))), 0), at(K('rpg/drawKnife2', db=-4, rate=1.3), 0.15))


where('sfx_cheetoe_scratch', 'claws rake a pizza')


@S('sfx_cheetoe_scratch', REF, 0.7, syn='a synthesized triple scratch')
def _():
    scr = mix(*[at(gain(env(svf(noise(0.12, 'white', seed=135 + i), sweep(5000, 2000, 0.12), 2.5, 'bp'), a=0.002, d=0.05, r=0.02), -i), i * 0.05)
                for i in range(3)])
    return mix(scr, K('imp/impactWood_light_001', db=-6, rate=1.3), K('rpg/knifeSlice', db=-4))


where('sfx_cheetoe_hiss', 'the Cheetoe hisses')


@S('sfx_cheetoe_hiss', MID, 0.9, syn='a synthesized cat hiss')
def _():
    return catHiss(0.8, seed=138)


where('sfx_cheetoe_rustle', 'the jungle leaves rustle where she hides')


@S('sfx_cheetoe_rustle', LOW, 0.9, syn='synthesized rustling leaves')
def _():
    return leaves(0.8, 26, seed=139)


where('sfx_cheetoe_flush', 'she\'s flushed out of the leaves: a yowl and a burst of foliage')


@S('sfx_cheetoe_flush', REF, 1.2, syn='a synthesized yowl and leaf burst')
def _():
    yowl = cat(0.7, 420, 650, 380, seed=140, k=3.0, vowel=(900, 1700, 3200))
    return fx(mix(gain(leaves(0.4, 30, seed=141), 0), K('imp/impactPunch_medium_004', db=-4), at(gain(yowl, -1), 0.06)), SQUASH)


where('sfx_cheetoe_death', 'the Cheetoe is beaten: a defeated yowl and a collapse')


@S('sfx_cheetoe_death', HI, 2.0, syn='a synthesized falling yowl and collapse', fade=0.3)
def _():
    yowl = cat(1.1, 500, 560, 180, seed=142, k=3.0, vowel=(900, 1700, 3200))
    return mix(yowl, at(K('imp/impactSoft_heavy_002'), 1.0), at(gain(thump(0.5, 120, 35, 0.16), -3), 1.0), at(gain(leaves(0.6, 20, seed=143), -6), 1.0))


# ======================= hero variants (upgraded hero peels) =======================
where('sfx_hero_ghostsparta', 'Kratos, Ghost of Sparta: a deeper, distorted war shout and a whoosh of fire')


@S('sfx_hero_ghostsparta', HI, 2.4, syn='a synthesized distorted war shout and fire whoosh', fade=0.3)
def _():
    shout = double(roar(1.4, 110, 180, 95, vowel=(700, 1150, 2500), k=5.0, seed=150), -12, -2)
    return mix(fx(shout, 'acrusher=bits=9:mix=0.25'), gain(fire(1.8, 151), -2), gain(thump(0.6, 100, 30, 0.2), -4))


where('sfx_hero_firetrail', 'Ghost of Sparta\'s rage leaves fire on the table: a short fire whoosh (repeats)')


@S('sfx_hero_firetrail', LOW, 0.6, syn='a synthesized short fire whoosh')
def _():
    return fire(0.5, 152, ((0, 0), (0.15, 1), (1, 0)))


where('sfx_hero_primebeam', 'Superpeel Prime: Heat Vision sweeps the whole screen')


@S('sfx_hero_primebeam', HI, 2.4, syn='a synthesized charging whine and a huge sizzling beam sweep', fade=0.3)
def _():
    whine = shape(tone(0.6, sweep(400, 2400, 0.6), 'saw'), [(0, 0), (1, 1)])
    beam = mix(svf(tone(1.8, 70, 'saw', vib=(6, 3)), 1200, 0.8), gain(svf(noise(1.8, 'white', seed=153), sweep(1500, 5000, 1.8), 0.8, 'bp'), -4),
               gain(fire(1.8, 154), -4))
    beam = shape(beam, [(0, 0), (0.05, 1), (0.85, 0.9), (1, 0)])
    return mix(gain(svf(whine, 3000, 0.8), -8), at(beam, 0.5), at(K('sci/laserLarge_000', db=-4, rate=0.7), 0.5))


where('sfx_hero_infinity', 'Iron Pan Mark Infinity: a cosmic charge and the sweeping Infinity Beam')


@S('sfx_hero_infinity', HI, 2.0, syn='a synthesized cosmic charge chord and a sweeping beam', fade=0.3)
def _():
    charge = shape(mix(*[gain(tone(0.6, sweep(f, f * 2, 0.6), 'tri'), -6) for f in (220, 277, 330, 440)]), [(0, 0), (1, 1)])
    beam = shape(mix(svf(tone(1.2, sweep(140, 90, 1.2), 'saw', vib=(12, 6)), 2000, 0.9), gain(svf(noise(1.2, 'pink', seed=155), sweep(800, 4000, 1.2), 1.0, 'bp'), -4)),
                 [(0, 0), (0.05, 1), (0.8, 0.9), (1, 0)])
    return mix(charge, at(beam, 0.55), at(K('sci/laserLarge_003', db=-4, rate=0.8), 0.55), at(gain(thump(0.5, 100, 35, 0.15), -6), 0.55))


where('sfx_hero_endgame', 'an Endgame variant\'s move: portals open and a heroic brass stab')


@S('sfx_hero_endgame', HI, 2.0, syn='synthesized portal swirls and a heroic brass chord', fade=0.3)
def _():
    portals = mix(*[at(gain(shape(svf(grains(0.6, 2500, seed=156 + i, dec=0.0006), sweep(1500, 6000, 0.6), 1.2, 'bp'), [(0, 0), (0.5, 1), (1, 0)]), -6), i * 0.12)
                    for i in range(3)])
    brass = mix(horn(1.1, 196, 0.3, seed=160), gain(horn(1.1, 246.9, 0.3, seed=161), -3), gain(horn(1.1, 293.7, 0.3, seed=162), -4))
    return mix(portals, at(brass, 0.4), at(K('imp/impactPunch_heavy_000', db=-6), 0.4))


where('sfx_hero_unleashed', 'Thor, Thunder Unleashed: a massive rolling thunderstorm')


@S('sfx_hero_unleashed', HI, 2.8, syn='synthesized thunder rolls and lightning cracks', fade=0.4)
def _():
    return mix(gain(thunder(2.6, seed=163), 0), at(gain(zap(0.25, 5000, 1500, seed=164), -2), 0.0), at(gain(zap(0.2, 5000, 1500, seed=165), -4), 0.8),
               at(gain(thunder(1.6, seed=166), -6), 0.8))


where('sfx_hero_ascended', 'Odin Allfather Ascended: a deep horn and raven caws')


@S('sfx_hero_ascended', HI, 2.2, syn='a synthesized deep horn and raven caws', fade=0.3)
def _():
    caws = mix(*[at(gain(roar(0.22, 900, 1100, 700, vowel=(900, 1500, 2800), k=4.0, seed=167 + i), -6), 0.9 + i * 0.28) for i in range(3)])
    return mix(horn(1.4, 73.4, 0.6, seed=170), gain(horn(1.4, 110, 0.5, seed=171), -6), caws)


where('sfx_hero_unbound', 'Zeus, King Unbound: an overcharged lightning-sword blast')


@S('sfx_hero_unbound', HI, 2.2, syn='a synthesized overcharged zap, sword ring and thunder', fade=0.3)
def _():
    return mix(gain(zap(0.6, 6000, 1200, seed=172), 0), K('rpg/drawKnife3', db=-4, rate=0.8), gain(bell(1.0, 1318.5, d=0.3), -10),
               at(gain(thunder(1.6, seed=173), -2), 0.2))


where('sfx_hero_liberty', 'Shield of Liberty: a bright shield ricochet ping')


@S('sfx_hero_liberty', MID, 0.8, syn='a synthesized bright ping')
def _():
    return mix(K('imp/impactMetal_light_002', rate=1.3), gain(bell(0.6, 1568, d=0.18), -4), gain(bell(0.5, 2349, d=0.1), -10))


where('sfx_hero_tendril', 'Symbiote Pan: a web tendril snatches a foot (a sticky squelch)')


@S('sfx_hero_tendril', MID, 0.8, syn='a synthesized sticky snatch')
def _():
    return mix(gain(whoosh(0.25, 500, 2500, q=1.5, pts=((0, 0), (0.8, 1), (1, 0))), -2), at(stretchy(0.4, 200, 500, seed=174), 0.2),
               at(K('sci/slime_000', db=-6, rate=1.2), 0.2))


where('sfx_hero_amazon', 'Amazon Queen: a golden lasso crack and a war cry')


@S('sfx_hero_amazon', HI, 1.8, syn='a synthesized whip crack, shimmer and war cry', fade=0.25)
def _():
    crack = env(svf(noise(0.05, 'white', seed=175), 3500, 1.0, 'bp'), a=0.0005, d=0.01, r=0.01)
    cry = roar(0.9, 330, 520, 440, vowel=(850, 1500, 2900), k=2.5, seed=176)
    shim = shape(svf(grains(1.0, 500, seed=177, dec=0.002), 7000, 0.7, 'hp'), [(0, 1), (1, 0)])
    return fx(mix(gain(whoosh(0.3, 600, 3000, q=1.4), -4), at(gain(crack, 4), 0.25), at(gain(shim, -10), 0.25), at(gain(cry, -2), 0.4)), COMP)
