"""Tiny pure-python DSP kit for making Feetza boss SFX (mono, 44.1 kHz float lists).

Regenerate the boss SFX (needs ffmpeg; no pip packages):
  bash getpacks.sh /tmp/sfx/kenney            # Kenney CC0 packs, audio only, into a fresh folder
  KENNEY=/tmp/sfx/kenney python3 -I build.py /tmp/sfx/out [key-substring ...]
  python3 -I integrate.py /tmp/sfx/out <repo>  # copy MP3s, add TRIM entries and credits (skips ones already there)
recipes.py holds one function per sound; mapdata.py says where each one plays."""
import math
import os
import random
import subprocess
from array import array

SR = 44100
FF = '/opt/homebrew/bin/ffmpeg'
KDIR = os.environ['KENNEY']  # .../dl/kenney
PACKS = {
    'imp': 'impact-sounds', 'sci': 'sci-fi-sounds', 'rpg': 'rpg-audio', 'dgt': 'digital-audio',
    'ui': 'interface-sounds', 'uia': 'ui-audio', 'cas': 'casino-audio',
}
PACK_NAMES = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/digital-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
USED = []  # kenney refs used by the current recipe
rng = random.Random(7)


def n(sec):
    return max(1, int(sec * SR))


# ---------- io ----------
_cache = {}


def decode(path, af=None):
    cmd = [FF, '-v', 'error', '-i', path]
    if af:
        cmd += ['-af', af]
    cmd += ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    a = array('f')
    a.frombytes(raw)
    return list(a)


def K(ref, a=0.0, b=None, rate=1.0, db=0.0, af=None, rev=False):
    """Load a Kenney sound 'pack/name', slice [a,b] s, pitch/speed by rate."""
    USED.append(ref)
    pk, name = ref.split('/')
    if ref not in _cache:
        _cache[ref] = decode(os.path.join(KDIR, PACKS[pk], 'Audio', name + '.ogg'))
    x = _cache[ref]
    x = x[n(a):(n(b) if b else len(x))]
    if rev:
        x = x[::-1]
    if rate != 1.0:
        x = resample(x, rate)
    if af:
        x = fx(x, af)
    return gain(x, db)


def fx(x, af):
    """Run samples through an ffmpeg audio filter chain."""
    a = array('f', x)
    p = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', af,
                        '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], input=a.tobytes(), capture_output=True, check=True)
    b = array('f')
    b.frombytes(p.stdout)
    return list(b)


# ---------- basic ops ----------
def resample(x, rate):
    m = int(len(x) / rate)
    out = [0.0] * m
    L = len(x) - 1
    for i in range(m):
        p = i * rate
        j = int(p)
        f = p - j
        out[i] = x[j] * (1 - f) + x[min(j + 1, L)] * f
    return out


def gain(x, db):
    g = 10 ** (db / 20)
    return [v * g for v in x] if db else x


def mix(*layers):
    """layers: (samples, at_seconds) tuples or bare sample lists."""
    items = [(l, 0.0) if isinstance(l, list) else l for l in layers]
    end = max(n(at) + len(s) for s, at in items)
    out = [0.0] * end
    for s, at in items:
        o = n(at) if at else 0
        for i, v in enumerate(s):
            out[o + i] += v
    return out


def at(x, t):
    return (x, t)


def env(x, a=0.003, d=None, r=0.03, hold=None):
    """attack a s, optional exponential decay time-constant d, linear release r at end."""
    N = len(x)
    na, nr = n(a), n(r)
    out = []
    for i, v in enumerate(x):
        t = i / SR
        g = min(1.0, i / na) if na else 1.0
        if d:
            g *= math.exp(-max(0.0, t - a) / d)
        if i > N - nr:
            g *= (N - i) / nr
        out.append(v * g)
    return out


def shape(x, pts):
    """piecewise-linear amplitude envelope over normalised time: [(0,0),(0.1,1),(1,0)]."""
    N = len(x)
    out = []
    k = 0
    for i, v in enumerate(x):
        u = i / N
        while k < len(pts) - 2 and u > pts[k + 1][0]:
            k += 1
        (u0, g0), (u1, g1) = pts[k], pts[k + 1]
        g = g0 + (g1 - g0) * ((u - u0) / (u1 - u0) if u1 > u0 else 0)
        out.append(v * g)
    return out


def drive(x, k=3.0):
    t = math.tanh(k)
    return [math.tanh(k * v) / t for v in x]


def norm(x, peak=0.9):
    m = max(abs(v) for v in x) or 1
    return [v * peak / m for v in x]


# ---------- sources ----------
def tone(dur, f, wave='sin', vib=None, harm=None, ph=0.0):
    """f: Hz or callable(t)->Hz.  vib=(rateHz, depthHz).  harm: list of (mult, amp) partials for 'sin'."""
    N = n(dur)
    out = [0.0] * N
    phase = ph
    fn = f if callable(f) else (lambda t: f)
    for i in range(N):
        t = i / SR
        fr = fn(t)
        if vib:
            fr += vib[1] * math.sin(2 * math.pi * vib[0] * t)
        phase += fr / SR
        p = phase % 1.0
        if wave == 'sin':
            if harm:
                v = sum(a * math.sin(2 * math.pi * m * phase) for m, a in harm)
            else:
                v = math.sin(2 * math.pi * p)
        elif wave == 'saw':
            v = 2 * p - 1
        elif wave == 'sq':
            v = 1.0 if p < 0.5 else -1.0
        elif wave == 'tri':
            v = 4 * abs(p - 0.5) - 1
        elif wave == 'pulse':
            v = 1.0 if p < 0.2 else -0.25
        out[i] = v
    return out


def sweep(f0, f1, dur, curve='exp'):
    if curve == 'exp':
        return lambda t: f0 * (f1 / f0) ** min(1.0, t / dur)
    return lambda t: f0 + (f1 - f0) * min(1.0, t / dur)


def glide(pts):
    """pts [(t,Hz),...] piecewise-linear frequency."""
    def f(t):
        for (t0, a), (t1, b) in zip(pts, pts[1:]):
            if t <= t1:
                return a + (b - a) * ((t - t0) / (t1 - t0) if t1 > t0 else 0)
        return pts[-1][1]
    return f


def noise(dur, color='white', seed=None):
    r = random.Random(seed if seed is not None else rng.random())
    N = n(dur)
    if color == 'white':
        return [r.uniform(-1, 1) for _ in range(N)]
    out = []
    if color == 'brown':
        y = 0.0
        for _ in range(N):
            y = (y + r.uniform(-1, 1) * 0.06) * 0.995
            out.append(y * 4)
        return out
    # pink (Paul Kellet economy)
    b0 = b1 = b2 = 0.0
    for _ in range(N):
        w = r.uniform(-1, 1)
        b0 = 0.99765 * b0 + w * 0.0990460
        b1 = 0.96300 * b1 + w * 0.2965164
        b2 = 0.57000 * b2 + w * 1.0526913
        out.append((b0 + b1 + b2 + w * 0.1848) * 0.25)
    return out


def grains(dur, density, seed=None, dec=0.0015):
    """sparse random clicks (sand, crackle, ice): density per second."""
    r = random.Random(seed if seed is not None else rng.random())
    N = n(dur)
    out = [0.0] * N
    k = int(density * dur)
    L = n(dec * 6)
    for _ in range(k):
        o = r.randrange(N)
        a = r.uniform(0.2, 1.0) * r.choice((-1, 1))
        for j in range(min(L, N - o)):
            out[o + j] += a * math.exp(-j / (dec * SR)) * r.uniform(-1, 1)
    return out


def bubbles(dur, count, flo=300, fhi=1200, blen=(0.02, 0.05), seed=None):
    r = random.Random(seed if seed is not None else rng.random())
    total = []
    for _ in range(count):
        f0 = r.uniform(flo, fhi)
        L = r.uniform(*blen)
        b = env(tone(L, sweep(f0, f0 * 1.8, L)), a=0.002, d=L / 2.5, r=0.004)
        total.append((gain(b, r.uniform(-8, 0)), r.uniform(0, max(0.001, dur - L))))
    return mix(*total)


# ---------- filters (time-varying state-variable) ----------
def svf(x, fc, q=0.7, mode='lp'):
    """Chamberlin SVF; fc Hz or callable(t)->Hz; mode lp/bp/hp."""
    fn = fc if callable(fc) else (lambda t: fc)
    low = band = 0.0
    damp = 1.0 / q
    out = []
    for i, v in enumerate(x):
        f = 2 * math.sin(math.pi * min(fn(i / SR), SR / 6.5) / SR)
        for _ in range(2):  # 2x oversample for stability
            low += f * band
            high = v - low - damp * band
            band += f * high
        out.append(low if mode == 'lp' else band if mode == 'bp' else high)
    return out


def formant(x, freqs, q=6, amps=None):
    amps = amps or [1.0] * len(freqs)
    parts = [gain(svf(x, f, q, 'bp'), 20 * math.log10(a)) for f, a in zip(freqs, amps)]
    return [sum(p[i] for p in parts) for i in range(len(x))]


def am(x, rate, depth=1.0, ph=0.0):
    fn = rate if callable(rate) else (lambda t: rate)
    out = []
    p = ph
    for i, v in enumerate(x):
        p += fn(i / SR) / SR
        out.append(v * (1 - depth * 0.5 * (1 - math.cos(2 * math.pi * p))))
    return out


def jitter_am(x, rate, depth, seed=None):
    """random amplitude flutter (rasp/gurgle)."""
    r = random.Random(seed if seed is not None else rng.random())
    step = max(1, int(SR / rate))
    cur, nxt = 1.0, 1.0
    out = []
    for i, v in enumerate(x):
        if i % step == 0:
            cur, nxt = nxt, 1 - depth * r.random()
        u = (i % step) / step
        out.append(v * (cur + (nxt - cur) * u))
    return out


def bell(dur, f, partials=((1, 1, 1.0), (2.0, 0.5, 0.6), (2.76, 0.6, 0.5), (5.4, 0.25, 0.25), (8.9, 0.12, 0.12)), d=0.5):
    """inharmonic struck bell: partials (ratio, amp, decay-scale)."""
    N = n(dur)
    out = [0.0] * N
    for ratio, amp, ds in partials:
        w = 2 * math.pi * f * ratio / SR
        dd = d * ds * SR
        for i in range(N):
            out[i] += amp * math.sin(w * i) * math.exp(-i / dd)
    return env(out, a=0.001, r=0.02)


def whoosh(dur, f0, f1, q=1.2, color='pink', pts=((0, 0), (0.5, 1), (1, 0))):
    return shape(svf(noise(dur, color), sweep(f0, f1, dur), q, 'bp'), list(pts))


def thump(dur, f0, f1, d):
    return env(tone(dur, sweep(f0, f1, dur * 0.6)), a=0.002, d=d, r=0.02)
