"""Leonidas's nemesis at the Hot Gates, sound effects: the Immortal Horde and its Immortal Brute (mini, wave 83), Xerxes
the god-king (wave 85), and King Leonidas's and the Hot Gates variant's moves (sfx_hero_*). Same kit and levels as
recipes.py (whose shared voices it reuses); build.py renders both sets.

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR immortalbrute xerxes holdline spear shieldblock hotgates spartanchant
  python3 -I integrate_hotgates.py OUTDIR REPO"""
import random

from recipes import (COMP, HI, LOW, MID, REF, TELL, UH_VOWEL, boots, chains, choir, grunt, ha, horn, roar, rumble, stone,
                     where)
from dsp import K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, svf, formant, jitter_am, bell, whoosh, thump, fx  # noqa: F401
from render import S, rms50


# ======================= shared voices =======================

def masked(x):
    """a voice behind a metal mask: boxy, hollow, low-passed."""
    return svf(fx(x, 'aecho=0.6:0.5:12|19:0.35|0.25'), 1500, 0.8, 'lp')


def bladeWhirl(dur, rate=5.0, seed=60):
    """a heavy blade swung round on a chain: pulsing whooshes, faster towards the end."""
    out = []
    t = 0.0
    k = 0
    while t < dur - 0.2:
        per = 1 / (rate * (0.7 + 0.6 * t / dur))
        out.append(at(gain(whoosh(per * 1.4, 300, 1800, q=1.4, pts=((0, 0), (0.5, 1), (1, 0))), -2 + 2 * t / dur), t))
        if k % 2 == 0:
            out.append(at(gain(chains(0.2, 3, seed=seed + k, rate=0.9), -10), t))
        t += per
        k += 1
    return mix(*out)


def twang(f=180, seed=61):
    """a bowstring loosing: a plucked low string."""
    return env(svf(tone(0.25, sweep(f * 1.3, f, 0.05), 'saw'), 900, 2.0, 'bp'), a=0.001, d=0.08, r=0.05)


def whistle(dur, f0, f1, seed=62):
    """one arrow whistling past: a falling sine and an air hiss."""
    t = tone(dur, sweep(f0, f1, dur), 'sin')
    h = svf(noise(dur, 'white', seed=seed), sweep(f0 * 1.5, f1 * 1.5, dur), 4.0, 'bp')
    return shape(mix(gain(t, -6), h), [(0, 0), (0.3, 1), (1, 0)])


def gallop(dur, rate=7.0, seed=63, db=0.0):
    """heavy hooves pounding: low thumps in a three-beat gallop."""
    out = []
    t = 0.0
    k = 0
    while t < dur:
        out.append(at(gain(mix(thump(0.18, 110, 45, 0.05), K('imp/footstep_concrete_00%d' % (k % 5), rate=0.6, db=-6)), db), t))
        t += (0.08, 0.08, 1 / rate * 1.6)[k % 3]
        k += 1
    return mix(*out)


def trumpet(dur, f, seed=64):
    """an elephant trumpet: a brassy blast that bends up, with a rough rasp."""
    src = tone(dur, glide([(0, f * 0.8), (dur * 0.2, f * 1.25), (dur * 0.7, f * 1.15), (dur, f * 0.9)]), 'saw', vib=(7, 12))
    b = svf(jitter_am(src, 70, 0.5, seed=seed), 1200, 1.6, 'bp')
    return shape(drive(mix(b, gain(svf(src, 2600, 1.2, 'bp'), -4)), 2.4), [(0, 0), (0.08, 1), (0.75, 0.85), (1, 0)])


def gong(dur, f=110, seed=65):
    """a big gong: inharmonic partials with a slow shimmer swell."""
    parts = [gain(bell(dur, f * m, d=dur * dd), db) for m, dd, db in ((1, 0.5, 0), (1.48, 0.4, -4), (2.03, 0.3, -6), (2.9, 0.2, -9), (4.1, 0.12, -12))]
    sh = shape(svf(noise(dur, 'pink', seed=seed), 2500, 1.0, 'bp'), [(0, 0), (0.25, 1), (1, 0)])
    return mix(*parts, gain(sh, -16), K('imp/impactBell_heavy_002', rate=0.5, db=-4))


def snort(dur=0.5, seed=66, f=1200):
    """a big beast snorting: a sharp nasal noise burst with a flutter."""
    x = svf(noise(dur, 'pink', seed=seed), sweep(f, f * 0.5, dur), 2.0, 'bp')
    return shape(jitter_am(x, 40, 0.7, seed=seed), [(0, 0), (0.05, 1), (0.4, 0.5), (1, 0)])


def shout(dur, f0, f1, vowel=(650, 1100, 2500), seed=67, voices=4):
    """a crowd of men shouting: several driven formant voices, slightly apart."""
    r = random.Random(seed)
    vs = []
    for i in range(voices):
        d = r.uniform(0.9, 1.12)
        vs.append(at(gain(roar(dur, f0 * d, f0 * d * 1.25, f1 * d, vowel=vowel, k=2.6, seed=seed + i), r.uniform(-5, 0)), r.uniform(0, 0.05)))
    return mix(*vs)


def bronze(seed=68, rate=1.0, db=0.0):
    """a bronze shield clanging."""
    return mix(K('imp/impactPlate_heavy_00%d' % (seed % 5), rate=rate, db=db), K('imp/impactMetal_heavy_00%d' % ((seed + 2) % 5), rate=rate * 0.8, db=db - 5),
               gain(bell(0.6, 520 * rate, d=0.18), db - 12))


# ======================= the Immortal Horde and the Immortal Brute (mini-boss, wave 83, with Leonidas) =======================
where('sfx_immortalbrute_enter', 'the Immortal Brute lands: a hulking crash, chain rattle and a roar behind his mask')


@S('sfx_immortalbrute_enter', HI, 2.2, syn='a synthesized heavy landing, chain rattle and a masked roar', fade=0.3)
def _():
    r = masked(roar(1.2, 60, 105, 55, vowel=UH_VOWEL, k=3.6, seed=70))
    return mix(gain(thump(0.8, 95, 28, 0.3), 0), K('imp/impactMetal_heavy_003', rate=0.55, db=-3), at(gain(chains(1.0, 14, seed=71, rate=0.7), -2), 0.05),
               at(gain(r, -3), 0.35), at(gain(rumble(1.6, 42, seed=72), -6), 0.02))


where('sfx_immortalbrute_horde', 'a horde wave of Immortals comes: a Persian war horn over marching feet (tell)')


@S('sfx_immortalbrute_horde', TELL, 2.2, syn='a synthesized war horn over marching feet', fade=0.3)
def _():
    h = horn(1.6, 98, buzz=0.7, seed=73)
    h2 = horn(1.4, 147, buzz=0.5, seed=74)
    return mix(gain(h, 0), at(gain(h2, -8), 0.15), gain(boots(10, 0.2, seed=75, rate=0.8, db=-6), 0), gain(rumble(2.0, 50, seed=76), -10))


where('sfx_immortalbrute_whirl', 'the Brute whirls his chain blade overhead (tell, about 1.5 s)')


@S('sfx_immortalbrute_whirl', TELL, 1.7, syn='synthesized whirling whooshes and chain clinks')
def _():
    return fx(bladeWhirl(1.6, 4.5, seed=77), COMP)


where('sfx_immortalbrute_slam', 'the chain blade slams down: a metal crash')


@S('sfx_immortalbrute_slam', HI, 1.2, syn='a synthesized blade slam and sub thump', fade=0.2)
def _():
    return mix(K('imp/impactMetal_heavy_001', rate=0.7), K('imp/impactPlate_heavy_002', rate=0.6, db=-3), gain(thump(0.5, 120, 35, 0.15), -1),
               at(gain(chains(0.5, 8, seed=78, rate=0.8), -6), 0.03), gain(stone(0.4, 79, 900), -8))


where('sfx_immortalbrute_snag', 'the chain blade is snagged: a big metallic clank and a grunt')


@S('sfx_immortalbrute_snag', REF, 1.0, syn='a synthesized metal clank and a masked grunt')
def _():
    return mix(K('imp/impactMetal_heavy_004', rate=0.9), K('rpg/metalLatch', db=-4, rate=0.7), at(gain(chains(0.4, 6, seed=80), -6), 0.02),
               at(gain(masked(grunt(0.45, 80, 60, seed=81)), -2), 0.12))


where('sfx_immortalbrute_roar', 'the Immortal Brute roars as a new phase starts')


@S('sfx_immortalbrute_roar', TELL, 1.9, syn='a synthesized masked two-voice roar', fade=0.25)
def _():
    r = roar(1.6, 55, 95, 48, vowel=UH_VOWEL, k=4.0, seed=82)
    r2 = roar(1.5, 110, 170, 95, vowel=(520, 1000, 2400), k=3.5, seed=83)
    return fx(masked(mix(r, at(gain(r2, -8), 0.04))), COMP)


where('sfx_immortalbrute_death', 'the Immortal Brute topples: an armour crash and a clatter of chain')


@S('sfx_immortalbrute_death', HI, 2.4, syn='a synthesized falling crash, chain clatter and a last groan', fade=0.4)
def _():
    g = masked(grunt(0.9, 75, 40, seed=84, rasp=0.8))
    return mix(gain(g, -4), at(K('imp/impactMetal_heavy_002', rate=0.6), 0.5), at(K('imp/impactPlate_heavy_004', rate=0.5, db=-2), 0.55),
               at(gain(thump(0.7, 90, 25, 0.25), 0), 0.52), at(gain(chains(1.3, 18, seed=85, rate=0.75), -2), 0.58))


# ======================= Xerxes the god-king (boss, wave 85, with Leonidas) =======================
where('sfx_xerxes_enter', 'Xerxes arrives: gongs, a deep choir swell and a heavy golden landing')


@S('sfx_xerxes_enter', HI, 3.0, syn='synthesized gongs, a low choir and a heavy landing', fade=0.5)
def _():
    c = choir(2.4, chord=(73.4, 110, 146.8), vowel=(400, 800, 2300), seed=86, pts=((0, 0), (0.4, 1), (0.85, 0.8), (1, 0)))
    return mix(gain(gong(2.8, 82, seed=87), -2), at(gain(gong(2.0, 123, seed=88), -8), 0.5), gain(c, -6),
               at(gain(thump(0.8, 100, 30, 0.3), 0), 1.2), at(K('imp/impactBell_heavy_004', rate=0.6, db=-4), 1.2), at(gain(chains(0.8, 10, seed=89, rate=0.8), -6), 1.22))


where('sfx_xerxes_laugh', 'Xerxes laughs: a deep, regal god-king laugh (tell)')


@S('sfx_xerxes_laugh', TELL, 2.0, syn='a synthesized deep laugh with a hall echo')
def _():
    syl = [at(gain(ha(0.2, f, f * 0.88, UH_VOWEL, seed=90 + i), -i * 0.6), i * 0.24) for i, f in enumerate((95, 92, 90, 86, 80))]
    last = at(ha(0.6, 88, 60, UH_VOWEL, seed=96, breath=0.06), 1.25)
    return fx(drive(mix(*syl, last), 1.4), 'aecho=0.7:0.6:90|170:0.3|0.18')


where('sfx_xerxes_arrows', 'the arrow storm: thousands of bows loose and the sky darkens with a rising hiss')


@S('sfx_xerxes_arrows', TELL, 2.6, syn='synthesized massed bowstrings and a rising arrow hiss', fade=0.3)
def _():
    r = random.Random(97)
    tw = [at(gain(twang(r.uniform(140, 260), seed=98 + i), r.uniform(-14, -6)), r.uniform(0, 0.5)) for i in range(28)]
    hs = shape(svf(noise(2.5, 'white', seed=99), sweep(1500, 5500, 2.4), 1.2, 'bp'), [(0, 0), (0.25, 0.4), (0.85, 1), (1, 0)])
    return mix(*tw, at(gain(hs, -2), 0.3), gain(horn(1.0, 110, seed=100), -12))


where('sfx_xerxes_volley', 'one volley of arrows whistling down onto the table')


@S('sfx_xerxes_volley', MID, 1.6, syn='synthesized arrow whistles and thuds')
def _():
    r = random.Random(101)
    ws = [at(gain(whistle(r.uniform(0.5, 0.8), r.uniform(1800, 2600), r.uniform(700, 1000), seed=102 + i), r.uniform(-8, -2)), r.uniform(0, 0.3)) for i in range(6)]
    th = [at(K('imp/impactWood_light_00%d' % (i % 5), db=-4, rate=r.uniform(0.9, 1.2)), 0.7 + r.uniform(0, 0.3)) for i in range(5)]
    return mix(*ws, *th)


where('sfx_xerxes_bat', 'arrows batted away: a wooden clatter')


@S('sfx_xerxes_bat', REF, 0.8, syn=None)
def _():
    return mix(K('imp/impactWood_medium_001', rate=1.2), at(K('imp/impactWood_light_003', db=-3, rate=1.4), 0.05), at(K('imp/impactPlank_medium_002', db=-6, rate=1.3), 0.1),
               at(K('imp/impactWood_light_000', db=-8, rate=1.6), 0.16))


where('sfx_xerxes_rhino', 'a war rhino snorts and paws the ground before it charges (tell)')


@S('sfx_xerxes_rhino', TELL, 1.6, syn='a synthesized beast snort and hoof scrapes')
def _():
    sc = [at(gain(env(svf(noise(0.25, 'pink', seed=103 + i), 600, 1.2, 'bp'), a=0.02, d=0.1, r=0.1), -4), 0.55 + i * 0.32) for i in range(3)]
    return mix(gain(snort(0.5, 106, 1100), 0), at(gain(snort(0.4, 107, 900), -3), 0.3), *sc, at(gain(roar(0.6, 70, 110, 60, k=3.2, seed=108), -8), 0.9))


where('sfx_xerxes_charge', 'the war rhino charges down a lane: a thundering gallop and a crash')


@S('sfx_xerxes_charge', HI, 2.0, syn='a synthesized thundering gallop and impact', fade=0.3)
def _():
    return mix(gain(gallop(1.3, 6.0, seed=109), 0), gain(rumble(1.4, 45, seed=110, pts=((0, 0), (0.8, 1), (1, 0.3))), -4),
               at(K('imp/impactPunch_heavy_004', rate=0.6), 1.3), at(K('imp/impactWood_heavy_001', rate=0.6, db=-2), 1.32), at(gain(thump(0.5, 100, 30, 0.2), 0), 1.3))


where('sfx_xerxes_turn', 'the war rhino is turned away: a snort and a retreat')


@S('sfx_xerxes_turn', REF, 1.3, syn='a synthesized snort and retreating hooves')
def _():
    return mix(gain(snort(0.4, 111, 1300), 0), at(gain(gallop(0.8, 5.0, seed=112, db=-6), 0), 0.25), K('imp/impactPunch_medium_001', db=-6))


where('sfx_xerxes_elephants', 'war elephants trumpet')


@S('sfx_xerxes_elephants', TELL, 2.0, syn='synthesized elephant trumpets over a ground rumble', fade=0.3)
def _():
    return mix(gain(trumpet(1.1, 420, seed=113), 0), at(gain(trumpet(0.9, 330, seed=114), -4), 0.4), gain(rumble(1.8, 40, seed=115), -8),
               at(gain(gallop(1.0, 3.0, seed=116, db=-8), 0), 0.6))


where('sfx_xerxes_guard', 'a golden guard ward hums up round Xerxes')


@S('sfx_xerxes_guard', MID, 1.4, syn='a synthesized rising golden hum and shimmer')
def _():
    h = shape(mix(tone(1.2, sweep(110, 220, 0.6), 'saw', vib=(6, 3)), gain(tone(1.2, 330, 'sin'), -6)), [(0, 0), (0.4, 1), (1, 0)])
    sh = mix(*[at(gain(bell(0.6, f, d=0.2), -8), i * 0.08) for i, f in enumerate((880, 1109, 1319, 1760))])
    return mix(svf(h, 1200, 0.8), sh)


where('sfx_xerxes_death', 'the god-king falls: a crash of gold armour, chains and a fading gong')


@S('sfx_xerxes_death', HI, 3.2, syn='a synthesized golden crash, chains and a fading gong', fade=0.6)
def _():
    g = masked(grunt(1.0, 70, 38, seed=117, rasp=0.7))
    return mix(gain(g, -4), at(K('imp/impactBell_heavy_001', rate=0.55), 0.5), at(K('imp/impactPlate_heavy_000', rate=0.5, db=-2), 0.52),
               at(gain(chains(1.4, 20, seed=118, rate=0.8), -2), 0.55), at(gain(gong(2.6, 73, seed=119), -4), 0.6), at(gain(thump(0.7, 90, 25, 0.25), 0), 0.5))


# ======================= King Leonidas and Leonidas, Hot Gates (sfx_hero_*) =======================
where('sfx_hero_holdline', "King Leonidas's Hold the Line: a wall of bronze shields slams down with a shout")


@S('sfx_hero_holdline', HI, 1.8, syn='a synthesized Spartan shout and a row of bronze shield clangs', fade=0.3)
def _():
    sh = [at(bronze(120 + i, rate=0.9 + i * 0.03, db=-2 - i * 0.5), 0.25 + i * 0.05) for i in range(6)]
    return fx(mix(gain(shout(0.6, 140, 120, seed=126), -2), *sh, at(gain(thump(0.5, 110, 40, 0.15), -2), 0.25)), COMP)


where('sfx_hero_spear', "King Leonidas's spear is hurled: a strong whoosh and a thunk")


@S('sfx_hero_spear', MID, 0.9, syn='a synthesized spear whoosh')
def _():
    return mix(whoosh(0.45, 400, 2400, q=1.4, pts=((0, 0), (0.6, 1), (1, 0))), at(K('imp/impactWood_heavy_002', db=-4, rate=1.1), 0.42),
               at(K('rpg/drawKnife2', db=-10, rate=0.8), 0.0))


where('sfx_hero_shieldblock', 'a stomp clangs off a bronze shield in the shield wall')


@S('sfx_hero_shieldblock', REF, 0.7, syn=None)
def _():
    return bronze(130, rate=1.05)


where('sfx_hero_hotgates', 'Leonidas, Hot Gates: a roaring Spartan war cry with shields beating')


@S('sfx_hero_hotgates', HI, 2.4, syn='a synthesized massed war cry and shields beaten in time', fade=0.4)
def _():
    beats = [at(bronze(131 + i, rate=0.85, db=-3), 0.9 + i * 0.28) for i in range(5)]
    return fx(mix(gain(shout(1.4, 125, 105, seed=132, voices=6), 0), *beats, gain(rumble(2.2, 50, seed=133), -10)), COMP)


# ======================= the Spartan war chant (Hold the Line raised or renewed) =======================
OO_CHANT = (300, 870, 2240)  # a chest-voice "oo"
OH_CHANT = (430, 820, 2300)  # opening towards "oh" at the top of the rise
BARK_OO = (340, 950, 2400)  # the barked HOO!, a touch brighter


def level(x, db):
    """set a stem's 50 ms RMS peak, so stems mix at known levels whatever their raw loudness."""
    return gain(x, db - rms50(x))


def hoplite(dur, pts, vowel, seed, k=2.4, grit=0.35, breath=-14, open_to=None):
    """one soldier on the chant: a driven saw on a pitch contour through formants, with its own vibrato wobble,
    breath and grit; open_to crossfades the vowel towards a second one over the note."""
    r = random.Random(seed)
    src = drive(tone(dur, glide(pts), 'saw', vib=(r.uniform(4.5, 6.5), r.uniform(1.2, 3.0)), ph=r.random()), k)
    v = formant(src, list(vowel), q=5, amps=[1.0, 0.55, 0.3])
    if open_to:
        w = formant(src, list(open_to), q=5, amps=[1.0, 0.55, 0.3])
        N = len(v)
        v = [a * (1 - i / N) + b * (i / N) for i, (a, b) in enumerate(zip(v, w))]
    v = jitter_am(v, r.uniform(28, 40), grit, seed=seed)
    br = gain(svf(noise(dur, 'pink', seed=seed + 500), 1500, 0.7, 'bp'), breath)
    return mix(v, br)


def phalanx(dur, f0, fpk, f1, count, spread, seed, shape_pts, vowel=OO_CHANT, k=2.4, grit=0.35, h=0.05, hdb=-6, open_to=None):
    """a block of soldiers on one syllable: detuned voices, each a little early or late, some doubled, with an "h"
    breath onset so it reads as HOO rather than a pad."""
    r = random.Random(seed)
    vs = []
    for i in range(count):
        d = r.uniform(0.86, 1.16)
        lag = r.uniform(0, spread)
        L = dur * r.uniform(0.92, 1.04)
        pts = [(0, f0 * d), (L * 0.55, fpk * d * r.uniform(0.97, 1.03)), (L, f1 * d)]
        v = shape(hoplite(L, pts, vowel, seed + i * 7, k=k, grit=grit, open_to=open_to), shape_pts)
        if r.random() < 0.4:  # a doubled voice: the same man slightly sharp and a breath later
            v2 = hoplite(L, [(t, f * 1.006) for t, f in pts], vowel, seed + i * 7 + 3, k=k, grit=grit, open_to=open_to)
            v = mix(v, at(gain(shape(v2, shape_pts), -4), 0.012))
        aspir = env(svf(noise(h + 0.03, 'pink', seed=seed + i), 1300, 0.8, 'bp'), a=0.004, r=0.03)
        vs.append(at(gain(mix(gain(aspir, hdb), at(v, h * 0.5)), r.uniform(-5, 0)), lag))
    return mix(*vs)


def spearclang(seed, db=0.0, men=5, spread=0.028):
    """many spear shafts slammed on bronze shields at once, with a stamp: each man a bronze plate/metal hit, a
    wooden shaft knock and a bell-like ring; a boot stamp and a deep shared thump under them."""
    r = random.Random(seed)
    hits = []
    for i in range(men):
        t = abs(r.gauss(0, spread / 2)) if i else 0.0
        rate = r.uniform(0.82, 1.05)
        man = mix(K('imp/impactPlate_heavy_00%d' % ((seed + i) % 5), rate=rate),
                  gain(K('imp/impactMetal_heavy_00%d' % ((seed + i + 2) % 5), rate=rate * 0.85), -5),
                  gain(K('imp/impactWood_heavy_00%d' % ((seed + i) % 5), rate=r.uniform(1.1, 1.35)), -7),
                  gain(bell(0.5, 540 * rate * r.uniform(0.97, 1.03), d=0.14), -14))
        hits.append(at(gain(env(man, a=0.0005, d=0.22, r=0.05), r.uniform(-6, 0) - (2 if i else 0)), t))
    stamp = mix(K('imp/impactPunch_heavy_00%d' % (seed % 5), rate=0.6, db=-4), K('imp/footstep_concrete_00%d' % (seed % 5), rate=0.8, db=-6),
                gain(thump(0.35, 120, 42, 0.09), -1))
    return gain(mix(*hits, stamp), db)


where('sfx_hero_spartanchant', "King Leonidas's Hold the Line, raised or renewed: the phalanx's war chant, OOOOH... OOH! OOH!, "
      'spears banged on bronze shields on the beats')

BARK1, BARK2 = 1.06, 1.42


@S('sfx_hero_spartanchant', HI, 2.2, syn='a synthesized crowd of Spartans chanting "OOOOH... OOH! OOH!" in a short room, '
   'spears beating bronze shields with a stamp on each bark', fade=0.3)
def _():
    # the long rising HOOOOH: many voices swelling up from a low chest note, opening a little at the top, cut off together
    long_ = phalanx(0.86, 92, 128, 138, 14, 0.07, 200, [(0, 0), (0.08, 0.3), (0.45, 0.55), (0.86, 1.0), (0.94, 0.85), (1, 0)], k=2.2,
                    grit=0.3, h=0.07, hdb=-18, open_to=OH_CHANT)
    under = gain(phalanx(0.86, 62, 84, 90, 4, 0.05, 260, [(0, 0), (0.3, 0.6), (0.9, 1.0), (1, 0)], k=2.0, grit=0.25, hdb=-30), -6)
    # two short barked HOO! HOO!: higher, harder, a fast fall in pitch
    bark = [(0, 0), (0.08, 1.0), (0.4, 0.75), (1, 0)]
    b1 = phalanx(0.22, 150, 158, 118, 14, 0.025, 300, bark, vowel=BARK_OO, k=3.2, grit=0.45, h=0.035)
    b2 = phalanx(0.24, 156, 164, 120, 14, 0.025, 400, bark, vowel=BARK_OO, k=3.2, grit=0.45, h=0.035)
    ROOM = 'aecho=0.8:0.55:19|31|47|67|89:0.32|0.26|0.2|0.14|0.09'
    rise = mix(long_, under)
    rise = svf(mix(rise, gain(fx(rise, ROOM), -5)), 5200, 0.7)
    barks = mix(at(b1, BARK1 - 0.02), at(b2, BARK2 - 0.02))
    barks = svf(mix(barks, gain(fx(barks, ROOM), -5)), 6000, 0.7)
    clangs = mix(at(spearclang(210, men=6), BARK1), at(spearclang(212, men=6), BARK2))
    clangs = mix(clangs, gain(fx(clangs, 'aecho=0.8:0.4:23|41|73:0.25|0.18|0.1'), -6))
    # only the barks and clangs are squashed, so the long note keeps its swell; each stem is levelled on its own so
    # the barks land a couple of dB over the top of the rise
    hits = fx(mix(barks, gain(clangs, 4)), COMP)
    return mix(level(rise, -12.0), level(hits, -9.5))
