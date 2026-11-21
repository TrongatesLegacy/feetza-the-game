"""'The Last Slice': a single slow heartbeat loop (CC0, made for Feetza).  usage: python3 -I heartbeat.py OUT.mp3
64 bpm lub-dub with a low sub thump, over a faint high drone and air. Every layer is built circularly (tails wrap
round to the head; the drone and air are crossfaded into themselves), so the 7.5 s file loops without a seam.
Levelled to the music loudness (-16.5 LUFS) like musicloop.py."""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault('KENNEY', '')
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
sys.path.insert(0, HERE)
from dsp import env, gain, tone, sweep, noise, svf, am, n, SR  # noqa: E402
import musicloop  # noqa: E402

BPM = 64
BEATS = 8
L = n(60 / BPM * BEATS)  # 7.5 s


def circ_add(buf, x, t):
    o = n(t)
    for i, v in enumerate(x):
        buf[(o + i) % L] += v


def circular(make, xf=1.0):
    """a layer exactly L long whose end flows into its start: render L + xf, fold the extra tail over the head."""
    x = make(L / SR + xf)
    X = n(xf)
    out = x[:L]
    for i in range(X):
        u = i / X
        out[i] = out[i] * math.sin(u * math.pi / 2) + x[L + i] * math.cos(u * math.pi / 2)
    return out


def beat(seed):
    r = random.Random(seed)
    lub = env(tone(0.28, sweep(64, 38, 0.18)), a=0.004, d=0.07, r=0.05)
    lub_k = env(svf(noise(0.05, 'brown', seed=seed), 180, 0.7), a=0.002, d=0.012)
    sub = env(tone(0.5, sweep(44, 30, 0.4)), a=0.01, d=0.16, r=0.08)
    dub = env(tone(0.22, sweep(80, 48, 0.14)), a=0.003, d=0.05, r=0.04)
    dub_k = env(svf(noise(0.04, 'brown', seed=seed + 1), 220, 0.7), a=0.002, d=0.01)
    out = [0.0] * n(0.9)
    for x, t, db in ((lub, 0, 0), (lub_k, 0, -6), (sub, 0.01, -4), (dub, 0.27 + r.uniform(-0.004, 0.004), -3.5), (dub_k, 0.27, -9)):
        o = n(t)
        g = 10 ** (db / 20)
        for i, v in enumerate(x):
            out[o + i] += v * g
    return out


def main(out_path):
    left = [0.0] * L
    right = [0.0] * L
    for k in range(BEATS):
        b = beat(100 + k)
        circ_add(left, b, (k + 0.4) * 60 / BPM)  # loop point falls in the hush between beats
        circ_add(right, b, (k + 0.4) * 60 / BPM)
    # faint high drone: two soft sines a fifth apart, slowly beating, in a whole number of cycles per loop
    T = L / SR
    def drone(f, ph):  # a whole number of cycles per loop, so it joins up
        return am(tone(T, round(f * T) / T), 1 / T, 0.5, ph)
    dl = [a + 0.7 * b for a, b in zip(drone(1320, 0.0), drone(1980, 0.3))]
    dr = [a + 0.7 * b for a, b in zip(drone(1320 + 2 / T, 0.5), drone(1980, 0.8))]
    airl = circular(lambda d: svf(noise(d, 'pink', seed=7), 4200, 0.9, 'bp'))
    airr = circular(lambda d: svf(noise(d, 'pink', seed=8), 4200, 0.9, 'bp'))
    lowl = circular(lambda d: svf(noise(d, 'brown', seed=9), 90, 0.7))
    lowr = circular(lambda d: svf(noise(d, 'brown', seed=10), 90, 0.7))
    for ch, d_, a_, lo in ((left, dl, airl, lowl), (right, dr, airr, lowr)):
        for i in range(L):
            ch[i] += 0.012 * d_[i] + 0.05 * a_[i] + 0.06 * lo[i]
    x = [0.0] * (2 * L)
    x[0::2], x[1::2] = left, right
    x3 = musicloop.run_f32(x * 3, 2, 'highpass=f=24', SR)  # filter three copies, keep the middle: no edge transient
    i, pk = musicloop.finish(list(x3[2 * L:4 * L]), 2, out_path, -16.5)
    print(f'wrote {out_path}: {L / SR:.2f}s {i:.1f} LUFS true-peak {pk} dBFS')


if __name__ == '__main__':
    main(sys.argv[1])
