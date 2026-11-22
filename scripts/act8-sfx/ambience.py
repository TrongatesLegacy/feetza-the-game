"""Synthesize the Act 8 ambience beds (CC0, made for Feetza). Pure Python + ffmpeg.

usage: python3 -I ambience.py OUTDIR
Each bed is rendered 5 s longer than the loop, then the extra tail is crossfaded (equal power) into the
head, so playback wraps seamlessly; then it's loudness-matched to the other beds (-16.5 LUFS) and saved
as 96 kbps stereo MP3 like them."""
import math
import os
import random
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
SR = 22050
LOOP = 50.0
XF = 5.0
N = int((LOOP + XF) * SR)


def noise(seed, color='pink'):
    r = random.Random(seed)
    out = [0.0] * N
    if color == 'white':
        return [r.uniform(-1, 1) for _ in range(N)]
    if color == 'brown':
        y = 0.0
        for i in range(N):
            y = (y + r.uniform(-1, 1) * 0.05) * 0.996
            out[i] = y * 4
        return out
    b0 = b1 = b2 = 0.0
    for i in range(N):
        w = r.uniform(-1, 1)
        b0 = 0.99765 * b0 + w * 0.0990460
        b1 = 0.96300 * b1 + w * 0.2965164
        b2 = 0.57000 * b2 + w * 1.0526913
        out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25
    return out


def smooth_curve(seed, rate, lo, hi):
    """slow random curve (cosine-interpolated points every 1/rate s) between lo and hi."""
    r = random.Random(seed)
    step = int(SR / rate)
    pts = [r.uniform(lo, hi) for _ in range(N // step + 3)]
    out = [0.0] * N
    for i in range(N):
        k, u = divmod(i, step)
        u /= step
        g = (1 - math.cos(math.pi * u)) / 2
        out[i] = pts[k] * (1 - g) + pts[k + 1] * g
    return out


def svf(x, fc, q, mode='bp', start=0):
    low = band = 0.0
    damp = 1.0 / q
    out = [0.0] * len(x)
    for i, v in enumerate(x):
        f = 2 * math.sin(math.pi * min(fc[start + i] if isinstance(fc, list) else fc, SR / 6.5) / SR)
        low += f * band
        high = v - low - damp * band
        band += f * high
        out[i] = low if mode == 'lp' else band if mode == 'bp' else high
    return out


def add(dst, src, at=0, g=1.0):
    o = int(at * SR)
    for i, v in enumerate(src):
        if 0 <= o + i < N:
            dst[o + i] += v * g


def env_shape(x, a, r):
    L = len(x)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    return [v * min(1, i / na) * min(1, (L - i) / nr) for i, v in enumerate(x)]


def tone(dur, f0, f1=None, wave='sin', seed=0, vib=0.0):
    L = int(dur * SR)
    out = [0.0] * L
    ph = random.Random(seed).random()
    f1 = f1 or f0
    for i in range(L):
        t = i / L
        f = f0 * (f1 / f0) ** t + vib * math.sin(2 * math.pi * 4.3 * i / SR)
        ph += f / SR
        p = ph % 1
        out[i] = math.sin(2 * math.pi * p) if wave == 'sin' else (2 * p - 1)
    return out


def bell(dur, f, d):
    L = int(dur * SR)
    out = [0.0] * L
    for ratio, amp, ds in ((1, 1, 1), (2.0, 0.4, 0.6), (2.76, 0.5, 0.5), (5.4, 0.2, 0.25)):
        w = 2 * math.pi * f * ratio / SR
        dd = d * ds * SR
        for i in range(L):
            out[i] += amp * math.sin(w * i) * math.exp(-i / dd)
    return env_shape(out, 0.003, 0.05)


def grains(dur, dens, seed, dec=0.0008):
    r = random.Random(seed)
    L = int(dur * SR)
    out = [0.0] * L
    k = int(dens * dur)
    ln = int(dec * 6 * SR)
    for _ in range(k):
        o = r.randrange(L)
        a = r.uniform(0.2, 1) * r.choice((-1, 1))
        for j in range(min(ln, L - o)):
            out[o + j] += a * math.exp(-j / (dec * SR)) * r.uniform(-1, 1)
    return out


def jotunheim(ch):
    s = 100 + ch * 17
    out = [0.0] * N
    # broad glacier wind: pink noise through a slowly wandering band, with gusts
    base = noise(s)
    fc = smooth_curve(s + 1, 0.18, 350, 900)
    gust = smooth_curve(s + 2, 0.25, 0.35, 1.0)
    w = svf(base, fc, 1.6)
    add(out, [v * g for v, g in zip(w, gust)], g=1.4)
    # the howl: a narrow, high-Q band that sings up and down
    howl_fc = smooth_curve(s + 3, 0.12, 380, 1100)
    howl_amp = smooth_curve(s + 4, 0.15, 0.0, 1.0)
    h = svf(noise(s + 5, 'white'), howl_fc, 14)
    add(out, [v * max(0.0, a - 0.35) * 1.6 for v, a in zip(h, howl_amp)], g=0.9)
    # low rumble bed
    add(out, svf(noise(s + 6, 'brown'), 120, 0.7, 'lp'), g=0.35)
    r = random.Random(s + 7)
    # creaking ice: pitched creaks and little cracks
    for t in (4.5, 13.0, 21.5, 31.0, 38.5, 46.0):
        t += r.uniform(-1, 1)
        cr = tone(r.uniform(0.5, 1.0), r.uniform(70, 120), r.uniform(55, 90), 'saw', seed=int(t))
        cr = svf(cr, r.uniform(700, 1300), 3.0)
        cr = [v * (0.4 + 0.6 * abs(math.sin(i / SR * r.uniform(18, 30)))) for i, v in enumerate(cr)]
        add(out, env_shape(cr, 0.08, 0.2), at=t, g=0.18)
        add(out, svf(grains(0.4, 900, seed=int(t * 10)), 2500, 0.7, 'hp'), at=t + r.uniform(0.2, 0.8), g=0.12)
    # distant deep groans of the giants' ice
    for t in (9.0, 27.0, 41.0):
        t += r.uniform(-1.5, 1.5)
        g = tone(4.0, r.uniform(48, 58), r.uniform(36, 44), 'saw', seed=int(t) + 3, vib=1.5)
        g = svf(g, 260, 1.2, 'lp')
        add(out, env_shape(g, 1.5, 2.0), at=t, g=0.5)
    return out


def bifrost(ch):
    s = 200 + ch * 23
    out = [0.0] * N
    # thin, high-altitude wind
    fc = smooth_curve(s + 1, 0.2, 900, 2200)
    gust = smooth_curve(s + 2, 0.22, 0.3, 1.0)
    w = svf(noise(s), fc, 2.0)
    add(out, [v * g for v, g in zip(w, gust)], g=1.2)
    add(out, svf(noise(s + 3), 300, 0.8, 'lp'), g=0.35)
    r = random.Random(s + 4)
    # crystalline shimmer from the bridge: soft high bells on a pentatonic scale
    scale = [1568, 1760, 2093, 2349, 2637, 3136, 3520]
    t = 0.5
    while t < LOOP - 1.5:
        add(out, bell(2.2, r.choice(scale), 0.7), at=t, g=r.uniform(0.04, 0.09))
        t += r.uniform(0.6, 2.2)
    # distant rolling thunder
    for t in (11.0, 33.0):
        t += r.uniform(-2, 2)
        th = svf(noise(s + int(t), 'brown')[: int(6 * SR)], 140, 0.8, 'lp')
        th = [v * (0.6 + 0.4 * math.sin(i / SR * 3.1)) for i, v in enumerate(th)]
        add(out, env_shape(th, 0.4, 4.0), at=t, g=0.9)
    # faint crackling fire somewhere far below
    fire = svf(grains(LOOP + XF, 70, seed=s + 9, dec=0.0007), 1800, 0.7, 'hp')
    lvl = smooth_curve(s + 10, 0.1, 0.2, 1.0)
    add(out, [v * g for v, g in zip(fire, lvl)], g=0.25)
    return out


def render(name, fn, outdir):
    chans = [fn(0), fn(1)]
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
    I = float([ln for ln in m.splitlines() if ln.strip().startswith('I:')][-1].split()[1])
    gain = -16.1 - I  # the limiter takes back about 0.4 dB: lands at -16.5 like the other beds
    # level, limit and resample three copies end to end and keep the middle one: the filters' edges never
    # touch the loop, so it wraps without a click
    with open(raw, 'wb') as fh:
        fh.write(inter.tobytes() * 3)
    p = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-af',
                        f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false,aresample=44100', '-f', 'f32le', '-'],
                       capture_output=True, check=True).stdout
    one = L * 2 * 2 * 4  # samples at 44.1 kHz × 2 channels × 4 bytes
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', '44100', '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k',
                    os.path.join(outdir, name + '.mp3')], input=p[one:2 * one], check=True)
    os.remove(raw)
    print(name, f'gain {gain:+.1f} dB')


if __name__ == '__main__':
    od = sys.argv[1]
    os.makedirs(od, exist_ok=True)
    render('ambience_jotunheim', jotunheim, od)
    render('ambience_bifrost', bifrost, od)
