"""Batpeel's Gotham sound effects (the nemesis stage on waves 61-65 when the Batpeel peel is equipped): Bunion's and
the Jokester's moves (sfx_<boss>_<move>, loaded a wave ahead of each fight) and the Dark Kneader's two moves
(sfx_hero_*, loaded with the hero peels). Built on the boss-sfx kit in ../boss-sfx (dsp.py, render.py), like Act 7's.

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR [key-substring ...]   # renders every recipe here, writes report.json
  python3 -I integrate.py OUTDIR REPO                                       # copies MP3s, adds the TRIM block and credits

Levels are the 50 ms RMS peak target after TRIM: REF -10.5 (slap), HI -9.5, TELL -11, MID -12, LOW -13.5, BED -14.5."""
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'boss-sfx'))
from dsp import (K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant,  # noqa: E402,F401
                 am, jitter_am, bell, whoosh, thump, fx, n, SR)
from render import S  # noqa: E402

REF, HI, TELL, MID, LOW, BED = -10.5, -9.5, -11.0, -12.0, -13.5, -14.5

# where each sound plays (for credits and the TRIM comments)
WHERE = {}


def where(key, text):
    WHERE[key] = text


# ======================= shared voices and props (original synthesis) =======================
A_VOWEL = [800, 1250, 2600]
UH_VOWEL = [560, 1000, 2400]
EE_VOWEL = [320, 2300, 3100]


def grunt(dur, f0, f1, seed=1, rasp=0.6):
    """a low, gravelly effort grunt: a driven saw through an 'uh' formant set, with breath and flutter."""
    v = drive(formant(tone(dur, glide([(0, f0), (dur * 0.3, f0 * 1.15), (dur, f1)]), 'saw', vib=(7, 3)), UH_VOWEL, q=5,
                      amps=[1.0, 0.55, 0.25]), 2.5)
    br = svf(noise(dur, 'pink', seed=seed), 900, 0.8, 'bp')
    body = mix(jitter_am(v, 45, rasp, seed=seed), gain(br, -9))
    return shape(svf(body, 3000, 0.7), [(0, 0), (0.08, 1), (0.6, 0.8), (1, 0)])


def ha(dur, f0, f1, vowel=A_VOWEL, seed=2, breath=0.04):
    """one laugh syllable: a breathy 'h' onset, then a voiced vowel gliding f0 -> f1."""
    h = env(svf(noise(breath + 0.02, 'pink', seed=seed), 1800, 0.9, 'bp'), a=0.005, r=0.02)
    v = formant(tone(dur, glide([(0, f0), (dur, f1)]), 'saw', vib=(11, 6)), vowel, q=6, amps=[1.0, 0.7, 0.35])
    v = shape(drive(v, 1.6), [(0, 0), (0.12, 1), (0.6, 0.85), (1, 0)])
    return mix(gain(h, -6), at(v, breath * 0.6))


def cackle(pitches, gap, last=None, vowel=A_VOWEL, syl=0.13, db_step=0.0):
    parts = []
    for i, p in enumerate(pitches):
        parts.append(at(gain(ha(syl, p, p * 0.9, vowel, seed=10 + i), db_step * i), i * gap))
    if last:
        f0, f1, dur = last
        parts.append(at(ha(dur, f0, f1, vowel, seed=99, breath=0.05), len(pitches) * gap))
    return mix(*parts)


def boing(dur=0.8, f=170, depth=0.55, rate=13.0):
    """a cartoon spring: a jaw-harp twang whose pitch wobbles fast and settles, rising a little."""
    def fr(t):
        return f * (1 + 0.25 * min(1.0, t / dur)) * (1 + depth * math.exp(-t / (dur * 0.35)) * math.sin(2 * math.pi * rate * t))
    src = tone(dur, fr, 'saw')
    wah = svf(src, lambda t: 500 + 1400 * (0.5 + 0.5 * math.sin(2 * math.pi * rate * t)) * math.exp(-t / (dur * 0.5)), 3.0, 'bp')
    return env(mix(gain(wah, 0), gain(tone(dur, fr, 'sin'), -6)), a=0.002, d=dur * 0.45, r=0.08)


def horn(dur, f0, f1, buzz=0.6):
    """a party blower: a buzzy reed tone bending up, with a rough flutter."""
    src = tone(dur, glide([(0, f0), (dur * 0.25, f1), (dur, f1 * 0.97)]), 'pulse', vib=(9, 8))
    reed = svf(jitter_am(src, 90, buzz * 0.5, seed=5), 2200, 1.2, 'bp')
    return shape(mix(reed, gain(svf(src, 900, 0.8, 'lp'), -6)), [(0, 0), (0.08, 1), (0.8, 0.9), (1, 0)])


def confetti(dur=0.8, seed=4):
    """a confetti pop: a cork-ish thump, a bright burst and a flutter of paper."""
    pop = mix(env(svf(noise(0.08, 'white', seed=seed), 1500, 1.0, 'bp'), a=0.0005, d=0.012, r=0.01),
              gain(thump(0.15, 320, 90, 0.03), -4))
    flutter = shape(svf(grains(dur, 500, seed=seed + 1, dec=0.0012), 4500, 0.7, 'hp'), [(0, 0), (0.1, 1), (1, 0)])
    return mix(gain(pop, 2), at(gain(flutter, -6), 0.03))


def jingle(dur, count=7, seed=6, lo=3200, hi=5200):
    """little ribbon bells, shaken."""
    r = random.Random(seed)
    return mix(*[at(gain(bell(0.3, r.uniform(lo, hi), d=0.08), r.uniform(-10, -2)), r.uniform(0, dur - 0.1)) for _ in range(count)])


def music_box(notes, gap, d=0.35, oct=1):
    """music-box tines: bright inharmonic plucks."""
    parts = []
    tine = ((1, 1, 1.0), (3.0, 0.35, 0.4), (5.9, 0.18, 0.2), (9.2, 0.08, 0.12))
    for i, f in enumerate(notes):
        parts.append(at(bell(0.55, f * oct, partials=tine, d=d), i * gap))
    return mix(*parts)


def ticks(count, gap, rate=1.0, db=0.0):
    """tick-tock: alternate Kenney ticks, each with a short woody body."""
    out = []
    for i in range(count):
        body = env(svf(noise(0.06, 'white', seed=60 + i), 1900 if i % 2 == 0 else 1400, 5.0, 'bp'), a=0.0005, d=0.018, r=0.01)
        out.append(at(mix(K('ui/tick_001' if i % 2 == 0 else 'ui/tick_002', rate=rate * (1.0 if i % 2 == 0 else 0.85), db=db), gain(body, db + 2)), i * gap))
    return mix(*out)


def hiss(dur, fc=5000, pts=((0, 0), (0.1, 1), (1, 0)), seed=7):
    return shape(svf(noise(dur, 'white', seed=seed), fc, 0.8, 'hp'), list(pts))


def glug(dur, count, f=180, seed=8):
    """low glugging: a few big slow bubbles."""
    return bubbles(dur, count, flo=f * 0.7, fhi=f * 1.4, blen=(0.05, 0.11), seed=seed)


def deflate(dur, f0=520, f1=110):
    """a balloon-ish deflating squeal, falling."""
    src = tone(dur, sweep(f0, f1, dur), 'saw', vib=(23, 14))
    return shape(svf(jitter_am(src, 60, 0.5, seed=9), 1600, 1.4, 'bp'), [(0, 0), (0.05, 1), (0.7, 0.7), (1, 0)])


def roar(dur, f0, fpk, f1, vowel=(480, 950, 2300), k=3.0, seed=11):
    src = drive(tone(dur, glide([(0, f0), (dur * 0.25, fpk), (dur, f1)]), 'saw', vib=(9, 5)), k)
    v = formant(src, list(vowel), q=5)
    gr = env(svf(noise(dur, 'pink', seed=seed), 650, 0.8, 'bp'), a=0.05, r=dur * 0.3)
    return shape(mix(jitter_am(v, 35, 0.4, seed=seed), gain(gr, -5)), [(0, 0), (0.08, 1), (0.7, 0.85), (1, 0)])


# ======================= Bunion (mini-boss, wave 63) =======================
where('sfx_bunion_enter', 'Bunion drops in: a heavy crunching landing and a low grunt')


@S('sfx_bunion_enter', HI, 1.8, syn='a synthesized sub landing and a low grunt', fade=0.15)
def _():
    return mix(gain(thump(0.7, 110, 32, 0.25), 0), K('imp/impactMining_001', db=-2), K('sci/explosionCrunch_003', db=-6, rate=0.75),
               at(K('imp/impactPunch_heavy_001', db=-6, rate=0.8), 0.01), at(gain(grunt(0.75, 85, 62, seed=3), -3), 0.3))


where('sfx_bunion_pump', 'a venom tube fills to full: pump gurgle and hiss (tell)')


@S('sfx_bunion_pump', MID, 1.3, syn='a synthesized pump stroke, gurgle and pressure hiss')
def _():
    strokes = mix(*[at(gain(thump(0.12, 160, 90, 0.04), -6), t) for t in (0.0, 0.35, 0.7)])
    gurgle = shape(svf(glug(1.0, 14, f=220, seed=12), 1400, 0.7, 'lp'), [(0, 0.4), (0.7, 1), (1, 0)])
    hs = hiss(0.55, 4200, ((0, 0), (0.15, 1), (1, 0)), seed=13)
    return mix(strokes, at(gain(gurgle, -2), 0.05), K('sci/slime_000', db=-6), at(gain(hs, -8), 0.7), at(K('imp/impactGlass_light_001', db=-14, rate=0.8), 0.95))


where('sfx_bunion_surge', 'VENOM SURGE tell: a monstrous roar with bubbling')


@S('sfx_bunion_surge', TELL, 1.8, syn='a synthesized monster roar over boiling bubbles')
def _():
    r = roar(1.5, 60, 105, 55, k=3.5, seed=14)
    boil = shape(svf(bubbles(1.6, 60, flo=150, fhi=600, blen=(0.03, 0.08), seed=15), 1800, 0.7, 'lp'), [(0, 0), (0.3, 1), (1, 0)])
    hi = roar(1.4, 120, 210, 110, vowel=(650, 1100, 2600), k=4.0, seed=46)
    return fx(mix(r, at(gain(hi, -8), 0.05), at(gain(boil, -3), 0.1), K('sci/slime_001', db=-10, rate=0.7)), 'acompressor=threshold=0.08:ratio=6:attack=3:release=90:makeup=3')


where('sfx_bunion_smash', 'the VENOM SURGE stomp lands on a pizza')


@S('sfx_bunion_smash', HI, 1.2, syn='a synthesized sub stomp')
def _():
    return mix(gain(thump(0.6, 130, 34, 0.2), 0), K('imp/impactPunch_heavy_003', db=-2), K('imp/impactMining_004', db=-4),
               K('sci/lowFrequency_explosion_000', db=-8), at(K('imp/impactWood_heavy_002', db=-8, rate=0.8), 0.02))


where('sfx_bunion_tubehit', 'smack on a venom tube: a thick rubber and glass thunk with a slosh')


@S('sfx_bunion_tubehit', LOW, 0.6, syn='a synthesized slosh')
def _():
    slosh = shape(svf(noise(0.35, 'pink', seed=16), sweep(1400, 400, 0.35), 1.4, 'bp'), [(0, 0), (0.15, 1), (1, 0)])
    return mix(K('imp/impactSoft_medium_002', rate=0.85), K('imp/impactGlass_medium_001', db=-8, rate=0.7),
               at(gain(slosh, -6), 0.04), at(gain(bubbles(0.3, 6, 300, 800, seed=17), -10), 0.08))


where('sfx_bunion_drain', 'a venom tube is drained: a glugging hiss, deflating')


@S('sfx_bunion_drain', REF, 1.4, syn='synthesized glugs, a falling hiss and a deflating squeal')
def _():
    hs = hiss(1.2, 3000, ((0, 0), (0.05, 1), (1, 0)), seed=18)
    return mix(gain(hs, -6), gain(svf(glug(1.0, 9, f=160, seed=19), 1200, 0.7, 'lp'), 0), at(gain(deflate(1.1, 420, 90), -8), 0.1),
               K('sci/slime_000', db=-8, rate=0.8))


where('sfx_bunion_grab', 'THE BREAK starts: he grabs a pizza (leather creak and a grunt)')


@S('sfx_bunion_grab', TELL, 1.2, syn='a synthesized effort grunt')
def _():
    return mix(K('rpg/handleSmallLeather', db=-2), at(K('rpg/creak2', 0, 0.5, db=-6, rate=0.9), 0.05), at(K('rpg/dropLeather', db=-6), 0.0),
               at(gain(grunt(0.6, 95, 75, seed=20), -2), 0.15))


where('sfx_bunion_strain', 'the crust creaks under the strain (repeats)')


@S('sfx_bunion_strain', LOW, 0.45, syn='a synthesized stick-slip crust creak')
def _():
    r = random.Random(21)
    clicks = []
    t = 0.0
    while t < 0.34:  # stick-slip: clicks speeding up then slowing
        clicks.append(at(gain(env(svf(noise(0.012, 'white', seed=r.randrange(999)), r.uniform(700, 1300), 4.0, 'bp'), a=0.0005, d=0.003, r=0.002),
                              r.uniform(-6, 0)), t))
        t += 0.012 + 0.02 * abs(math.sin(t * 9))
    return mix(*clicks, K('rpg/creak1', 0.1, 0.45, db=-8, rate=1.2))


where('sfx_bunion_break', 'the pizza breaks: a big crunchy crack')


@S('sfx_bunion_break', HI, 1.0, syn='a synthesized crust crunch')
def _():
    crunch = shape(svf(grains(0.4, 2500, seed=22, dec=0.001), 1800, 0.7, 'hp'), [(0, 1), (1, 0)])
    return mix(K('imp/impactWood_heavy_001'), K('imp/impactPlank_medium_000', db=-3), at(K('imp/impactWood_medium_003', db=-6, rate=1.2), 0.04),
               gain(crunch, -4), K('sci/explosionCrunch_001', db=-10, rate=1.3))


where('sfx_bunion_saved', 'you foil THE BREAK: he\'s shoved back (thud and whoosh)')


@S('sfx_bunion_saved', REF, 0.9, syn='a synthesized whoosh')
def _():
    return mix(K('imp/impactPunch_heavy_000'), at(gain(whoosh(0.55, 1800, 300, q=1.4, pts=((0, 1), (0.2, 0.9), (1, 0))), -4), 0.03),
               at(K('imp/impactSoft_heavy_001', db=-6, rate=0.8), 0.3))


where('sfx_bunion_death', 'his tubes burst and he deflates (hiss, splatter, thud)')


@S('sfx_bunion_death', HI, 2.4, syn='a synthesized burst hiss, splatter and deflating squeal', fade=0.2)
def _():
    burst = hiss(1.4, 2500, ((0, 1), (0.1, 0.8), (1, 0)), seed=23)
    splat = mix(K('imp/impactSoft_heavy_003'), K('sci/slime_001', db=-3), gain(bubbles(0.5, 20, 200, 900, seed=24), -8))
    return mix(K('imp/impactGlass_heavy_000', db=-4, rate=0.8), gain(burst, -4), at(splat, 0.05), at(gain(deflate(1.3, 380, 70), -4), 0.25),
               at(gain(thump(0.6, 110, 30, 0.2), -2), 1.4), at(K('imp/impactPunch_heavy_004', db=-6, rate=0.75), 1.4))


# ======================= The Jokester (boss, wave 65) =======================
where('sfx_jokester_enter', 'the Jokester\'s entrance: a jack-in-the-box spring BOING and a confetti pop')


@S('sfx_jokester_enter', HI, 1.4, syn='a synthesized spring boing and confetti pop')
def _():
    return mix(K('rpg/metalLatch', db=-6), at(gain(boing(0.9, 160), 0), 0.03), at(confetti(0.9, seed=30), 0.2))


where('sfx_jokester_laugh', 'his manic cackle "ha-ha-ha-HA" (tell)')


@S('sfx_jokester_laugh', TELL, 1.5, syn='a synthesized manic cackle')
def _():
    return svf(cackle([300, 330, 365, 400], 0.15, last=(560, 330, 0.55), db_step=0.6), 5000, 0.7)


where('sfx_jokester_toss', 'a joke box is tossed (whoosh and a ribbon jingle)')


@S('sfx_jokester_toss', MID, 0.9, syn='a synthesized whoosh and ribbon bells')
def _():
    return mix(gain(whoosh(0.5, 500, 2600, q=1.3), 0), at(jingle(0.5, 8, seed=31), 0.05), K('rpg/cloth2', db=-10))


where('sfx_jokester_land', 'a joke box lands on a pizza (cardboard thud)')


@S('sfx_jokester_land', MID, 0.6, syn=None)
def _():
    return mix(K('imp/impactSoft_medium_000'), K('imp/impactWood_light_002', db=-6, rate=0.8), K('cas/card-place-2', db=-8))


where('sfx_jokester_tick', 'a bomb box ticks (about 1 s)')


@S('sfx_jokester_tick', LOW, 1.1, syn='a synthesized woody tick-tock body under the ticks')
def _():
    return fx(mix(ticks(6, 0.2, rate=0.9), K('rpg/metalClick', db=-12, rate=1.4)), 'acompressor=threshold=0.08:ratio=6:attack=3:release=90:makeup=3')


where('sfx_jokester_boom', 'a bomb box blows (cartoon blast with a party-horn tail)')


@S('sfx_jokester_boom', REF, 1.5, syn='a synthesized blast thump and a deflating party-horn tail')
def _():
    tail = horn(0.6, 520, 470)
    return mix(K('sci/explosionCrunch_002'), gain(thump(0.45, 150, 45, 0.14), -2), at(gain(tail, -8), 0.35),
               at(gain(confetti(0.6, seed=32), -8), 0.05))


where('sfx_jokester_defuse', 'a smack defuses a bomb box (snip and fizzle)')


@S('sfx_jokester_defuse', REF, 0.9, syn='a synthesized scissor snip and fizzle')
def _():
    snip = mix(env(svf(noise(0.03, 'white', seed=33), 4200, 2.0, 'bp'), a=0.0005, d=0.005, r=0.005),
               at(env(svf(noise(0.03, 'white', seed=34), 5200, 2.0, 'bp'), a=0.0005, d=0.005, r=0.005), 0.05))
    fizz = shape(svf(grains(0.6, 700, seed=35), sweep(6000, 1500, 0.6), 0.8, 'hp'), [(0, 1), (1, 0)])
    return fx(mix(K('rpg/metalClick', db=-4, rate=1.2), gain(snip, 2), at(gain(fizz, 0), 0.06), at(gain(hiss(0.4, 3000, seed=36), -8), 0.08)), 'acompressor=threshold=0.08:ratio=6:attack=3:release=90:makeup=3')


where('sfx_jokester_gift', 'a gift box opens itself (sparkle chime and party blower)')


@S('sfx_jokester_gift', MID, 1.4, syn='a synthesized sparkle arpeggio and party blower')
def _():
    arp = mix(*[at(gain(bell(0.5, f, d=0.18), -2 - i), i * 0.06) for i, f in enumerate((1568, 1976, 2349, 3136, 3951))])
    return mix(K('cas/cards-pack-open-1', db=-6), at(arp, 0.05), at(gain(horn(0.6, 600, 760), -4), 0.4))


where('sfx_jokester_gas', 'laughing gas puffs out (hiss and pfft)')


@S('sfx_jokester_gas', TELL, 1.1, syn='a synthesized gas hiss and puff')
def _():
    pfft = env(svf(noise(0.25, 'pink', seed=37), 900, 0.8, 'lp'), a=0.003, d=0.06, r=0.05)
    return mix(gain(pfft, 4), at(gain(hiss(0.9, 3500, ((0, 0), (0.08, 1), (0.6, 0.6), (1, 0)), seed=38), -4), 0.03), K('sci/slime_000', db=-14, rate=1.3))


where('sfx_jokester_clear', 'the laughing gas is blown away (whoosh)')


@S('sfx_jokester_clear', REF, 0.9, syn='a synthesized gust whoosh')
def _():
    return mix(gain(whoosh(0.8, 300, 3500, q=1.0, pts=((0, 0), (0.35, 1), (1, 0))), 0), K('rpg/cloth3', db=-10))


where('sfx_jokester_giggle', 'feet giggle in the laughing gas (little high giggles)')


@S('sfx_jokester_giggle', LOW, 0.7, syn='synthesized little high giggles')
def _():
    return cackle([720, 780, 700, 820], 0.1, vowel=EE_VOWEL, syl=0.075)


where('sfx_jokester_jack', 'THE GAUNTLET: the jack-in-the-box crank tune winds up (music-box notes, tell)')


@S('sfx_jokester_jack', TELL, 1.7, syn='a synthesized music-box crank tune (the traditional "Pop Goes the Weasel")')
def _():
    # "All a-round the mul-ber-ry bush, the mon-key..." (traditional), sped up
    c, d, e, f, g, a = 523.3, 587.3, 659.3, 698.5, 784.0, 880.0
    notes = [c, f, f, g, g, a, 1046.5, a, f, c, f, f, g, g]
    tune = music_box(notes, 0.095, oct=2)
    crank = mix(*[at(K('ui/click_002', db=-14, rate=1.3), i * 0.19) for i in range(7)])
    return mix(tune, crank)


where('sfx_jokester_spring', 'the jack springs out (BOING and slap)')


@S('sfx_jokester_spring', REF, 1.0, syn='a synthesized spring boing')
def _():
    return mix(K('imp/impactPunch_medium_001', db=-2), at(gain(boing(0.8, 190, 0.6, 15), 0), 0.01))


where('sfx_jokester_pie', 'a cream pie is thrown (whoosh)')


@S('sfx_jokester_pie', MID, 0.7, syn='a synthesized whoosh')
def _():
    return mix(gain(whoosh(0.55, 400, 2000, q=1.6), 0), K('rpg/cloth1', db=-12))


where('sfx_jokester_splat', 'the cream pie splats')


@S('sfx_jokester_splat', REF, 0.9, syn='a synthesized wet splat')
def _():
    wet = env(svf(noise(0.35, 'pink', seed=39), sweep(2400, 500, 0.3), 1.2, 'bp'), a=0.001, d=0.08, r=0.05)
    return mix(K('imp/impactSoft_heavy_002'), K('sci/slime_001', db=-4), gain(wet, -2), at(gain(bubbles(0.35, 10, 400, 1400, seed=40), -10), 0.04))


where('sfx_jokester_teeth', 'wind-up chattering teeth clatter (about 1.2 s)')


@S('sfx_jokester_teeth', MID, 1.3, syn='a synthesized wind-up whirr under the clatter')
def _():
    r = random.Random(41)
    clacks = []
    t = 0.0
    i = 0
    while t < 1.15:
        ref = ('imp/impactPlate_light_000', 'imp/impactPlate_light_002', 'cas/chips-collide-1')[i % 3]
        body = env(svf(noise(0.04, 'white', seed=r.randrange(9999)), r.uniform(2200, 3000), 3.0, 'bp'), a=0.0005, d=0.012, r=0.008)
        clacks.append(at(mix(K(ref, 0, 0.06, rate=r.uniform(1.3, 1.7), db=r.uniform(-6, 0)), gain(body, r.uniform(-2, 2))), t))
        t += 1 / 19 * r.uniform(0.85, 1.15)
        i += 1
    whirr = shape(svf(tone(1.2, glide([(0, 90), (1.2, 70)]), 'saw'), 1100, 1.2, 'bp'), [(0, 0), (0.1, 1), (1, 0)])
    return fx(mix(*clacks, gain(am(whirr, 34, 0.8), -8)), 'acompressor=threshold=0.03:ratio=10:attack=0.1:release=30:makeup=6')


where('sfx_jokester_weight', 'a cartoon weight falls (the whistle, about 1.8 s)')


@S('sfx_jokester_weight', MID, 1.9, syn='a synthesized falling whistle', fade=0.05)
def _():
    w = tone(1.8, sweep(2300, 520, 1.8), 'sin', vib=(6, 10))
    air = svf(noise(1.8, 'pink', seed=42), sweep(2300, 520, 1.8), 4.0, 'bp')
    return shape(mix(w, gain(air, -16)), [(0, 0), (0.08, 0.8), (0.9, 1), (1, 0.6)])


where('sfx_jokester_thud', 'the falling weight lands (big clank and thud)')


@S('sfx_jokester_thud', HI, 1.4, syn='a synthesized sub thud')
def _():
    return mix(K('imp/impactMetal_heavy_002'), K('imp/impactBell_heavy_001', db=-8, rate=0.7), gain(thump(0.6, 120, 35, 0.2), -1),
               K('imp/impactMining_002', db=-6))


where('sfx_jokester_bang', 'the BANG! flag gun pops (pop and a cloth snap)')


@S('sfx_jokester_bang', REF, 0.8, syn='a synthesized cork pop')
def _():
    pop = mix(env(svf(noise(0.05, 'white', seed=43), 1100, 1.2, 'bp'), a=0.0005, d=0.008, r=0.01), gain(thump(0.1, 600, 200, 0.015), -2))
    poof = env(svf(noise(0.12, 'pink', seed=47), 700, 0.8, 'lp'), a=0.001, d=0.04, r=0.03)
    return fx(mix(gain(pop, 3), gain(poof, 2), at(K('rpg/cloth4', db=-2, rate=1.2), 0.03), at(K('rpg/clothBelt', db=-6, rate=1.3), 0.06)), 'acompressor=threshold=0.08:ratio=6:attack=3:release=90:makeup=3')


where('sfx_jokester_window', 'the punchline window opens: he\'s dizzy (a sad trombone "wah-wah")')


@S('sfx_jokester_window', TELL, 2.2, syn='a synthesized sad trombone "wah-wah-wah-wahhh"', fade=0.2)
def _():
    parts = []
    t = 0.0
    for f, dur in ((233.1, 0.36), (220.0, 0.36), (207.7, 0.36), (196.0, 1.0)):
        vib = (5.5, 4) if dur > 0.5 else None
        src = tone(dur, f, 'saw', vib=vib)
        wah = svf(src, lambda u, d=dur: 350 + 1300 * math.sin(math.pi * min(1.0, u / min(d, 0.4))) ** 1.5, 2.2, 'bp')
        body = mix(wah, gain(svf(src, 700, 0.7, 'lp'), -4))
        parts.append(at(shape(body, [(0, 0), (0.08, 1), (0.85, 0.9), (1, 0)]), t))
        t += dur + 0.03
    return mix(*parts)


where('sfx_jokester_death', 'his death: a last laugh fading into a big confetti bang')


@S('sfx_jokester_death', HI, 2.6, syn='a synthesized fading laugh, a blast and a confetti burst', fade=0.25)
def _():
    laugh = shape(cackle([380, 360, 340, 320, 300], 0.17, last=(330, 220, 0.4), db_step=-1.2), [(0, 1), (0.8, 0.7), (1, 0.4)])
    bang = mix(K('sci/explosionCrunch_000'), gain(thump(0.5, 140, 40, 0.18), -2), at(confetti(1.0, seed=44), 0.02), at(gain(jingle(0.9, 10, seed=45), -6), 0.1),
               at(gain(horn(0.5, 640, 820), -10), 0.3))
    return mix(gain(laugh, -2), at(bang, 1.35))


# ======================= the Dark Kneader (Batpeel, upgraded) =======================
where('sfx_hero_darkfalls', 'the Dark Kneader\'s darkness falls: a heavy low boom, a wing whoosh and a sub tail')


@S('sfx_hero_darkfalls', HI, 2.4, syn='a synthesized low boom, a bat-wing whoosh and a sub tail', fade=0.3)
def _():
    flap = am(svf(noise(1.4, 'pink', seed=50), 650, 1.2, 'bp'), 9, 0.9)
    wing = whoosh(0.9, 250, 1600, q=1.0, pts=((0, 0), (0.45, 1), (1, 0)))
    sub = env(tone(2.0, sweep(70, 32, 2.0), 'sin'), a=0.01, d=0.9, r=0.4)
    return mix(K('ui/switch_007', rate=0.55), at(K('imp/impactPlate_heavy_001', rate=0.45, db=-6), 0.02), at(K('sci/lowFrequency_explosion_001', db=-4, rate=0.8), 0.02),
               at(gain(sub, 0), 0.02), at(gain(wing, -4), 0.15), at(gain(shape(flap, [(0, 0), (0.25, 1), (1, 0)]), -6), 0.3),
               at(gain(env(tone(1.6, sweep(160, 70, 1.6), 'tri'), a=0.05, r=0.5), -12), 0.05))


where('sfx_hero_split', 'a Dark Kneader wing-boomerang splits in two on impact (a metallic shing)')


@S('sfx_hero_split', MID, 0.9, syn='two synthesized shimmering rings parting')
def _():
    up = env(tone(0.7, sweep(2600, 3600, 0.7), 'tri', vib=(18, 30)), a=0.002, d=0.25, r=0.05)
    down = env(tone(0.7, sweep(2600, 1800, 0.7), 'tri', vib=(16, 25)), a=0.002, d=0.25, r=0.05)
    return mix(K('imp/impactMetal_light_002', db=-2), K('rpg/drawKnife1', db=-4, rate=1.2), at(gain(up, -10), 0.01), at(gain(down, -10), 0.01))
