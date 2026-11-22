"""Persian army SFX (src/game/acts/persians.ts): the five new feet (Immortal Sandals, Archer Slippers, Cavalry
Hooves, Chariot Wheel, Satrap's Slipper) and the war band's horn. Every layer is synthesized here, so all of it is
CC0. Built with the boss-sfx kit (../boss-sfx: dsp.py, render.py), so levels are measured the same way.

  KENNEY=/none python3 -I build.py OUTDIR [key-substring ...]
  python3 -I integrate.py OUTDIR <repo>

Levels are the 50 ms RMS peak target after TRIM (the slap is about -10.5): one-off moments near it, repeated hits
under it (-13.5)."""
import json
import multiprocessing as mp
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
from dsp import mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, svf, formant, jitter_am, bell, whoosh, thump  # noqa: E402
from render import S, REG, build  # noqa: E402

START, MID, LOW = -10.5, -12.0, -13.5


def voice(dur, f, vowels, wave='saw', vib=None, q=7):
    return formant(tone(dur, f, wave, vib=vib), vowels, q=q, amps=[1.0, 0.6, 0.35][:len(vowels)])


def horn(dur, f, bright=1800):
    body = mix(tone(dur, f, 'saw', vib=(4, 2)), gain(tone(dur, f * 1.5, 'saw', vib=(4.4, 2)), -8))
    return shape(svf(drive(body, 1.6), sweep(500, bright, dur * 0.3), 1.2), [(0, 0), (0.1, 1), (0.85, 0.85), (1, 0)])


def crack(dur=0.15, seed=1):
    return svf(grains(dur, 900, seed=seed, dec=0.0005), 3000, 0.7, 'hp')


def rumble(dur, fc=220, seed=2):
    return svf(noise(dur, 'brown', seed=seed), fc, 0.8, 'lp')


def knock(f=240, d=0.04, seed=3):
    """a hollow wooden knock."""
    return mix(thump(0.12, f * 1.6, f, d), gain(svf(noise(0.03, 'white', seed=seed), 1800, 2, 'bp'), -6))


def clop(seed):
    """one hoofbeat: a dull thud and a hard click on top."""
    return mix(thump(0.14, 160, 70, 0.05), gain(svf(noise(0.025, 'white', seed=seed), 2600, 2.5, 'bp'), -4))


# ——— Immortal Sandals ———
@S('sfx_immortalreturn', MID, 1.2, syn='a synthesized low drum, a rising shadowy whoosh and a hummed chant')
def _():
    drum = thump(0.6, 110, 48, 0.18)
    rise = whoosh(0.9, 200, 1800, q=1.4, pts=((0, 0), (0.8, 1), (1, 0)))
    hum = shape(mix(*[gain(voice(1.0, f, [400, 800], vib=(4.5, 2)), -6) for f in (98, 147, 196)]), [(0, 0), (0.3, 1), (0.85, 0.7), (1, 0)])
    return mix(drum, at(gain(rise, -4), 0.05), at(gain(hum, -2), 0.15))


@S('sfx_immortalfall', LOW, 0.8, syn='a synthesized fire hiss and a falling low tone')
def _():
    hiss = shape(svf(noise(0.7, 'white', seed=11), 5000, 0.8, 'hp'), [(0, 0), (0.1, 1), (1, 0)])
    fall = env(tone(0.6, sweep(180, 60, 0.6), 'saw'), a=0.005, d=0.25)
    return mix(gain(hiss, -6), svf(fall, 900, 0.7))


# ——— Archer Slippers ———
@S('sfx_bowdraw', LOW, 0.6, syn='a synthesized creaking bow and a tightening string')
def _():
    creak = svf(grains(0.55, 260, seed=21, dec=0.002), glide([(0, 600), (0.55, 1100)]), 3, 'bp')
    string = shape(tone(0.55, sweep(220, 330, 0.55), 'tri'), [(0, 0), (0.6, 0.6), (1, 0)])
    return mix(gain(creak, 0), gain(svf(string, 1200), -14))


@S('sfx_arrowloose', LOW, 0.5, syn='a synthesized bowstring twang and an arrow whoosh')
def _():
    twang = env(svf(tone(0.4, glide([(0, 210), (0.05, 180), (0.4, 176)]), 'saw', vib=(22, 6)), 1600, 2), a=0.001, d=0.09)
    fly = whoosh(0.32, 2400, 800, q=1.6, pts=((0, 0), (0.25, 1), (1, 0)))
    return mix(twang, at(gain(fly, -5), 0.02))


@S('sfx_arrowthunk', MID, 0.35, syn='a synthesized arrow thunk into wood with a quiver')
def _():
    hit = knock(300, 0.035, seed=31)
    quiver = env(svf(tone(0.3, 90, 'saw', vib=(30, 20)), 500), a=0.002, d=0.08)
    return mix(hit, at(gain(quiver, -10), 0.01))


# ——— Cavalry Hooves ———
@S('sfx_gallop', MID, 1.3, syn='synthesized hoofbeats at a gallop')
def _():
    beats = []
    t = 0.0
    for i in range(4):
        for j, dt in enumerate((0.0, 0.07, 0.14)):
            beats.append(at(gain(clop(40 + i * 3 + j), -2 * j), t + dt))
        t += 0.3
    return mix(*beats)


@S('sfx_neigh', MID, 1.0, syn='a synthesized horse whinny')
def _():
    f = glide([(0, 700), (0.1, 1100), (0.5, 900), (0.85, 520)])
    v = drive(voice(0.85, f, [900, 1600, 2800], vib=(16, 60)), 2.0)
    breath = svf(noise(0.85, 'pink', seed=51), 1500, 0.8, 'bp')
    return shape(mix(v, gain(jitter_am(breath, 40, 0.6, seed=52), -10)), [(0, 0), (0.06, 1), (0.6, 0.8), (1, 0)])


# ——— Chariot Wheel ———
@S('sfx_chariotrev', MID, 1.3, syn='a synthesized wooden wheel spinning up with a rattle')
def _():
    r = rumble(1.2, 260, 61)
    rattle = svf(grains(1.2, 220, seed=62, dec=0.003), glide([(0, 500), (1.2, 1400)]), 2, 'bp')
    return shape(mix(gain(r, 2), gain(rattle, -2)), [(0, 0), (0.7, 1), (1, 0.6)])


@S('sfx_chariotroll', MID, 1.8, syn='a synthesized rumbling chariot roll with clacking spokes')
def _():
    r = rumble(1.7, 220, 71)
    clacks = [at(gain(knock(260, 0.02, seed=72 + i), -6), 0.05 + i * 0.12) for i in range(13)]
    return shape(mix(gain(r, 2), *clacks), [(0, 0), (0.08, 1), (0.75, 0.9), (1, 0)])


@S('sfx_chariotchip', LOW, 0.35, syn='a synthesized crunch of a crust chipped by a blade')
def _():
    return mix(crack(0.12, 81), gain(thump(0.2, 200, 90, 0.05), -4), at(gain(svf(grains(0.2, 500, seed=82, dec=0.002), 2200, 1, 'bp'), -6), 0.02))


@S('sfx_hubbreak', START, 0.9, syn='a synthesized splintering wooden wheel and a bronze clang')
def _():
    snap = mix(crack(0.2, 91), gain(knock(180, 0.06, seed=92), 2))
    clang = bell(0.8, 640, d=0.3)
    debris = [at(gain(knock(300 + i * 70, 0.015, seed=93 + i), -10 - i), 0.12 + i * 0.07) for i in range(6)]
    return mix(snap, at(gain(clang, -6), 0.01), *debris)


# ——— Satrap's Slipper and the war band ———
@S('sfx_satrapbuff', LOW, 0.7, syn='a synthesized golden chime')
def _():
    return mix(*[at(gain(bell(0.6, 1320 * (1.26 ** i), d=0.25), -4 - i * 2), i * 0.06) for i in range(3)])


@S('sfx_warhorn', START, 1.6, syn='a synthesized long war horn, two notes')
def _():
    a = horn(0.7, 147, 1600)
    b = horn(0.85, 196, 2000)
    return mix(a, at(b, 0.6), at(gain(thump(0.5, 90, 45, 0.2), -4), 0.0))


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
    idx = [i for i, r in enumerate(REG) if not sel or any(s in r['key'] for s in sel)]
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
