"""Synthesize the Goth-Ham Rooftops ambience bed (CC0, made for Feetza). Pure Python + ffmpeg; modelled on
scripts/act8-sfx/ambience.py.

usage: python3 -I ambience.py OUTDIR
Steady rain on a rooftop (a hiss bed, dense patter and heavier splats), drips from two gutters, wind gusts, two
distant thunder rolls and, once in the loop, a faint far-off siren. The bed is rendered 5 s longer than the 50 s
loop and the extra tail is crossfaded (equal power) into the head, so playback wraps seamlessly; it's loudness-matched
to -16.6 LUFS (measured on the MP3) and saved as 96 kbps stereo MP3 like the other ambience_*.mp3. The level and
limiter run over three copies end to end and the middle one is kept, so their edges never touch the loop point."""
import math
import multiprocessing as mp
import os
import random
import re
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
SR = 32000
LOOP = 50.0
XF = 5.0
N = int((LOOP + XF) * SR)
TARGET = -16.6


def noise(seed, color='pink', n=N):
    r = random.Random(seed)
    if color == 'white':
        return [r.uniform(-1, 1) for _ in range(n)]
    out = [0.0] * n
    if color == 'brown':
        y = 0.0
        for i in range(n):
            y = (y + r.uniform(-1, 1) * 0.05) * 0.996
            out[i] = y * 4
        return out
    b0 = b1 = b2 = 0.0
    for i in range(n):
        w = r.uniform(-1, 1)
        b0 = 0.99765 * b0 + w * 0.0990460
        b1 = 0.96300 * b1 + w * 0.2965164
        b2 = 0.57000 * b2 + w * 1.0526913
        out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25
    return out


def smooth_curve(seed, rate, lo, hi, n=N):
    """slow random curve (cosine-interpolated points every 1/rate s) between lo and hi."""
    r = random.Random(seed)
    step = int(SR / rate)
    pts = [r.uniform(lo, hi) for _ in range(n // step + 3)]
    out = [0.0] * n
    for i in range(n):
        k, u = divmod(i, step)
        g = (1 - math.cos(math.pi * u / step)) / 2
        out[i] = pts[k] * (1 - g) + pts[k + 1] * g
    return out


def svf(x, fc, q, mode='bp'):
    low = band = 0.0
    damp = 1.0 / q
    out = [0.0] * len(x)
    const = not isinstance(fc, list)
    f = 2 * math.sin(math.pi * min(fc, SR / 6.5) / SR) if const else 0.0
    for i, v in enumerate(x):
        if not const:
            f = 2 * math.sin(math.pi * min(fc[i], SR / 6.5) / SR)
        low += f * band
        high = v - low - damp * band
        band += f * high
        out[i] = low if mode == 'lp' else band if mode == 'bp' else high
    return out


def onepole_hp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    y = prev = 0.0
    out = [0.0] * len(x)
    for i, v in enumerate(x):
        y = a * (y + v - prev)
        prev = v
        out[i] = y
    return out


def add(dst, src, at=0.0, g=1.0):
    o = int(at * SR)
    for i, v in enumerate(src):
        if 0 <= o + i < N:
            dst[o + i] += v * g


def env_shape(x, a, r):
    L = len(x)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    return [v * min(1, i / na) * min(1, (L - i) / nr) for i, v in enumerate(x)]


def drip(f0, seed):
    """a water drop off a gutter: a short rising plink with a little splash."""
    r = random.Random(seed)
    L = int(0.12 * SR)
    ph = 0.0
    out = [0.0] * L
    for j in range(L):
        t = j / SR
        ph += f0 * (1 + 1.4 * min(t, 0.05) / 0.05) / SR
        out[j] = math.sin(2 * math.pi * ph) * math.exp(-t / 0.016)
    sp = svf([r.uniform(-1, 1) * math.exp(-j / (0.006 * SR)) for j in range(int(0.05 * SR))], 3500, 0.8, 'hp')
    for j, v in enumerate(sp):
        out[j] += v * 0.25
    return out


def thunder(seed, dur):
    """a distant roll: brown noise, low-passed, with a few slow swells (no crack: it's far off)."""
    r = random.Random(seed)
    n = int(dur * SR)
    x = svf(noise(seed, 'brown', n), 140, 0.7, 'lp')
    x = svf(x, 220, 0.7, 'lp')
    swells = [(r.uniform(0.05, 0.9), r.uniform(0.25, 0.9), r.uniform(0.4, 1.2)) for _ in range(5)]
    out = [0.0] * n
    for i, v in enumerate(x):
        u = i / n
        g = 0.25
        for c, a, w in swells:
            g += a * math.exp(-((u - c) * dur / w) ** 2)
        out[i] = v * g
    return env_shape(out, 0.6, dur * 0.45)


def siren(dur, seed):
    """a faint far-off wail: a slow up-and-down sweep with a slight Doppler drift, low-passed and smeared by echoes."""
    n = int(dur * SR)
    ph = 0.0
    x = [0.0] * n
    for i in range(n):
        t = i / SR
        cyc = 0.5 - 0.5 * math.cos(2 * math.pi * t / 3.6)
        f = (620 + 640 * cyc) * (1.015 - 0.03 * t / dur)
        ph += f / SR
        p = ph % 1
        x[i] = math.sin(2 * math.pi * p) * 0.8 + (2 * p - 1) * 0.2
    x = svf(x, 1400, 0.7, 'lp')
    x = svf(x, 900, 0.9, 'bp')
    out = list(x)
    for dl, g in ((0.09, 0.5), (0.23, 0.35), (0.41, 0.22)):  # buildings bouncing it around
        d = int(dl * SR)
        for i in range(d, n):
            out[i] += x[i - d] * g
    # swell in and out as it passes behind buildings
    return [v * (math.sin(math.pi * i / n) ** 1.6) * (0.75 + 0.25 * math.sin(i / SR * 1.3 + seed)) for i, v in enumerate(out)]


def gotham(ch):
    s = 600 + ch * 31
    r = random.Random(s)
    out = [0.0] * N
    # wind: gusts on a slow curve, with a few pronounced ones
    gust = smooth_curve(s + 1, 0.22, 0.25, 0.75)
    for t0, w in ((9.0, 3.5), (21.5, 4.0), (33.0, 3.0), (44.0, 4.5)):
        t0 += r.uniform(-0.6, 0.6)
        for i in range(max(0, int((t0 - w) * SR)), min(N, int((t0 + w) * SR))):
            u = (i / SR - t0) / w
            gust[i] += 0.9 * math.exp(-u * u * 3)
    wfc = [300 + 650 * g for g in gust]
    wind = svf(noise(s + 2), wfc, 1.4)
    add(out, [v * g for v, g in zip(wind, gust)], g=1.1)
    # the rain hiss: broad pink noise, bright, swelling a little with the gusts
    hiss = onepole_hp(svf(noise(s + 3), 4200, 0.6), 900)
    add(out, [v * (0.8 + 0.25 * g) for v, g in zip(hiss, gust)], g=0.7)
    # patter: dense tiny drop ticks on the slates
    rr = random.Random(s + 4)
    pat = [0.0] * N
    k = int(2600 * (LOOP + XF))
    ln = int(0.0025 * SR)
    for _ in range(k):
        o = rr.randrange(N - ln)
        a = rr.uniform(0.1, 1.0) ** 2 * rr.choice((-1, 1))
        dec = rr.uniform(0.0002, 0.0006) * SR
        for j in range(ln):
            pat[o + j] += a * math.exp(-j / dec) * rr.uniform(-1, 1)
    add(out, onepole_hp(pat, 1800), g=0.45)
    # heavier splats on metal flashing and in puddles: sparse, pitched noise bursts
    for _ in range(int(14 * (LOOP + XF))):
        t = rr.uniform(0, LOOP + XF - 0.1)
        L = int(rr.uniform(0.02, 0.05) * SR)
        b = [rr.uniform(-1, 1) * math.exp(-j / (0.007 * SR)) for j in range(L)]
        add(out, svf(b, rr.uniform(1200, 4200), 2.5), at=t, g=rr.uniform(0.05, 0.18))
    # the rooftop's low body: rain on the whole city, and traffic far below
    add(out, svf(noise(s + 5, 'brown'), 180, 0.7, 'lp'), g=0.3)
    # two gutters dripping: semi-regular, each with its own pitch; the channels hear them at different levels
    for gut, (f0, period, lvl) in enumerate(((1250, 0.85, 0.22), (820, 1.35, 0.18))):
        pan = (0.4, 1.0)[ch] if gut == 0 else (1.0, 0.45)[ch]
        t = rr.uniform(0.1, 0.5)
        k = 0
        while t < LOOP + XF - 0.2:
            add(out, drip(f0 * random.Random(gut * 1000 + k).uniform(0.93, 1.07), gut * 1000 + k), at=t,
                g=lvl * pan * random.Random(gut * 7000 + k).uniform(0.6, 1.0))
            t += period * random.Random(gut * 5000 + k).uniform(0.8, 1.25)
            k += 1
    # distant thunder (the same rolls in both channels, a touch of delay for width)
    for t0, dur, sd, g in ((12.5, 7.5, 71, 1.0), (35.0, 6.5, 83, 0.8)):
        add(out, thunder(sd, dur), at=t0 + 0.012 * ch, g=g * 0.45)
    # once in the loop: a faint siren somewhere across the city
    add(out, siren(10.0, 1.3), at=22.0 + 0.02 * ch, g=(0.21, 0.16)[ch])
    return onepole_hp(out, 25)  # no DC or sub rumble below what a speaker plays


def render(name, fn, outdir):
    with mp.get_context('fork').Pool(2) as p:
        chans = p.map(fn, [0, 1])
    L = int(LOOP * SR)
    X = int(XF * SR)
    for c in chans:
        for i in range(X):
            k = i / X
            c[i] = c[i] * math.sin(k * math.pi / 2) + c[L + i] * math.cos(k * math.pi / 2)
    inter = array('f', [0.0] * (2 * L))
    pk = max(max(abs(v) for v in c[:L]) for c in chans) or 1
    for i in range(L):
        inter[2 * i] = chans[0][i] / pk * 0.8
        inter[2 * i + 1] = chans[1][i] / pk * 0.8
    raw = os.path.join(outdir, name + '.f32')
    with open(raw, 'wb') as fh:
        fh.write(inter.tobytes())
    m = subprocess.run([FF, '-v', 'info', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    gain = TARGET - float(re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1])
    with open(raw, 'wb') as fh:
        fh.write(inter.tobytes() * 3)
    one = int(LOOP * 44100) * 2 * 4
    mp3 = os.path.join(outdir, name + '.mp3')
    for _ in range(3):
        p = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-af',
                            f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false,aresample=44100', '-f', 'f32le', '-'],
                           capture_output=True, check=True).stdout
        subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', '44100', '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', mp3],
                       input=p[one:2 * one], check=True)
        lu = subprocess.run([FF, '-nostats', '-i', mp3, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        got = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', lu)[-1])
        if abs(got - TARGET) < 0.15:
            break
        gain += TARGET - got
    os.remove(raw)
    print(name, f'gain {gain:+.1f} dB, {got} LUFS')


if __name__ == '__main__':
    od = sys.argv[1]
    if os.path.realpath(od) == os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'audio')):
        sys.exit('ambience_gotham.mp3 is now made from real recordings by scripts/real-sfx/build.py (the audio pass, '
                 'docs/audio-audit.md); render this synthesized version somewhere else')
    os.makedirs(od, exist_ok=True)
    render('ambience_gotham', gotham, od)
