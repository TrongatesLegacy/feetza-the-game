"""Recipes for Act 8's last four feet: Raven Talons, Skald Slippers, Dwarf-Forged Boots and Muspel Fire-Feet.
Same kit and level targets as recipes_act8.py: REF -10.5 (slap), HI -9.5 (signature moments), TELL -11,
MID -12, LOW -13.5 (repeated: hurt sounds play on many smacks).

  KENNEY=/path/to/kenney RECIPES=recipes_act8b python3 -I build.py OUTDIR
  python3 -I integrate_act8b.py OUTDIR REPO"""
import random

from dsp import K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, svf, jitter_am, bell, whoosh, thump, n, SR
from render import REG, S

# borrow helpers from the Act 8 recipes without registering (and rendering) all of those again
_n = len(REG)
from recipes_act8 import voice, chain_rattle, fire, crackle  # noqa: E402
from recipes_act8a import shout  # noqa: E402
del REG[_n:]

REF, HI, TELL, MID, LOW = -10.5, -9.5, -11.0, -12.0, -13.5


def pluck(dur, f, damp=0.996, seed=1, bright=0.5):
    """a plucked gut string (Karplus-Strong): a burst of noise round a delay line, filtered as it rings."""
    r = random.Random(seed)
    L = max(2, int(SR / f))
    buf = [r.uniform(-1, 1) for _ in range(L)]
    # a softer pluck: smooth the first burst a little
    for _ in range(int((1 - bright) * 3)):
        buf = [(buf[i] + buf[i - 1]) * 0.5 for i in range(L)]
    out = []
    for i in range(n(dur)):
        v = buf[i % L]
        nxt = buf[(i + 1) % L]
        buf[i % L] = damp * 0.5 * (v + nxt)
        out.append(v)
    return env(out, a=0.001, r=0.05)


def strum(notes, gap, dur, seed=1, db=0.0):
    """a strum or a run across the lyre's strings: one pluck per note, gap s apart."""
    return gain(mix(*[at(pluck(dur, f, seed=seed + i), i * gap) for i, f in enumerate(notes)]), db)


def caw(dur, f0, f1, seed=1, k=2.6):
    """a raven's caw: a harsh, nasal, rasping voice, falling in pitch."""
    f = glide([(0, f0), (dur * 0.2, f0 * 1.06), (dur, f1)])
    v = voice(dur, f, [1050, 1750, 2900], wave='saw', vib=(28, 18), q=7)
    v = jitter_am(v, 90, 0.65, seed=seed)
    rasp = svf(noise(dur, 'pink', seed=seed + 1), 1600, 1.0, 'bp')
    return shape(mix(drive(v, k), gain(rasp, -6)), [(0, 0), (0.06, 1), (0.6, 0.85), (1, 0)])


def flap(seed=1, rate=1.0, db=0.0):
    """one wingbeat: a soft whump of air and the rustle of feathers."""
    r = random.Random(seed)
    return gain(mix(gain(whoosh(0.16, 500, 1400, q=0.8), -4), K('rpg/cloth%d' % r.choice([1, 2, 3, 4]), rate=rate * r.uniform(0.9, 1.2), db=-4)), db)


def rumble(dur, seed=1, lo=120):
    return jitter_am(svf(noise(dur, 'brown', seed=seed), lo, 0.8), 14, 0.5, seed=seed + 1)


# D dorian, low: the skald's mode
D3, E3, F3, G3, A3, C4, D4 = 146.8, 164.8, 174.6, 196.0, 220.0, 261.6, 293.7


def sing(dur, pts, vowels, seed=5, k=1.5):
    """a sung note (a chesty baritone): a formant voice with a slow vibrato, some breath."""
    v = voice(dur, glide(pts), vowels, wave='saw', vib=(5.2, 3.5), q=8)
    b = svf(noise(dur, 'pink', seed=seed), 1200, 0.9, 'bp')
    return shape(mix(drive(v, k), gain(b, -16)), [(0, 0), (0.08, 1), (0.8, 0.85), (1, 0)])


# ======================= Raven Talons =======================
@S('sfx_ravencaw', TELL, 1.3, syn='two synthesized raven caws and wingbeats')
def _():
    return mix(caw(0.3, 520, 400, seed=1), at(gain(caw(0.26, 560, 430, seed=2), -1), 0.38),
               at(flap(1), 0.0), at(flap(2, db=-2), 0.22), at(flap(3, db=-3), 0.6), at(flap(4, db=-5), 0.86))


@S('sfx_ravensteal', TELL, 1.1, syn='a synthesized gloating caw')
def _():
    kk = mix(caw(0.12, 600, 520, seed=5, k=2.2), at(gain(caw(0.12, 640, 540, seed=6, k=2.2), -1), 0.17), at(gain(caw(0.22, 600, 440, seed=7), 0), 0.34))
    return mix(K('rpg/handleCoins', rate=1.1), at(K('rpg/handleCoins2', rate=1.25, db=-4), 0.1), at(gain(kk, -1), 0.12), at(flap(8, db=-6), 0.05))


@S('sfx_ravenhurt', LOW, 0.45, syn='a synthesized squawk')
def _():
    return mix(K('imp/impactSoft_medium_002', rate=1.2, db=-4), at(caw(0.16, 760, 560, seed=9, k=3), 0.01), at(flap(10, rate=1.3, db=-6), 0.0))


@S('sfx_ravendie', REF, 1.6, syn='a synthesized caw falling away and a flurry of wings', fade=0.4)
def _():
    fall = caw(0.7, 600, 260, seed=11, k=2.4)
    return mix(fall, at(flap(12), 0.05), at(flap(13, db=-2), 0.2), at(flap(14, db=-4), 0.34), at(flap(15, db=-6), 0.5),
               at(K('imp/impactSoft_heavy_001', rate=0.9), 0.72), at(K('imp/footstep_carpet_002', rate=0.8, db=-4), 0.75))


# ======================= Skald Slippers =======================
@S('sfx_skaldsong', TELL, 2.4, syn='a synthesized lyre and a sung saga phrase', fade=0.5)
def _():
    lyre = mix(strum([D3, A3, D4, F3 * 2], 0.035, 1.6, seed=21), at(strum([C4, G3 * 2], 0.04, 1.2, seed=31, db=-3), 0.95))
    # "HEY — YA — HO": three held syllables in the mode
    phrase = mix(sing(0.42, [(0, A3), (0.05, D4), (0.42, D4)], [650, 1080, 2650], seed=41),
                 at(sing(0.38, [(0, C4), (0.38, C4)], [700, 1220, 2600], seed=42), 0.44),
                 at(sing(0.8, [(0, A3), (0.5, A3), (0.8, G3)], [500, 860, 2450], seed=43), 0.84))
    return mix(lyre, at(gain(phrase, -2), 0.12))


@S('sfx_skaldrally', MID, 1.4, syn='a synthesized lyre run and a sung shout', fade=0.4)
def _():
    run = strum([D3, F3, A3, D4], 0.08, 1.0, seed=51)
    ho = sing(0.35, [(0, C4), (0.06, D4), (0.35, C4)], [700, 1150, 2600], seed=52, k=2.0)
    return mix(run, at(gain(ho, -1), 0.34))


@S('sfx_skaldhurt', LOW, 0.5, syn='a synthesized grunt and a jangled string')
def _():
    g = shout(0.18, [(0, 190), (0.18, 140)], [600, 1100, 2450], k=2.0, seed=61)
    twang = pluck(0.4, 233.1, seed=62, bright=0.9)
    return mix(K('imp/impactPunch_medium_001', rate=1.0, db=-4), at(shape(g, [(0, 0), (0.1, 1), (1, 0)]), 0.01), at(gain(twang, -6), 0.02))


@S('sfx_skalddie', REF, 2.0, syn='a synthesized snapping string and a last sung note falling away', fade=0.5)
def _():
    snap = mix(gain(pluck(0.6, D4 * 2, seed=71, bright=1.0), -2), env(svf(noise(0.04, 'white', seed=72), 4000, 0.7, 'hp'), a=0.001, r=0.03))
    last = sing(1.1, [(0, D4), (0.3, C4), (1.1, D3)], [600, 1000, 2500], seed=73, k=1.3)
    return mix(snap, at(gain(last, -2), 0.12), at(K('imp/impactWood_medium_002', rate=0.85, db=-2), 0.9),
               at(K('imp/impactWood_light_003', rate=1.0, db=-8), 1.12), at(gain(strum([D3, F3, A3], 0.01, 0.6, seed=74), -8), 0.92))


# ======================= Dwarf-Forged Boots =======================
def anvil(dur=1.0, f=820, d=0.4):
    """a ringing anvil: a struck bell with a hard attack."""
    return mix(bell(dur, f, d=d), gain(bell(dur * 0.6, f * 1.47, d=d * 0.5), -8))


@S('sfx_dwarfspawn', TELL, 1.3, syn='a synthesized anvil ring and a dwarf\'s shout', fade=0.35)
def _():
    hah = shout(0.28, [(0, 130), (0.08, 150), (0.28, 115)], [620, 1050, 2400], k=2.4, seed=81)
    hah = shape(hah, [(0, 0), (0.08, 1), (0.6, 0.8), (1, 0)])
    return mix(K('imp/impactMetal_heavy_001', rate=0.85), at(gain(anvil(1.1, 760), -6), 0.004), at(gain(thump(0.4, 100, 40, 0.14), 0), 0.24),
               at(K('imp/impactPunch_heavy_002', rate=0.7, db=-3), 0.24), at(gain(hah, -1), 0.36))


@S('sfx_dwarfhurt', LOW, 0.5, syn='a synthesized grunt')
def _():
    g = shout(0.17, [(0, 150), (0.17, 105)], [560, 980, 2300], k=2.2, seed=83)
    return mix(K('imp/impactPlate_medium_001', rate=0.9, db=-2), at(shape(g, [(0, 0), (0.1, 1), (1, 0)]), 0.02))


@S('sfx_dwarfblock', MID, 0.8, syn='a synthesized anvil ring', fade=0.25)
def _():
    return mix(K('imp/impactBell_heavy_002', rate=1.05), at(K('imp/impactMetal_medium_002', rate=0.9, db=-3), 0.003), at(gain(anvil(0.7, 980, 0.25), -9), 0.004))


@S('sfx_dwarfbreak', HI, 1.5, syn='a synthesized splitting crack and the rune\'s light going out', fade=0.4)
def _():
    crack = env(svf(noise(0.12, 'white', seed=91), 1800, 0.6, 'hp'), a=0.001, d=0.05)
    fizzle = shape(svf(noise(0.7, 'pink', seed=92), sweep(5000, 600, 0.7), 2.0, 'bp'), [(0, 0), (0.1, 1), (1, 0)])
    return mix(K('imp/impactMetal_heavy_003', rate=0.8), at(K('imp/impactPlate_heavy_001', rate=0.85, db=-2), 0.01), gain(crack, -2),
               at(chain_rattle(0.6, 10, seed=93, rate=0.9), 0.08), at(gain(fizzle, -8), 0.05), at(gain(anvil(0.9, 640, 0.3), -10), 0.0),
               at(K('imp/impactMetal_light_002', rate=0.8, db=-6), 0.46), at(K('imp/impactMetal_light_004', rate=0.9, db=-9), 0.62))


@S('sfx_dwarfdie', REF, 1.8, syn='a synthesized groan and a dying anvil ring', fade=0.45)
def _():
    groan = shout(0.8, [(0, 140), (0.3, 125), (0.8, 70)], [560, 950, 2250], k=1.8, seed=95, vib=(4, 5))
    groan = shape(groan, [(0, 0), (0.1, 1), (0.6, 0.6), (1, 0)])
    return mix(groan, at(K('imp/impactPlate_heavy_003', rate=0.75), 0.45), at(gain(thump(0.5, 80, 32, 0.2), 0), 0.45),
               at(chain_rattle(0.5, 8, seed=96, rate=0.8), 0.5), at(K('rpg/metalPot2', rate=0.8, db=-4), 0.62), at(gain(anvil(1.0, 700, 0.35), -12), 0.48))


# ======================= Muspel Fire-Feet =======================
@S('sfx_muspelspawn', TELL, 1.8, syn='a synthesized roar of flame and a fire giant\'s growl', fade=0.45)
def _():
    d = 1.4
    flame = shape(fire(d, seed=101, lo=420), [(0, 0), (0.2, 1), (0.8, 0.8), (1, 0)])
    growl = shout(1.0, [(0, 70), (0.3, 92), (1.0, 66)], [420, 800, 2100], k=3.0, seed=102, vib=(6, 5))
    growl = shape(mix(growl, gain(rumble(1.0, seed=103), -2)), [(0, 0), (0.15, 1), (0.75, 0.8), (1, 0)])
    return mix(gain(flame, -1), at(gain(growl, -2), 0.12), at(K('imp/impactMining_002', rate=0.6, db=-4), 0.1))


@S('sfx_muspelhurt', LOW, 0.5, syn='a synthesized hiss')
def _():
    hiss = env(svf(noise(0.35, 'white', seed=111), 3500, 0.7, 'hp'), a=0.004, d=0.12)
    return mix(K('imp/impactMining_001', rate=0.9, db=-2), at(gain(hiss, -8), 0.02), at(gain(crackle(0.3, 300, seed=112), -10), 0.0))


@S('sfx_muspelscorch', MID, 1.1, syn='a synthesized burst of flame', fade=0.35)
def _():
    burst = shape(fire(0.9, seed=121, lo=700), [(0, 0), (0.05, 1), (0.5, 0.7), (1, 0)])
    wh = whoosh(0.4, 300, 2200, q=0.9)
    return mix(gain(burst, 0), gain(wh, -4), at(gain(crackle(0.8, 400, seed=122), -6), 0.05))


@S('sfx_muspeldie', REF, 2.1, syn='a synthesized dying roar, the fire guttering out and a hiss of steam', fade=0.5)
def _():
    roar = shout(0.9, [(0, 90), (0.3, 80), (0.9, 45)], [420, 780, 2000], k=2.6, seed=131, vib=(5, 4))
    roar = shape(roar, [(0, 0), (0.1, 1), (0.6, 0.6), (1, 0)])
    out = shape(fire(1.6, seed=132, lo=380), [(0, 1), (0.5, 0.6), (1, 0)])
    steam = shape(svf(noise(1.0, 'white', seed=133), 4000, 0.7, 'hp'), [(0, 0), (0.15, 1), (1, 0)])
    return mix(roar, at(K('imp/impactMining_003', rate=0.6), 0.4), at(K('imp/impactMining_004', rate=0.55, db=-2), 0.55),
               at(gain(thump(0.6, 70, 30, 0.25), 0), 0.42), at(gain(out, -5), 0.3), at(gain(steam, -14), 0.6))
