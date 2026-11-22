"""Peel smack SFX (src/game/smacks.ts): a smack for every material family, signature tails, and a tail for every
hero and god peel. Built with the boss-sfx kit (../boss-sfx: dsp.py, render.py), so levels are measured the same way.

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR [key-substring ...]   # Kenney CC0 packs (../boss-sfx/getpacks.sh)
  python3 -I integrate.py OUTDIR <repo>                                     # copy and credit

Each family has three takes (sfx_smack_<family>_1..3, alternated in play) and a heavy one for crits and big hits
(sfx_smack_<family>_heavy). Every take is a short smack of skin (Kenney's punches, or the game's own freesound slaps
for 'skin') under the family's material.

Levels are the 50 ms RMS peak, levelled in the file itself (no TRIM entry): the takes sit where the classic slap
does after its trims (about -10.5), heavy takes where the crit does (-8.5), and the tails under the smack they
follow (-12 for the big signatures, -13.5 for hero tails, -14 to -15 for small glints and chimes)."""
import json
import math
import multiprocessing as mp
import os
import random
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
import dsp  # noqa: E402
from dsp import SR, K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant, am, jitter_am, bell, whoosh, thump, n  # noqa: E402
import render  # noqa: E402

REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
TAKE, HEAVY = -10.5, -8.5
BIG, HERO, SMALL, TINY = -12.0, -13.5, -14.0, -15.0
REG = []


def S(key, level, dur, syn=None, fade=0.04):
    def deco(fn):
        REG.append(dict(key=key, level=level, dur=dur, syn=syn, fade=fade, fn=fn))
        return fn
    return deco


def FS(i, rate=1.0, db=0.0):
    """The game's own slaps (freesound CC0: public/audio/sfx_slap_N.mp3)."""
    dsp.USED.append(f'fs/sfx_slap_{i}')
    x = dsp.decode(os.path.join(REPO, 'public', 'audio', f'sfx_slap_{i}.mp3'))
    if rate != 1.0:
        x = dsp.resample(x, rate)
    return gain(x, db)


def core(i, heavy=False, db=-7.0):
    """The peel meeting skin: a short punch under every material."""
    if heavy:
        return K(f'imp/impactPunch_heavy_00{i % 5}', rate=1.0, db=db)
    return K(f'imp/impactPunch_medium_00{i % 5}', rate=1.15, db=db)


def lp(x, f):
    return dsp.fx(x, f'lowpass=f={f}')


def hp(x, f):
    return dsp.fx(x, f'highpass=f={f}')


def decay(x, d):
    return env(x, a=0.001, d=d, r=0.02)


def pops(count, f0, spread, gap, seed):
    r = random.Random(seed)
    out = []
    for k in range(count):
        f = f0 * (1 + r.uniform(-spread, spread))
        L = r.uniform(0.03, 0.05)
        out.append(at(gain(env(tone(L, sweep(f, f * 2.3, L)), a=0.001, d=L / 3, r=0.004), r.uniform(-4, 0)), k * gap + r.uniform(0, gap * 0.4)))
    return mix(*out)


def chord(notes, d=0.2, gap=0.0, dur=0.5, db=0.0):
    return mix(*[at(gain(bell(dur, f, d=d), db - i), i * gap) for i, f in enumerate(notes)])


def pluck(f, dur, bright=0.5, seed=1):
    """Karplus-Strong string."""
    r = random.Random(seed)
    N = max(2, int(SR / f))
    buf = [r.uniform(-1, 1) for _ in range(N)]
    out = []
    k = 0.5 + bright * 0.49
    for i in range(n(dur)):
        j = i % N
        v = buf[j]
        nxt = buf[(j + 1) % N]
        buf[j] = (v * k + nxt * (1 - k)) * 0.996
        out.append(v)
    return env(out, a=0.001, r=0.03)


def voice(dur, f, vowels, wave='saw', vib=None, q=7):
    return formant(tone(dur, f, wave, vib=vib), vowels, q=q, amps=[1.0, 0.6, 0.35][:len(vowels)])


def horn(notes, step, vowels=(600, 1100, 2400), wave='saw', db=0.0):
    parts = []
    for i, (f, L) in enumerate(notes):
        parts.append(at(gain(shape(voice(L, f, list(vowels), wave, vib=(5.5, 3)), [(0, 0), (0.08, 1), (0.7, 0.85), (1, 0)]), db), i * step))
    return mix(*parts)


def zapz(dur, f, seed=1):
    c = jitter_am(svf(noise(dur, 'white', seed=seed), f, 1.5, 'bp'), 140, 0.9, seed=seed)
    b = am(tone(dur, f / 8, 'saw'), 60, 0.7)
    return shape(mix(c, gain(svf(b, f, 0.8), -8)), [(0, 0), (0.03, 1), (0.4, 0.6), (1, 0)])


def laser(f0, f1, dur, wave='saw', q=1.0):
    return env(svf(tone(dur, sweep(f0, f1, dur), wave), max(f0, f1) * 1.5, q), a=0.002, d=dur / 2.5, r=0.02)


def flutter(dur, rate, f=900, seed=1):
    return shape(am(svf(noise(dur, 'pink', seed=seed), f, 1.2, 'bp'), rate, 0.95), [(0, 0), (0.15, 1), (1, 0)])


def crackle(dur, dens, f=3000, seed=1, dec=0.0007):
    return shape(svf(grains(dur, dens, seed=seed, dec=dec), f, 0.8, 'hp'), [(0, 1), (1, 0)])


def splash(dur, seed=1):
    w = shape(svf(noise(dur, 'white', seed=seed), sweep(5500, 700, dur), 0.9, 'lp'), [(0, 0), (0.04, 1), (0.35, 0.35), (1, 0)])
    return mix(w, gain(bubbles(dur, 6, 400, 1300, seed=seed), -10))


def rumble(dur, f=180, seed=1):
    return shape(svf(noise(dur, 'brown', seed=seed), f, 0.8), [(0, 0), (0.08, 1), (0.5, 0.6), (1, 0)])


def crack(seed=1):
    """the snap at the front of thunder."""
    c = shape(svf(noise(0.12, 'white', seed=seed), 2500, 0.7, 'hp'), [(0, 1), (0.15, 0.6), (1, 0)])
    return mix(c, gain(grains(0.12, 900, seed=seed, dec=0.0005), -4))


def thunder(dur=0.8, seed=1, f=160):
    return mix(gain(crack(seed), 0), at(gain(rumble(dur - 0.05, f, seed), -2), 0.03), at(K('sci/lowFrequency_explosion_000', 0, dur, rate=1.15, db=-8), 0.02))


def boing(dur, f0, depth, rate=18, wave='sin'):
    f = lambda t: f0 + depth * math.sin(2 * math.pi * rate * t) * math.exp(-t * 7)  # noqa: E731
    return env(tone(dur, f, wave), a=0.002, d=dur / 2, r=0.03)


def screech(dur, f0, f1, seed=1):
    v = voice(dur, glide([(0, f0), (dur * 0.3, f0 * 1.15), (dur, f1)]), [f0 * 1.6, f0 * 3.1], 'saw', vib=(24, 30))
    return shape(drive(v, 1.6), [(0, 0), (0.1, 1), (0.6, 0.6), (1, 0)])


def snap_fx(seed=1):
    return mix(env(svf(noise(0.04, 'white', seed=seed), 2200, 2.0, 'bp'), a=0.0005, d=0.01, r=0.005), K('ui/click_003', rate=1.4, db=-8))


def rev(x):
    return x[::-1]


# ════════════════════════════ families ════════════════════════════
R3 = [1.0, 1.05, 0.95]


def family(name, syn=None, dur=0.4, hdur=0.55):
    """Register three takes and a heavy take from fn(i, heavy)."""
    def deco(fn):
        for i in range(3):
            S(f'sfx_smack_{name}_{i + 1}', TAKE, dur, syn=syn)(lambda i=i: fn(i, False))
        S(f'sfx_smack_{name}_heavy', HEAVY, hdur, syn=syn)(lambda: fn(3, True))
        return fn
    return deco


@family('wood')
def _(i, h):
    if h:
        return mix(K('imp/impactWood_heavy_001', rate=0.95), K('imp/impactPlank_medium_003', db=-6), core(i, True, -5))
    return mix(K(f'imp/impactWood_medium_00{i}', rate=R3[i]), core(i, db=-8))


@family('metal', syn='a short synthesized ring')
def _(i, h):
    ring = gain(bell(0.3, [1880, 2010, 1760, 1240][i], d=0.07), -16 if not h else -12)
    if h:
        return mix(K('imp/impactMetal_heavy_001', rate=0.95), K('imp/impactMetal_medium_002', db=-6), core(i, True, -5), ring)
    return mix(K(f'imp/impactMetal_light_00{i}', rate=R3[i] * 1.05), K(f'imp/impactPlate_medium_00{i}', db=-9), core(i, db=-8), ring)


@family('rubber', syn='a synthesized rubbery bonk')
def _(i, h):
    f0 = [430, 470, 400, 300][i]
    bonk = env(tone(0.24 if h else 0.2, glide([(0, f0), (0.04, f0 * 0.62), (0.2, f0 * 0.5)]), 'tri'), a=0.002, d=0.06 if not h else 0.09, r=0.03)
    if h:
        return mix(K('imp/impactSoft_heavy_001', rate=1.1), gain(bonk, -3), core(i, True, -5))
    return mix(K(f'imp/impactSoft_medium_00{i}', rate=1.3 * R3[i]), gain(bonk, -4), core(i, db=-9))


@family('glass', syn='a short synthesized glass ring')
def _(i, h):
    ring = gain(bell(0.3, [3100, 3400, 2900, 2600][i], d=0.07), -16)
    if h:
        return mix(K('imp/impactGlass_heavy_001', 0, 0.5, rate=1.05), K('imp/impactGlass_light_003', db=-6), core(i, True, -5), ring)
    return mix(K(f'imp/impactGlass_light_00{i}', rate=R3[i]), core(i, db=-7), ring)


@family('stone', syn='a low synthesized thump')
def _(i, h):
    if h:
        return mix(K('imp/impactMining_003', rate=0.8), gain(thump(0.3, 110, 45, 0.08), -3), core(i, True, -4))
    return mix(K(f'imp/impactMining_00{i}', rate=0.95 * R3[i]), gain(thump(0.15, 130, 60, 0.04), -6), core(i, db=-8))


@family('ceramic')
def _(i, h):
    if h:
        return mix(K('imp/impactPlate_heavy_000', rate=1.05), K('imp/impactPlate_light_003', db=-6), core(i, True, -5))
    return mix(K(f'imp/impactPlate_light_00{i}', rate=1.05 * R3[i]), K(f'imp/impactGlass_light_00{i + 1}', db=-14), core(i, db=-8))


@family('fabric')
def _(i, h):
    if h:
        return mix(K('imp/impactSoft_heavy_002', rate=1.0), K('rpg/clothBelt', 0, 0.3, db=-6), core(i, True, -4))
    return mix(K(f'rpg/cloth{i + 1}', 0, 0.18, rate=1.3, db=-4), K(f'imp/impactSoft_medium_00{i}', rate=1.15 * R3[i]), core(i, db=-6))


@family('leather')
def _(i, h):
    if h:
        return mix(K('rpg/dropLeather', 0, 0.4, rate=0.95), K('imp/impactPunch_heavy_003', db=-1))
    src = ['rpg/handleSmallLeather', 'rpg/handleSmallLeather2', 'rpg/dropLeather'][i]
    return mix(K(src, 0, 0.25, rate=R3[i] * 1.1, db=-3), K(f'imp/impactPunch_medium_00{i}', rate=1.05, db=-1))


@family('fur', syn='a soft synthesized puff')
def _(i, h):
    puff = gain(shape(svf(noise(0.2, 'brown', seed=i), 600, 0.8), [(0, 0), (0.05, 1), (1, 0)]), -8)
    if h:
        return mix(lp(K('imp/impactSoft_heavy_003', rate=0.95), 1800), lp(core(i, True, -4), 2000), K('rpg/cloth4', 0, 0.25, db=-8), puff)
    return mix(lp(K(f'imp/impactSoft_medium_00{i}', rate=R3[i]), 1600), K(f'rpg/cloth{i + 1}', 0, 0.15, rate=1.1, db=-9), lp(core(i, db=-7), 1800), puff)


@family('dough', syn='a synthesized doughy squish')
def _(i, h):
    L = 0.28 if h else 0.18
    squish = shape(svf(noise(L, 'pink', seed=10 + i), sweep(1100, 280, L), 2.0, 'bp'), [(0, 0), (0.08, 1), (1, 0)])
    if h:
        return mix(K('imp/impactSoft_heavy_004', rate=1.05), gain(squish, -2), K('sci/slime_000', 0, 0.2, rate=1.3, db=-12), core(i, True, -5))
    return mix(K(f'imp/impactSoft_heavy_00{i}', rate=1.35 * R3[i]), gain(squish, -5), K('sci/slime_000', 0, 0.15, rate=1.6, db=-15), core(i, db=-9))


@family('crispy', syn='a synthesized crust crunch')
def _(i, h):
    cr = shape(svf(grains(0.2 if h else 0.13, 1300 if h else 900, seed=20 + i, dec=0.0008), 2500, 0.8, 'hp'), [(0, 1), (0.3, 0.7), (1, 0)])
    if h:
        return mix(K('imp/impactWood_light_003', rate=1.2), K('imp/impactPlank_medium_001', rate=1.2, db=-6), gain(cr, -2), core(i, True, -5))
    return mix(K(f'imp/impactWood_light_00{i}', rate=1.35 * R3[i]), gain(cr, -4), core(i, db=-7))


@family('sauce', syn='a wet synthesized splat')
def _(i, h):
    L = 0.3 if h else 0.22
    wet = shape(svf(noise(L, 'pink', seed=30 + i), sweep(2600, 500, L), 1.3, 'lp'), [(0, 0), (0.04, 1), (0.3, 0.4), (1, 0)])
    if h:
        return mix(K('sci/slime_001', 0, 0.35, rate=0.95, db=-2), gain(wet, -2), core(i, True, -4))
    return mix(K(f'sci/slime_00{i % 2}', 0, 0.22, rate=1.2 * R3[i], db=-3), gain(wet, -4), core(i, db=-6))


@family('slime', syn='synthesized slime bubbles')
def _(i, h):
    b = bubbles(0.35 if h else 0.25, 8 if h else 5, 220, 800, seed=40 + i)
    if h:
        return mix(K('sci/slime_001', rate=0.8), gain(b, -6), K('imp/impactSoft_heavy_000', db=-5), core(i, True, -7))
    return mix(K(f'sci/slime_00{i % 2}', 0, 0.3, rate=0.95 * R3[i] + 0.1 * i), gain(b, -8), K(f'imp/impactSoft_medium_00{i}', db=-6), core(i, db=-10))


@family('gold', syn='a synthesized golden ring')
def _(i, h):
    f = [1568, 1760, 1661, 1397][i]
    ring = mix(gain(bell(0.35, f, d=0.12), -8), gain(bell(0.3, f * 1.5, d=0.08), -12))
    if h:
        return mix(K('imp/impactBell_heavy_001', 0, 0.5, rate=1.2, db=-3), K('rpg/handleCoins', 0, 0.3, db=-6), ring, core(i, True, -5))
    return mix(K(f'imp/impactMetal_light_00{i}', rate=1.2 * R3[i], db=-2), ring, core(i, db=-8))


@family('crystal', syn='a synthesized crystal ring')
def _(i, h):
    f = [2637, 2960, 2794, 2349][i]
    if h:
        return mix(K('imp/impactGlass_medium_001', rate=1.1, db=-2), chord([f, f * 1.26, f * 1.5], d=0.15, gap=0.025, dur=0.5, db=-7), core(i, True, -5))
    return mix(K(f'imp/impactGlass_light_00{i}', rate=1.25 * R3[i], db=-3), gain(bell(0.4, f, d=0.14), -7), gain(bell(0.35, f * 1.5, d=0.1), -12), core(i, db=-8))


@family('ice', syn='a synthesized icy crackle')
def _(i, h):
    c = crackle(0.3 if h else 0.2, 1100 if h else 700, 3000, seed=50 + i, dec=0.0006)
    if h:
        return mix(K('imp/impactGlass_heavy_002', 0, 0.5, rate=1.1, db=-1), gain(c, -3), core(i, True, -5))
    return mix(K(f'imp/impactGlass_medium_00{i}', rate=1.3 * R3[i], db=-2), gain(c, -6), core(i, db=-7))


@family('snow')
def _(i, h):
    if h:
        return mix(K('imp/footstep_snow_003', rate=0.95), at(K('imp/footstep_snow_004', rate=1.1, db=-4), 0.04), lp(K('imp/impactSoft_heavy_001'), 1800), core(i, True, -6))
    return mix(K(f'imp/footstep_snow_00{i}', rate=1.1 * R3[i]), lp(K(f'imp/impactSoft_medium_00{i}', db=-5), 2000), core(i, db=-9))


@family('fire', syn='a synthesized fire crackle')
def _(i, h):
    c = gain(svf(grains(0.3, 300, seed=60 + i, dec=0.0012), 2400, 0.8), -10)
    if h:
        return mix(shape(K('sci/thrusterFire_003', 0, 0.45, rate=1.0, db=-2), [(0, 1), (0.3, 0.8), (1, 0)]), K('sci/lowFrequency_explosion_001', 0, 0.45, rate=1.3, db=-8), c, core(i, True, -4))
    return mix(shape(K(f'sci/thrusterFire_00{i}', 0, 0.28, rate=1.2 * R3[i], db=-3), [(0, 1), (0.25, 0.7), (1, 0)]), c, core(i, db=-6))


@family('electric', syn='a synthesized electric crackle')
def _(i, h):
    z = gain(zapz(0.25 if h else 0.16, [3200, 3600, 2800, 2400][i], seed=70 + i), -8)
    if h:
        return mix(K('sci/forceField_001', 0, 0.35, rate=1.3, db=-6), K('dgt/zap2', rate=0.85, db=-3), z, core(i, True, -4))
    return mix(K(['dgt/zap1', 'dgt/zap2', 'dgt/zapTwoTone'][i], 0, 0.2, rate=1.1 * R3[i], db=-5), z, core(i, db=-6))


@family('tech', syn='a synthesized blip')
def _(i, h):
    blip = gain(env(tone(0.07, [880, 988, 784, 440][i], 'sq'), a=0.002, r=0.02), -18)
    if h:
        return mix(K('sci/impactMetal_003', rate=0.95, db=-2), K('sci/computerNoise_001', 0, 0.25, db=-12), at(blip, 0.03), core(i, True, -4))
    return mix(K(f'sci/impactMetal_00{i}', rate=1.1 * R3[i], db=-3), at(blip, 0.02), K(f'ui/click_00{i + 1}', db=-12), core(i, db=-8))


PENTA = [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637]


@family('magic', syn='a synthesized sparkle')
def _(i, h):
    r = random.Random(80 + i)
    notes = [PENTA[r.randrange(len(PENTA))] for _ in range(5 if h else 3)]
    sp = chord(sorted(notes), d=0.08, gap=0.03, dur=0.35, db=-12)
    sw = gain(whoosh(0.2, 2000, 6000, q=1.5), -18)
    if h:
        return mix(core(i, True, -3), at(sp, 0.01), gain(whoosh(0.3, 5000, 1200, q=1.5), -16))
    return mix(core(i, db=-4), at(sp, 0.01), sw)


@family('cosmic', syn='a synthesized space shimmer')
def _(i, h):
    sh = gain(env(tone(0.3, 1200 + 150 * i, 'sin', vib=(9, 40)), a=0.005, d=0.1, r=0.03), -18)
    if h:
        return mix(core(i, True, -3), K('dgt/lowDown', rate=1.2, db=-9), sh)
    return mix(core(i, db=-4), K(f'dgt/phaserDown{i + 1}', rate=1.25 * R3[i], db=-9), sh)


@family('ghost', syn='a synthesized ghostly wail')
def _(i, h):
    w = gain(env(tone(0.35, sweep([720, 800, 660, 520][i], 420, 0.35), 'sin', vib=(6, 14)), a=0.03, d=0.15, r=0.05), -15)
    body = dsp.fx(core(i, h, -3), 'lowpass=f=1400,aecho=0.6:0.5:70:0.35')
    return mix(body, at(w, 0.02), gain(rev(whoosh(0.18, 600, 2500, q=1.2)), -18))


@family('water', syn='a synthesized splash')
def _(i, h):
    return mix(core(i, h, -5 if not h else -3), gain(splash(0.38 if h else 0.28, seed=90 + i), -6 if not h else -3))


@family('bubble', syn='synthesized bubble pops')
def _(i, h):
    p = pops(5 if h else 3, [700, 820, 620, 560][i], 0.3, 0.035, 100 + i)
    if h:
        return mix(K('imp/impactSoft_heavy_002', rate=1.2, db=-5), gain(p, -2), core(i, True, -6))
    return mix(K(f'imp/impactSoft_medium_00{i}', rate=1.3, db=-6), gain(p, -3), core(i, db=-9))


@family('bone')
def _(i, h):
    if h:
        return mix(K('imp/impactWood_heavy_002', rate=1.4), K('cas/dice-shake-2', 0, 0.3, rate=1.2, db=-8), core(i, True, -5))
    return mix(K(f'imp/impactWood_light_00{i}', rate=1.7 * R3[i]), K(f'cas/dice-throw-{i + 1}', 0, 0.12, rate=1.2, db=-8), core(i, db=-9))


@family('scales', syn='a synthesized scaly rasp')
def _(i, h):
    L = 0.24 if h else 0.16
    rasp = shape(jitter_am(svf(noise(L, 'white', seed=110 + i), 3200, 1.2, 'bp'), 90, 0.8, seed=i), [(0, 0), (0.1, 1), (1, 0)])
    return mix(core(i, h, -3), gain(rasp, -8 if not h else -6), K('rpg/handleSmallLeather', 0, 0.2, db=-10))


@family('plastic')
def _(i, h):
    if h:
        return mix(K('imp/impactGeneric_light_003', rate=0.8), K('cas/chips-stack-2', 0, 0.25, db=-5), core(i, True, -5))
    return mix(K(f'imp/impactGeneric_light_00{i}', rate=1.1 * R3[i]), K(f'cas/chips-collide-{i + 1}', 0, 0.15, db=-6), core(i, db=-8))


@family('cardboard')
def _(i, h):
    if h:
        return mix(K('rpg/bookClose', rate=0.95), lp(K('imp/impactPlank_medium_003', rate=1.0, db=-3), 3000), core(i, True, -5))
    return mix(lp(K(f'imp/impactPlank_medium_00{i}', rate=1.25 * R3[i]), 3000), K(f'rpg/bookPlace{i + 1}', db=-3), core(i, db=-7))


@family('sand', syn='a synthesized sandy hiss')
def _(i, h):
    g = shape(svf(grains(0.25 if h else 0.18, 1500, seed=120 + i, dec=0.0004), 2000, 0.8, 'hp'), [(0, 1), (1, 0)])
    if h:
        return mix(K('imp/footstep_grass_003', rate=1.0, db=-3), gain(g, -4), core(i, True, -4))
    return mix(K(f'imp/footstep_concrete_00{i}', rate=1.2 * R3[i], db=-4), gain(g, -6), core(i, db=-6))


@family('skin')
def _(i, h):
    if h:
        return mix(FS(3, rate=0.85), K('imp/impactPunch_heavy_001', db=-3))
    return mix(FS(i + 1, rate=0.92), K(f'imp/impactPunch_medium_00{i}', rate=1.0, db=-4))


# ════════════════════════════ signature tails ════════════════════════════
def T(name, level, dur, syn, fade=0.06):
    return S(f'sfx_smack_tail_{name}', level, dur, syn=syn, fade=fade)


@T('thunder', BIG, 0.9, 'a synthesized thunder crack and rumble', fade=0.25)
def _():
    return thunder(0.88, seed=3)


@T('honk', BIG, 0.32, 'a synthesized bulb-horn honk')
def _():
    src = tone(0.3, glide([(0, 330), (0.04, 372), (0.25, 350), (0.3, 320)]), 'saw', vib=(30, 6))
    h_ = shape(formant(src, [700, 1250, 2600], q=4, amps=[1, 0.7, 0.3]), [(0, 0), (0.05, 1), (0.8, 0.9), (1, 0)])
    return mix(drive(h_, 1.5), gain(K('rpg/cloth2', 0, 0.08, rate=1.5), -14))


@T('kinghonk', BIG, 0.6, 'a synthesized two-note royal honk')
def _():
    def hk(f, L):
        return shape(formant(tone(L, glide([(0, f), (0.04, f * 1.12), (L, f * 1.04)]), 'saw', vib=(28, 6)), [650, 1150, 2500], q=4), [(0, 0), (0.05, 1), (0.85, 0.9), (1, 0)])
    return mix(drive(hk(250, 0.24), 1.5), at(drive(hk(375, 0.3), 1.5), 0.26))


@T('coin', SMALL, 0.5, 'a synthesized coin chime')
def _():
    ring = mix(gain(bell(0.45, 2093, d=0.2), -4), at(gain(bell(0.4, 2637, d=0.18), -7), 0.06))
    return mix(K('rpg/handleCoins', 0, 0.18, rate=1.2, db=-8), ring)


@T('glint', TINY, 0.42, 'a synthesized sparkle glint')
def _():
    return mix(chord([3520, 4186, 5274], d=0.07, gap=0.045, dur=0.35, db=-2), gain(whoosh(0.3, 6000, 9000, q=2), -14))


@T('ultra', SMALL, 0.7, 'a synthesized crystal shimmer', fade=0.15)
def _():
    notes = [1760, 2093, 2349, 2637, 3136, 3520]
    return mix(chord(notes, d=0.12, gap=0.05, dur=0.5, db=-3), gain(whoosh(0.6, 3000, 9000, q=1.6), -12))


@T('crown', SMALL, 0.55, 'a synthesized golden two-note fanfare')
def _():
    return mix(gain(svf(horn([(784, 0.12), (1047, 0.32)], 0.11, vowels=(800, 1400, 2800)), 4000, 0.7), -2), at(gain(bell(0.4, 2093, d=0.15), -10), 0.11))


@T('trophy', SMALL, 0.55, 'a synthesized trophy chime')
def _():
    return chord([1047, 1319, 1568, 2093], d=0.2, gap=0.04, dur=0.5)


@T('pop', BIG, 0.25, 'a synthesized balloon pop')
def _():
    b = env(svf(noise(0.06, 'white', seed=5), 1800, 0.7, 'hp'), a=0.0005, d=0.012, r=0.01)
    return mix(b, gain(thump(0.1, 200, 90, 0.025), -6), at(gain(rev(whoosh(0.1, 500, 3000)), -20), 0.0))


@T('chomp', SMALL, 0.35, 'a synthesized growl under the bite')
def _():
    growl = drive(voice(0.25, glide([(0, 110), (0.25, 80)]), [500, 1100]), 2.5)
    return mix(K('imp/impactWood_heavy_003', rate=1.5, db=-2), at(K('cas/dice-throw-2', 0, 0.1, rate=1.3, db=-6), 0.04), gain(jitter_am(growl, 30, 0.6, seed=4), -10))


@T('squawk', SMALL, 0.42, 'a synthesized gull squawk')
def _():
    return screech(0.36, 1100, 800, seed=2)


@T('jukebox', SMALL, 0.6, 'a synthesized doo-wop organ arpeggio', fade=0.1)
def _():
    notes = [(523, 0.12), (659, 0.12), (784, 0.28)]
    org = mix(*[at(env(tone(L, f, 'sin', harm=[(1, 1), (2, 0.5), (3, 0.25), (4, 0.12)], vib=(6, 3)), a=0.01, r=0.04), k * 0.11) for k, (f, L) in enumerate(notes)])
    return gain(org, -2)


@T('mirror', SMALL, 0.6, 'a synthesized shimmering glass ring', fade=0.15)
def _():
    beat = mix(bell(0.55, 1760, d=0.2), gain(bell(0.55, 1765.5, d=0.2), -1), gain(bell(0.5, 2640, d=0.12), -8))
    return mix(beat, gain(rev(whoosh(0.25, 1500, 7000, q=1.5)), -14))


@T('bell', SMALL, 0.6, 'a synthesized counter bell ding', fade=0.15)
def _():
    return bell(0.6, 2350, d=0.3)


@T('boing', BIG, 0.42, 'a synthesized spring boing')
def _():
    return mix(boing(0.4, 280, 170), gain(boing(0.4, 560, 300), -10))


@T('pizzagods', BIG, 0.9, 'a synthesized heavenly choir chord and chimes', fade=0.25)
def _():
    ch = mix(*[gain(shape(voice(0.8, f, [800, 1150, 2900], vib=(5, 4)), [(0, 0), (0.15, 1), (0.7, 0.7), (1, 0)]), -3 - k) for k, f in enumerate([523, 659, 784])])
    return mix(svf(ch, 4000, 0.7), gain(chord([2093, 2637, 3136, 4186], d=0.15, gap=0.06, dur=0.6), -8), gain(K('imp/impactBell_heavy_000', 0, 0.6, rate=1.3), -12))


# ════════════════════════════ hero and god tails ════════════════════════════
def H(id_, syn, dur=0.55, level=HERO, fade=0.08):
    return S(f'sfx_smack_hero_{id_}', level, dur, syn=syn, fade=fade)


def heatvision():
    return mix(shape(svf(mix(tone(0.32, 220, 'saw'), gain(noise(0.32, 'white', seed=2), -10)), 2600, 1.2, 'bp'), [(0, 0), (0.1, 1), (0.7, 0.8), (1, 0)]), gain(am(tone(0.32, 880, 'sin'), 40, 0.6), -14))


def batwings():
    return mix(flutter(0.32, 16, 800, seed=3), gain(thump(0.12, 120, 60, 0.04), -6))


def lasso():
    whip = env(svf(noise(0.06, 'white', seed=4), sweep(1500, 6000, 0.06), 1.5, 'bp'), a=0.002, d=0.02, r=0.01)
    return mix(gain(whoosh(0.18, 600, 2200, q=1.4), -4), at(whip, 0.16), at(gain(bell(0.3, 2400, d=0.1), -8), 0.18))


def speedzip():
    return mix(laser(400, 4000, 0.14, 'saw'), at(gain(crackle(0.25, 900, 4000, seed=5), -4), 0.05), gain(whoosh(0.25, 2000, 7000, q=1.2), -8))


def sonar():
    p = env(tone(0.4, 1200, 'sin'), a=0.003, d=0.12, r=0.05)
    return mix(gain(splash(0.22, seed=6), -4), at(dsp.fx(gain(p, -2), 'aecho=0.7:0.6:90:0.4'), 0.05))


def construct():
    c = mix(*[gain(env(tone(0.4, sweep(f, f * 1.5, 0.3), 'sq'), a=0.04, r=0.1), -8) for f in (330, 495)])
    return mix(svf(c, 2200, 0.8), gain(bell(0.4, 1980, d=0.1), -10))


def thwip():
    return mix(whoosh(0.12, 1500, 6500, q=2.0, pts=((0, 0), (0.2, 1), (1, 0))), at(gain(pluck(880, 0.25, 0.8, seed=7), -6), 0.08))


def repulsor():
    return mix(laser(600, 2400, 0.22, 'sin', q=0.7), at(gain(thump(0.15, 160, 70, 0.04), -4), 0.18), at(gain(svf(noise(0.15, 'pink', seed=8), 1200, 0.8), -10), 0.18))


def vibranium():
    return mix(gain(bell(0.55, 880, d=0.22), 0), gain(bell(0.5, 1320, d=0.15), -6), K('imp/impactPlate_light_002', rate=1.2, db=-10))


def growl(f=90, dur=0.35, seed=9):
    g = drive(voice(dur, glide([(0, f), (dur * 0.3, f * 1.3), (dur, f * 0.85)]), [500, 1000, 2400]), 3)
    return shape(jitter_am(g, 40, 0.6, seed=seed), [(0, 0), (0.1, 1), (0.7, 0.8), (1, 0)])


def widowbite():
    return mix(gain(zapz(0.2, 3400, seed=11), 0), K('dgt/zap1', 0, 0.15, rate=1.4, db=-6))


def twang(f=110, seed=12):
    return mix(gain(pluck(f, 0.45, 0.6, seed=seed), 0), at(gain(whoosh(0.16, 1500, 5000, q=1.4), -8), 0.04))


def snikt():
    return mix(K('rpg/drawKnife1', rate=1.3, db=-2), at(gain(bell(0.25, 3200, d=0.05), -10), 0.04))


def wind(dur=0.45, f=900, seed=13):
    return shape(svf(noise(dur, 'pink', seed=seed), sweep(f * 0.6, f * 1.6, dur), 1.0, 'bp'), [(0, 0), (0.3, 1), (1, 0)])


def optic():
    return shape(svf(mix(tone(0.3, 300, 'saw'), tone(0.3, 303, 'saw')), sweep(4000, 1500, 0.3), 0.9), [(0, 0), (0.05, 1), (0.8, 0.6), (1, 0)])


def kinetic():
    k = env(tone(0.4, sweep(900, 200, 0.35), 'sin', harm=[(1, 1), (1.5, 0.4), (2, 0.3)]), a=0.003, d=0.15, r=0.05)
    return mix(k, gain(chord([1760, 2349], d=0.1, gap=0.05, dur=0.35), -10))


def clock(n_=3, gap=0.08, rate=1.0):
    return mix(*[at(K('ui/tick_001' if k % 2 == 0 else 'ui/tick_002', rate=rate, db=-2), k * gap) for k in range(n_)])


def revbell(f, dur=0.4):
    return rev(bell(dur, f, d=dur / 3))


def portal():
    """Endgame: a ring of portals: a rising whoosh and a golden sparkle."""
    return mix(gain(whoosh(0.4, 400, 3500, q=1.6, pts=((0, 0), (0.7, 1), (1, 0))), -6), at(gain(chord([1568, 2093, 2637], d=0.1, gap=0.04, dur=0.35), -8), 0.2))


def choir(notes, dur=0.5, vowels=(800, 1150, 2900)):
    return svf(mix(*[gain(shape(voice(dur, f, list(vowels), vib=(5, 4)), [(0, 0), (0.15, 1), (0.7, 0.7), (1, 0)]), -3 - k) for k, f in enumerate(notes)]), 4000, 0.7)


def gong(f=110, dur=0.6):
    return mix(bell(dur, f, partials=((1, 1, 1.0), (1.48, 0.6, 0.7), (2.05, 0.5, 0.5), (2.9, 0.3, 0.35), (4.1, 0.2, 0.2)), d=dur / 2), gain(thump(0.15, 90, 50, 0.05), -6))


def harp(notes, gap=0.045, dur=0.6, seed=14):
    return mix(*[at(gain(pluck(f, dur - k * gap, 0.7, seed=seed + k), -k * 0.8), k * gap) for k, f in enumerate(notes)])


def buzz(dur=0.3, f=220):
    return shape(svf(am(tone(dur, f, 'saw', vib=(9, 8)), 26, 0.5), 1800, 1.6, 'bp'), [(0, 0), (0.1, 1), (0.8, 0.8), (1, 0)])


def clack(r1=1.6, r2=1.8, gap=0.07):
    return mix(K('imp/impactWood_light_001', rate=r1), at(K('imp/impactWood_light_002', rate=r2, db=-2), gap))


def chains(seed=15):
    return mix(*[at(K(f'imp/impactMetal_light_00{k}', rate=1.6 + k * 0.1, db=-4 - k * 2), k * 0.05) for k in range(3)])


def whooshfire(dur=0.4, seed=16):
    return mix(shape(K('sci/thrusterFire_002', 0, dur, rate=1.0), [(0, 0), (0.15, 1), (1, 0)]), gain(svf(grains(dur, 300, seed=seed, dec=0.0012), 2400, 0.8), -8))


def shout(dur, f0, f1, vowels, rasp=0.5, seed=3):
    f = glide([(0, f0), (dur * 0.15, f0 * 1.25), (dur * 0.7, f1 * 1.1), (dur, f1)])
    v = drive(voice(dur, f, vowels, vib=(5.5, 5)), 2.2)
    breath = svf(noise(dur, 'pink', seed=seed), 1800, 0.8, 'bp')
    body = mix(v, gain(jitter_am(breath, 30, rasp, seed=seed), -8))
    return shape(svf(body, 4200, 0.7), [(0, 0), (0.06, 1), (0.75, 0.9), (1, 0)])


def kazoo(notes, step):
    return mix(*[at(shape(formant(tone(L, f, 'saw', vib=(6, 8)), [900, 2200], q=6), [(0, 0), (0.1, 1), (0.8, 0.9), (1, 0)]), k * step) for k, (f, L) in enumerate(notes)])


def chirps(count=4, f=3200, gap=0.05, seed=17):
    r = random.Random(seed)
    return mix(*[at(gain(env(tone(0.04, sweep(f * r.uniform(0.9, 1.1), f * 1.4, 0.04), 'saw'), a=0.002, r=0.01), -r.uniform(0, 4)), k * gap) for k in range(count)])


def cashreg():
    return mix(gain(bell(0.45, 2637, d=0.2), -2), at(gain(bell(0.4, 3136, d=0.2), -5), 0.05), K('rpg/handleCoins', 0, 0.2, rate=1.1, db=-8), K('ui/switch_004', db=-10))


def whip():
    return mix(gain(whoosh(0.12, 800, 3000, q=1.4), -6), at(env(svf(noise(0.05, 'white', seed=18), 3500, 1.2, 'bp'), a=0.001, d=0.012, r=0.01), 0.11))


def meow():
    return shape(voice(0.3, glide([(0, 520), (0.1, 700), (0.3, 480)]), [900, 1800], vib=(6, 10)), [(0, 0), (0.1, 1), (0.7, 0.8), (1, 0)])


def warble(dur=0.4, f=500):
    return env(tone(dur, f, 'sin', vib=(12, 120)), a=0.01, d=dur / 2, r=0.05)


def stretch(f0=180, f1=520, dur=0.32):
    return env(tone(dur, glide([(0, f0), (dur * 0.7, f1), (dur, f1 * 0.7)]), 'saw', vib=(18, 20)), a=0.01, r=0.08)


def chitter(seed=19):
    return shape(svf(grains(0.25, 1200, seed=seed, dec=0.0006), 4200, 2.0, 'bp'), [(0, 0), (0.1, 1), (1, 0)])


def gurgle(seed=20):
    return mix(bubbles(0.4, 9, 120, 420, seed=seed), gain(jitter_am(svf(noise(0.4, 'brown', seed=seed), 300, 1.2, 'bp'), 25, 0.7, seed=seed), -6))


def gavel():
    return mix(K('imp/impactWood_heavy_000', rate=1.2), at(K('imp/impactWood_heavy_001', rate=1.25, db=-3), 0.12))


def card():
    return mix(K('cas/card-place-2', rate=1.2), at(gain(crackle(0.25, 500, 3500, seed=21), -6), 0.05), at(gain(laser(800, 1800, 0.2, 'sin'), -10), 0.05))


def musicbox(notes, gap=0.11):
    return mix(*[at(gain(bell(0.35, f, partials=((1, 1, 1.0), (3, 0.3, 0.4), (5, 0.1, 0.2)), d=0.12), -k * 0.5), k * gap) for k, f in enumerate(notes)])


def raven():
    return shape(drive(voice(0.22, glide([(0, 700), (0.06, 820), (0.22, 600)]), [1100, 2300], vib=(30, 25)), 2.5), [(0, 0), (0.08, 1), (0.7, 0.6), (1, 0)])


def boar():
    return shape(drive(voice(0.25, glide([(0, 150), (0.25, 90)]), [400, 900]), 3), [(0, 0), (0.1, 1), (1, 0)])


def hoot():
    h_ = mix(env(tone(0.16, glide([(0, 420), (0.16, 380)]), 'sin'), a=0.02, r=0.05), at(env(tone(0.22, glide([(0, 400), (0.22, 340)]), 'sin'), a=0.02, r=0.06), 0.2))
    return h_


def glug(seed=22):
    return mix(*[at(gain(env(tone(0.06, sweep(240 + 40 * k, 420, 0.06)), a=0.002, d=0.02, r=0.01), -k), k * 0.07) for k in range(3)])


def rustle(seed=23):
    return shape(svf(grains(0.35, 1500, seed=seed, dec=0.0008), 2500, 0.9, 'bp'), [(0, 0), (0.2, 1), (1, 0)])


def drum(f=80):
    return mix(gain(thump(0.25, f * 1.8, f, 0.07), 0), gain(svf(noise(0.08, 'white', seed=24), 2000, 0.8), -12))


def hiss(dur=0.3, seed=25):
    return shape(svf(noise(dur, 'white', seed=seed), 5500, 1.0, 'hp'), [(0, 0), (0.2, 1), (1, 0)])


def snapfinger():
    return mix(snap_fx(26), at(dsp.fx(gain(chord([1568, 2349], d=0.15, gap=0.0, dur=0.5), -10), 'aecho=0.8:0.6:120:0.4'), 0.02))


# heroes
H('superpeel', 'a synthesized heat-vision sizzle and cape swish')(lambda: mix(heatvision(), gain(whoosh(0.22, 400, 1600, q=1.1), -10)))
H('batpeel', 'a synthesized bat-wing flutter')(batwings)
H('wonderwedge', 'a synthesized lasso swing and bracer ping')(lasso)
H('flashfoot', 'a synthesized lightning zip and crackle')(speedzip)
H('aquatoe', 'a synthesized splash and sonar ping')(sonar)
H('greenlampshade', 'a synthesized glowing construct chord')(construct)
H('spiderpan', 'a synthesized web thwip')(thwip)
H('ironpan', 'a synthesized repulsor whine and blast')(repulsor)
H('captainpizzeria', 'a synthesized shield ring')(vibranium)
H('incrediblebulk', 'a synthesized growl')(lambda: mix(growl(80, 0.4), gain(thump(0.2, 90, 45, 0.06), -6)))
H('blackwindow', 'a synthesized electric sting')(widowbite)
H('hawkeyetalian', 'a synthesized bowstring twang')(lambda: twang(98))
H('wolverpeel', 'a synthesized claw ring')(snikt)
H('stormyweather', 'a synthesized gust and distant thunder', dur=0.7)(lambda: mix(gain(wind(0.5, 800), -2), at(gain(thunder(0.6, seed=27, f=120), -6), 0.08)))
H('cyclopizza', 'a synthesized optic blast')(optic)
H('blackpanther', 'a synthesized kinetic pulse')(kinetic)
H('strangeloaf', 'a synthesized clock tick and mystic chime')(lambda: mix(clock(3, 0.07, 1.2), at(gain(chord([1319, 1760, 2637], d=0.12, gap=0.05, dur=0.4), -6), 0.1)))
H('scarletpitch', 'a synthesized reversed hex swell')(lambda: mix(gain(revbell(740, 0.35), 0), gain(revbell(784, 0.35), -3), at(gain(bell(0.2, 1480, d=0.05), -8), 0.33)))
H('antpan', 'a synthesized shrinking zip')(lambda: mix(laser(800, 3200, 0.2, 'sin', q=0.8), gain(whoosh(0.2, 3000, 9000, q=1.6), -8)))
H('daredough', 'a synthesized radar ping')(lambda: dsp.fx(env(tone(0.45, 1500, 'sin'), a=0.003, d=0.08, r=0.04), 'aecho=0.8:0.7:110:0.45'))
H('deadpeel', 'a synthesized cork pop and kazoo')(lambda: mix(gain(env(svf(noise(0.05, 'white', seed=28), 1500, 0.8, 'hp'), a=0.0005, d=0.01, r=0.01), 0), at(gain(kazoo([(392, 0.1), (330, 0.22)], 0.1), -4), 0.06)))
H('silverslicer', 'a synthesized cosmic surf shimmer')(lambda: mix(gain(whoosh(0.4, 1000, 5000, q=1.3), -2), gain(env(tone(0.4, 1600, 'sin', vib=(8, 60)), a=0.02, r=0.1), -12)))
H('iamcrust', 'a synthesized finger snap and echoing chime')(snapfinger)
H('rocketrucola', 'a synthesized blaster double shot')(lambda: mix(laser(1400, 220, 0.12, 'sq'), at(laser(1300, 200, 0.14, 'sq'), 0.11)))
H('starlard', 'a synthesized tape click and bass pluck')(lambda: mix(K('ui/switch_003', rate=1.1), at(gain(env(tone(0.3, glide([(0, 82), (0.06, 110), (0.3, 110)]), 'saw'), a=0.003, d=0.12, r=0.04), -4), 0.04)))
H('captainmarvellous', 'a synthesized photon blast and sparkle')(lambda: mix(gain(laser(300, 1600, 0.25, 'saw'), -2), at(gain(chord([2093, 2637, 3136], d=0.08, gap=0.04, dur=0.3), -8), 0.15)))
H('shazamozza', 'a synthesized lightning strike and brass stab', dur=0.6)(lambda: mix(gain(crack(29), -2), at(gain(svf(horn([(233, 0.25)], 0.1), 3000, 0.7), -4), 0.04)))
H('cypork', 'a synthesized boom-tube warp')(lambda: mix(gain(thump(0.25, 140, 40, 0.08), 0), gain(rev(whoosh(0.3, 500, 4000, q=1.4)), -6)))
H('robinpizza', 'a synthesized double stick clack')(clack)
H('cattoewoman', 'a synthesized whip crack and meow')(lambda: mix(whip(), at(gain(meow(), -6), 0.14)))
H('martianmozzarella', 'a synthesized shape-shift warble')(lambda: warble(0.4, 460))
H('greenpepperarrow', 'a synthesized twang and boxing-glove boing')(lambda: mix(gain(twang(147, 30), -2), at(gain(boing(0.3, 220, 120), -4), 0.12)))
H('plasticpan', 'a synthesized rubber-band stretch')(stretch)
H('hawkcrust', 'a synthesized hawk screech')(lambda: mix(screech(0.32, 2200, 1500, seed=31), gain(flutter(0.25, 12, 700, seed=31), -8)))
H('bluebeetroot', 'a synthesized scarab chitter and blip')(lambda: mix(chitter(32), at(gain(env(tone(0.08, 1320, 'sq'), a=0.002, r=0.02), -10), 0.15)))
H('boostergouda', 'a synthesized cash-register ka-ching')(cashreg)
H('staticcling', 'a synthesized static crackle')(lambda: mix(crackle(0.35, 1400, 2500, seed=33, dec=0.0005), gain(zapz(0.15, 3000, seed=33), -6)))
H('zatannapanna', 'a synthesized backwards chime')(lambda: mix(revbell(1568, 0.4), gain(revbell(2093, 0.35), -4)))
H('swampthincrust', 'a synthesized bog gurgle')(lambda: gurgle(34))
H('nightwings', 'a synthesized electric stick clack')(lambda: mix(clack(1.5, 1.7, 0.08), gain(zapz(0.15, 3600, seed=35), -8)))
H('ghostroaster', 'a synthesized chain rattle and hellfire whoosh')(lambda: mix(chains(36), at(gain(whooshfire(0.4), -4), 0.05)))
H('moonknife', 'a synthesized crescent blade swish')(lambda: mix(gain(whoosh(0.18, 2000, 7000, q=1.8), -2), at(gain(bell(0.3, 2600, d=0.08), -8), 0.12)))
H('shebulk', 'a synthesized gavel double bang')(gavel)
H('wasabiwasp', 'a synthesized wasp buzz and sting')(lambda: mix(drive(buzz(0.3, 240), 2.0), at(gain(zapz(0.08, 4200, seed=37), -14), 0.22)))
H('gambeet', 'a synthesized charged card flick')(card)
H('icecreamman', 'a synthesized ice crack and van chime', dur=0.6)(lambda: mix(gain(crackle(0.2, 900, 3000, seed=38), -2), at(musicbox([1319, 1568, 1760]), 0.08)))
H('humanscorch', 'a synthesized flame whoosh')(lambda: whooshfire(0.45, 39))
H('mrelasticcheese', 'a synthesized stretchy boing')(lambda: mix(boing(0.4, 200, 140, rate=14, wave='tri'), gain(stretch(150, 380, 0.25), -8)))
H('squirrelgourmet', 'a synthesized squirrel chitter and nut crack')(lambda: mix(chirps(5, 3400, 0.045, 40), at(K('imp/impactWood_light_004', rate=1.8, db=-4), 0.22)))
# gods
H('zeus', 'a synthesized thunderbolt crack', dur=0.6)(lambda: mix(gain(crack(41), 0), gain(zapz(0.3, 3000, seed=41), -6), at(gain(rumble(0.5, 140, 41), -6), 0.05)))
H('kratos', 'a synthesized blade swing and chain clank')(lambda: mix(gain(whoosh(0.2, 600, 2600, q=1.3), -4), at(chains(42), 0.12), at(gain(whooshfire(0.3, 42), -10), 0.1)))
H('hera', 'a synthesized regal horn call')(lambda: gain(svf(horn([(523, 0.14), (784, 0.3)], 0.13), 3500, 0.7), -2))
H('poseidon', 'a synthesized wave crash and trident ring')(lambda: mix(splash(0.45, seed=43), at(gain(bell(0.4, 1175, d=0.15), -8), 0.05)))
H('demeter', 'a synthesized wheat rustle and harvest chime')(lambda: mix(rustle(44), at(gain(chord([784, 988, 1175], d=0.15, gap=0.05, dur=0.4), -8), 0.08)))
H('athena', 'a synthesized owl hoot and shield ring')(lambda: mix(gain(bell(0.4, 660, d=0.15), -4), at(gain(hoot(), -2), 0.08)))
H('apollo', 'a synthesized lyre strum')(lambda: harp([523, 659, 784, 1047], 0.04, 0.55, 45))
H('artemis', 'a synthesized bowstring and silver moon chime')(lambda: mix(gain(twang(165, 46), -2), at(gain(bell(0.4, 2349, d=0.15), -8), 0.1)))
H('ares', 'a synthesized war drum and clash')(lambda: mix(drum(70), at(K('imp/impactMetal_medium_003', rate=1.2, db=-6), 0.1)))
H('aphrodite', 'a synthesized harp glissando')(lambda: harp([1047, 1175, 1319, 1568, 1760, 2093], 0.03, 0.5, 47))
H('hephaestus', 'a synthesized anvil ring')(lambda: mix(K('imp/impactMetal_heavy_002', rate=1.3, db=-4), gain(bell(0.5, 1210, partials=((1, 1, 1.0), (2.4, 0.6, 0.6), (3.9, 0.4, 0.4), (5.6, 0.2, 0.2)), d=0.2), -2)))
H('hermes', 'a synthesized winged-sandal flutter')(lambda: mix(flutter(0.3, 26, 1400, seed=48), gain(whoosh(0.25, 1500, 5000, q=1.4), -6)))
H('dionysus', 'a synthesized wine-glass clink and glug')(lambda: mix(gain(bell(0.4, 2780, d=0.12), -2), at(gain(glug(49), -4), 0.1)))
H('hestia', 'a synthesized hearth crackle and warm bell')(lambda: mix(gain(svf(grains(0.4, 260, seed=50, dec=0.0015), 2500, 0.8), -2), gain(bell(0.45, 440, d=0.18), -6)))
H('hades', 'a synthesized underworld boom and chains')(lambda: mix(gain(thump(0.3, 80, 35, 0.12), 0), gain(rumble(0.4, 120, 51), -4), at(gain(chains(51), -6), 0.1)))
H('persephone', 'a synthesized blossoming chime')(lambda: chord([784, 988, 1175, 1568], d=0.12, gap=0.06, dur=0.45, db=-2))
H('nike', 'a synthesized victory fanfare and wing swish')(lambda: mix(gain(svf(horn([(784, 0.1), (1175, 0.25)], 0.09, vowels=(800, 1400, 2800)), 4000, 0.7), -2), gain(whoosh(0.3, 1200, 4000, q=1.3), -10)))
H('nyx', 'a synthesized night swell and star twinkles')(lambda: mix(gain(env(tone(0.45, 220, 'sin', harm=[(1, 1), (2, 0.3)]), a=0.1, r=0.15), -4), at(gain(chord([2637, 3520, 3136], d=0.05, gap=0.06, dur=0.3), -8), 0.12)))
H('odin', 'a synthesized raven caw and rune gong')(lambda: mix(gain(gong(130, 0.55), -2), at(gain(raven(), -4), 0.05)))
H('thor', 'a synthesized hammer thunder crack', dur=0.7, level=BIG)(lambda: mix(thunder(0.68, seed=52, f=150), K('imp/impactMetal_heavy_000', rate=0.9, db=-8)))
H('loki', 'a synthesized mischievous warble and hiss')(lambda: mix(env(tone(0.35, glide([(0, 600), (0.1, 900), (0.2, 500), (0.35, 1100)]), 'tri'), a=0.01, r=0.05), at(gain(hiss(0.2, 53), -10), 0.2)))
H('frigg', 'a synthesized spinning-wheel whirr and bell')(lambda: mix(gain(am(svf(noise(0.35, 'pink', seed=54), 700, 1.5, 'bp'), 14, 0.7), -2), gain(bell(0.4, 1568, d=0.12), -8)))
H('freya', 'a synthesized falcon cry')(lambda: mix(screech(0.3, 2600, 1900, seed=55), gain(flutter(0.3, 10, 600, seed=55), -8)))
H('freyr', 'a synthesized golden boar grunt and coin')(lambda: mix(boar(), at(gain(bell(0.35, 2093, d=0.12), -8), 0.12)))
H('tyr', 'a synthesized oath gong')(lambda: gong(98, 0.55))
H('heimdall', 'a synthesized horn blast', dur=0.6)(lambda: gain(svf(horn([(147, 0.45)], 0.1, vowels=(500, 900, 2200)), 2500, 0.7), 0))
H('baldur', 'a synthesized radiant chord')(lambda: mix(chord([1047, 1319, 1568, 2093], d=0.2, gap=0.02, dur=0.5), gain(whoosh(0.4, 4000, 9000, q=1.5), -12)))
H('hel', 'a synthesized eerie half-whisper')(lambda: mix(gain(rev(shape(svf(noise(0.35, 'pink', seed=56), 2000, 3.0, 'bp'), [(0, 1), (1, 0)])), -2), gain(env(tone(0.35, 330, 'sin', vib=(4, 10)), a=0.05, r=0.1), -10)))
H('njord', 'a synthesized sea wind and wave')(lambda: mix(wind(0.45, 700, 57), at(gain(splash(0.3, seed=57), -6), 0.1)))
H('skadi', 'a synthesized ski swish and ice crack')(lambda: mix(gain(whoosh(0.22, 2500, 6000, q=1.2), -2), at(gain(crackle(0.2, 900, 3200, seed=58), -2), 0.15)))
H('idun', 'a synthesized apple crunch and chime')(lambda: mix(gain(svf(grains(0.15, 1600, seed=59, dec=0.0007), 2000, 0.9, 'hp'), 0), at(gain(bell(0.4, 1760, d=0.15), -8), 0.1)))
H('bragi', 'a synthesized harp run')(lambda: harp([392, 494, 587, 784, 988], 0.05, 0.6, 60))
# Sparta and the nemesis
H('leonidas', 'a synthesized shout of "HA!" over a spear clang')(lambda: mix(K('imp/impactMetal_medium_001', rate=1.1, db=-4), at(gain(shout(0.22, 170, 150, [700, 1150, 2500], seed=61), -2), 0.03)))
H('hotgates', 'a synthesized war shout and fire whoosh')(lambda: mix(gain(shout(0.25, 160, 140, [700, 1150, 2500], seed=62), -2), at(gain(whooshfire(0.35, 62), -6), 0.08)))
H('darkkneader', 'a synthesized dark flutter and bell toll')(lambda: mix(gain(flutter(0.3, 14, 600, seed=63), -2), gain(bell(0.5, 311, d=0.2), -6)))

# variants: each its base hero's tail with its own twist on top
BASE_TAIL = {r['key'][len('sfx_smack_hero_'):]: r['fn'] for r in REG if r['key'].startswith('sfx_smack_hero_')}
for hid in ['captainmarvellous', 'starlard', 'incrediblebulk', 'blackwindow', 'hawkeyetalian', 'blackpanther', 'strangeloaf', 'scarletpitch', 'antpan', 'wasabiwasp', 'rocketrucola', 'iamcrust']:
    H(f'{hid}endgame', 'its hero\'s tail and a synthesized portal ring', dur=0.65)(lambda hid=hid: mix(BASE_TAIL[hid](), at(portal(), 0.12)))
H('ghostofsparta', 'a synthesized ghostly echo of the Kratos blade', dur=0.7)(lambda: dsp.fx(BASE_TAIL['kratos'](), 'aecho=0.7:0.6:90:0.4'))
H('superpeelprime', 'a synthesized heat-vision sizzle and choir', dur=0.65)(lambda: mix(heatvision(), at(gain(choir([392, 494, 587], 0.45), -8), 0.08)))
H('ironpaninfinity', 'a synthesized repulsor and infinity chime', dur=0.65)(lambda: mix(repulsor(), at(gain(chord([1568, 1976, 2349, 3136], d=0.1, gap=0.04, dur=0.4), -8), 0.18)))
H('thorunleashed', 'a synthesized bigger thunder crack', dur=0.9, level=BIG)(lambda: mix(thunder(0.88, seed=64, f=120), gain(zapz(0.35, 2800, seed=64), -8), K('imp/impactMetal_heavy_003', rate=0.85, db=-8)))
H('odinascended', 'a synthesized rune gong and choir', dur=0.7)(lambda: mix(gain(gong(110, 0.6), -2), at(gain(choir([220, 277, 330], 0.5, vowels=(600, 1000, 2600)), -8), 0.08)))
H('zeusunbound', 'a synthesized thunderbolt and long rumble', dur=0.8)(lambda: mix(gain(crack(65), 0), gain(zapz(0.4, 2600, seed=65), -5), at(gain(rumble(0.7, 110, 65), -4), 0.04)))
H('shieldofliberty', 'a synthesized shield ring and eagle cry')(lambda: mix(vibranium(), at(gain(screech(0.25, 2400, 1700, seed=66), -8), 0.1)))
H('symbiotepan', 'a synthesized thwip and slimy gurgle')(lambda: mix(thwip(), at(gain(gurgle(67), -6), 0.05)))
H('amazonqueen', 'a synthesized lasso and horn call', dur=0.65)(lambda: mix(lasso(), at(gain(svf(horn([(392, 0.12), (587, 0.25)], 0.11), 3500, 0.7), -6), 0.15)))


# ════════════════════════════ build ════════════════════════════
def build(r, outdir):
    """render.build, levelled exactly to the target (tails sit under -12 without a TRIM entry)."""
    dsp.USED.clear()
    x = r['fn']()
    x = render.finalise(x, r['dur'], r['fade'])
    goal = r['level']
    x = dsp.gain(x, goal - render.rms50(x))
    LIM = 0.84
    for _ in range(4):
        if max(abs(v) for v in x) > LIM:
            x = dsp.fx(x, 'alimiter=limit=%.2f:attack=2:release=60:level=false:latency=1' % LIM)
        short = goal - render.rms50(x)
        if short < 0.3:
            break
        x = dsp.gain(x, short)
    for _ in range(2):
        if goal - render.rms50(x) <= 1.0:
            break
        # still short (a spiky transient): gently saturate it, as render.build does
        k = 10 ** (min(goal - render.rms50(x), 6) / 20)
        m = max(abs(v) for v in x)
        x = [math.tanh(v / m * k) for v in x]
        x = dsp.gain(x, goal - render.rms50(x))
        m = max(abs(v) for v in x)
        if m > LIM:
            x = [v * LIM / m for v in x]
    m = max(abs(v) for v in x)
    if m > LIM:
        x = [v * LIM / m for v in x]
    x = dsp.env(x, a=0.0008, r=min(r['fade'], len(x) / SR / 3))
    s0 = next((i for i, v in enumerate(x) if abs(v) > 0.02), 0)
    x = x[max(0, s0 - 40):]
    path = os.path.join(outdir, r['key'] + '.mp3')
    for _ in range(8):
        render.encode(x, path)
        y = dsp.decode(path)
        over = render.peakdb(y) + 0.8
        if over <= 0:
            break
        x = dsp.gain(x, -over - 0.3)
    for _ in range(3):
        # the fade or the encoder took some level: make it up where the peak has room
        short = goal - render.rms50(y)
        room = -1.5 - render.peakdb(y)
        if short < 0.2 or room < 0.2:
            break
        x = dsp.gain(x, min(short, room))
        render.encode(x, path)
        y = dsp.decode(path)
    used = []
    for u in dsp.USED:
        if u not in used:
            used.append(u)
    meas = render.rms50(y)
    # what's left over (MP3 and the limiter take a little): a TRIM entry in src/systems/smackTrim.ts
    trim = round(10 ** ((goal - meas) / 20), 2)
    return dict(key=r['key'], measured=round(meas, 1), target=goal, trim=trim, peak=round(render.peakdb(y), 1), dur=round(len(y) / SR, 3), used=used, syn=r['syn'])


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
            print(f"{d['key']:36s} dur={d['dur']:.2f} meas={d['measured']:6.1f} tgt={d['target']:6.1f} trim={d['trim']:.2f} peak={d['peak']:5.1f}")
    print(len(REG), 'recipes')
