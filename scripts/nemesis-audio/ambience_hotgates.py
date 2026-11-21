"""Synthesize the Hot Gates ambience bed (CC0, made for Feetza): Leonidas's nemesis location, a narrow coastal pass.
Pure Python + ffmpeg, built on the Goth-Ham bed's kit (../gotham-audio/ambience.py: noise, filters, the 50 s loop
with an equal-power crossfaded tail, levelled to -16.6 LUFS on the MP3, 96 kbps stereo).

usage: python3 -I ambience_hotgates.py OUTDIR
Wind moaning through the cliffs in slow gusts, surf breaking on the rocks below (a wash every 6-9 s with its
backwash), distant war drums from the army beyond the pass in two long passages, and twice in the loop a far-off horn."""
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gotham-audio'))
from ambience import LOOP, N, SR, XF, add, env_shape, noise, onepole_hp, render, smooth_curve, svf  # noqa: E402


def wave(seed, dur):
    """one breaker: a swell of low noise that crests into a bright wash, then a hissing backwash."""
    r = random.Random(seed)
    n = int(dur * SR)
    body = svf(noise(seed, 'pink', n), 500, 0.7, 'lp')
    wash = onepole_hp(svf(noise(seed + 1, 'white', n), 3000, 0.6), 600)
    crest = r.uniform(0.3, 0.45)
    out = [0.0] * n
    for i in range(n):
        u = i / n
        g1 = math.exp(-((u - crest) / 0.18) ** 2)
        g2 = math.exp(-((u - crest - 0.12) / 0.1) ** 2) + 0.35 * math.exp(-((u - 0.75) / 0.2) ** 2)
        out[i] = body[i] * g1 * 1.2 + wash[i] * g2 * 0.6
    return out


def drum(seed, f0=62):
    """a big war drum hit, far away: a low decaying sine with a soft skin noise, low-passed."""
    r = random.Random(seed)
    L = int(0.6 * SR)
    ph = 0.0
    out = [0.0] * L
    for j in range(L):
        t = j / SR
        ph += f0 * (1 + 0.6 * math.exp(-t / 0.03)) / SR
        out[j] = math.sin(2 * math.pi * ph) * math.exp(-t / 0.18) + r.uniform(-1, 1) * 0.15 * math.exp(-t / 0.02)
    return svf(out, 300, 0.7, 'lp')


def farHorn(dur, f=150):
    """a far-off horn call: a swelling saw through a brassy band, smeared by echoes off the cliffs."""
    n = int(dur * SR)
    ph = 0.0
    x = [0.0] * n
    for i in range(n):
        t = i / SR
        ph += f * (1 + 0.004 * math.sin(2 * math.pi * 5 * t)) / SR
        p = ph % 1
        x[i] = (2 * p - 1) * math.sin(math.pi * i / n) ** 1.5
    x = svf(svf(x, 700, 1.4), 1100, 0.7, 'lp')
    out = list(x)
    for dl, g in ((0.18, 0.45), (0.37, 0.3), (0.62, 0.18)):
        d = int(dl * SR)
        for i in range(d, n):
            out[i] += x[i - d] * g
    return out


def hotgates(ch):
    s = 900 + ch * 37
    r = random.Random(s)
    out = [0.0] * N
    # wind through the cliffs: a moaning band that rises with the gusts
    gust = smooth_curve(s + 1, 0.18, 0.3, 0.85)
    wfc = [260 + 520 * g for g in gust]
    wind = svf(noise(s + 2), wfc, 3.0)
    add(out, [v * g for v, g in zip(wind, gust)], g=0.9)
    add(out, [v * (0.5 + 0.5 * g) for v, g in zip(onepole_hp(svf(noise(s + 3), 2200, 0.7), 500), gust)], g=0.25)
    # surf on the rocks below: a breaker every 6-9 s, each heard a little more in one ear
    t = r.uniform(0.0, 2.0)
    k = 0
    while t < LOOP + XF - 1:
        d = r.uniform(5.5, 7.5)
        pan = (0.75, 1.0)[ch] if k % 2 else (1.0, 0.7)[ch]
        add(out, wave(s + 100 + k, d), at=t, g=0.55 * pan)
        t += r.uniform(6.0, 9.0)
        k += 1
    # the sea's constant low roar
    add(out, svf(noise(s + 4, 'brown'), 200, 0.7, 'lp'), g=0.35)
    # distant war drums from beyond the pass, two passages in the loop (the same in both ears, a touch of delay)
    for t0, beats, per in ((6.0, 14, 0.62), (30.0, 18, 0.58)):
        for b in range(beats):
            sw = math.sin(math.pi * b / beats)
            add(out, drum(700 + b, 58 if b % 2 else 66), at=t0 + b * per + 0.01 * ch, g=0.22 * sw * (1.0 if b % 4 == 0 else 0.7))
    # twice: a far-off horn across the water
    add(out, farHorn(3.0, 147), at=19.0 + 0.015 * ch, g=(0.16, 0.13)[ch])
    add(out, farHorn(2.6, 131), at=43.0 + 0.015 * ch, g=(0.12, 0.15)[ch])
    return onepole_hp(env_shape(out, 0.01, 0.01), 25)


if __name__ == '__main__':
    od = sys.argv[1]
    os.makedirs(od, exist_ok=True)
    render('ambience_hotgates', hotgates, od)
