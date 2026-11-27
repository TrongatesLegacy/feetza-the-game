# The Legendary pizzas' own sounds (docs/pizza-plan.md, section 12): the counter's fanfare when a Legendary is dealt,
# the stamp of "LEGENDARY!", the reveal's music sting when one becomes yours, and The First Bake's oven (its breath
# across the table, and a soft puff when it's stomped). Synthesized from sines, partials and filtered noise, with a
# small room. Pure Python, released as CC0 (made for Feetza). Usage: python3 legends.py <outdir>  (mp3s via ffmpeg).
import math
import os
import random
import struct
import subprocess
import sys
import wave

SR = 44100


def env_adsr(t, a, d, s, r, dur):
    if t < a:
        return t / a
    if t < a + d:
        return 1 - (1 - s) * (t - a) / d
    if t < dur:
        return s
    return max(0.0, s * (1 - (t - dur) / r))


def brass(buf, t0, f, dur, amp, vib=5.2):
    """A brass note: harmonics brightening as it swells, a little vibrato, a breath of noise at its start."""
    i0 = int(t0 * SR)
    n = int((dur + 0.35) * SR)
    rnd = random.Random(int(f * 10))
    ph = [0.0] * 9
    for k in range(n):
        if i0 + k >= len(buf):
            break
        t = k / SR
        e = env_adsr(t, 0.035, 0.12, 0.75, 0.3, dur)
        bright = min(1.0, t / 0.08)
        fv = f * (1 + 0.004 * math.sin(2 * math.pi * vib * t) * min(1, t / 0.25))
        v = 0.0
        for h in range(1, 9):
            ph[h] += 2 * math.pi * fv * h / SR
            v += math.sin(ph[h]) * (1.0 / h ** (1.6 - 0.6 * bright))
        breath = (rnd.random() * 2 - 1) * 0.08 * math.exp(-t * 30)
        buf[i0 + k] += amp * e * (v * 0.5 + breath)


def bell(buf, t0, f, amp, decay=5.0, partials=((1, 1), (2.0, 0.35), (2.76, 0.18), (5.4, 0.06))):
    i0 = int(t0 * SR)
    n = min(len(buf) - i0, int(SR * 6 / decay))
    for k in range(n):
        t = k / SR
        att = min(1.0, t / 0.004)
        v = 0.0
        for m, a in partials:
            v += a * math.sin(2 * math.pi * f * m * t) * math.exp(-t * decay * (1 + 0.6 * (m - 1)))
        buf[i0 + k] += amp * att * v


def timpani(buf, t0, f, amp, decay=3.0):
    i0 = int(t0 * SR)
    rnd = random.Random(int(t0 * 1000))
    lp = 0.0
    for k in range(int(SR * 1.6)):
        if i0 + k >= len(buf):
            break
        t = k / SR
        fr = f * (1 + 0.25 * math.exp(-t * 18))
        tone = math.sin(2 * math.pi * fr * t) + 0.4 * math.sin(2 * math.pi * fr * 1.5 * t)
        lp += 0.08 * ((rnd.random() * 2 - 1) - lp)
        buf[i0 + k] += amp * (tone * math.exp(-t * decay) + lp * 3 * math.exp(-t * 25))


def pad(buf, t0, freqs, dur, amp):
    """A choir-like pad: each note a stack of detuned partials, swelling in and out."""
    i0 = int(t0 * SR)
    n = int(dur * SR)
    for f in freqs:
        for det in (-0.004, 0.0, 0.005):
            ph = [0.0] * 7
            ff = f * (1 + det)
            for k in range(n):
                if i0 + k >= len(buf):
                    break
                u = k / n
                e = math.sin(math.pi * min(1.0, u * 1.25)) ** 1.5
                v = 0.0
                for h in range(1, 7):
                    ph[h] += 2 * math.pi * ff * h / SR
                    v += math.sin(ph[h]) / h ** 1.9
                buf[i0 + k] += amp * e * v / 3


def noise_swell(buf, t0, dur, amp, cut0, cut1, seed, shape=1.0):
    """Filtered noise swelling and fading: the oven's roar, a whoosh."""
    i0 = int(t0 * SR)
    n = int(dur * SR)
    rnd = random.Random(seed)
    lp = 0.0
    lp2 = 0.0
    for k in range(n):
        if i0 + k >= len(buf):
            break
        u = k / n
        cut = cut0 + (cut1 - cut0) * u
        a = 1 - math.exp(-2 * math.pi * cut / SR)
        lp += a * ((rnd.random() * 2 - 1) - lp)
        lp2 += a * (lp - lp2)
        e = math.sin(math.pi * u) ** shape
        buf[i0 + k] += amp * e * lp2 * 4


def crackle(buf, t0, dur, n, amp, seed):
    rnd = random.Random(seed)
    for _ in range(n):
        i = int((t0 + rnd.uniform(0, dur)) * SR)
        a = amp * rnd.uniform(0.3, 1)
        for k in range(int(SR * 0.006)):
            if i + k >= len(buf):
                break
            buf[i + k] += a * (rnd.random() * 2 - 1) * math.exp(-k / (SR * 0.0015))


def thump(buf, t0, f, amp, decay=14):
    i0 = int(t0 * SR)
    for k in range(int(SR * 0.6)):
        if i0 + k >= len(buf):
            break
        t = k / SR
        fr = f * (1 + 1.5 * math.exp(-t * 40))
        buf[i0 + k] += amp * math.sin(2 * math.pi * fr * t) * math.exp(-t * decay)


def sparkle(buf, t0, dur, n, rnd, amp):
    for _ in range(n):
        bell(buf, t0 + rnd.uniform(0, dur), rnd.uniform(2600, 4400), amp * rnd.uniform(0.4, 1), decay=14, partials=((1, 1), (2.3, 0.2)))


def room(buf, gain=0.22, taps=((0.031, 1), (0.047, 0.8), (0.067, 0.6), (0.089, 0.45), (0.113, 0.3), (0.149, 0.2))):
    out = buf[:]
    for d, g in taps:
        o = int(d * SR)
        for i in range(o, len(buf)):
            out[i] += buf[i - o] * gain * g
    return out


def fade_tail(buf, ms=80):
    n = int(SR * ms / 1000)
    for i in range(n):
        buf[len(buf) - n + i] *= 1 - i / n


def write(path, buf, peak_to=0.85):
    peak = max(abs(v) for v in buf) or 1
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v / peak * peak_to)) * 32000)) for v in buf))


out = sys.argv[1] if len(sys.argv) > 1 else '.'
rnd = random.Random(1501)
made = []

# A Legendary dealt: a brass fanfare (a triplet pickup on G4, then C5 E5 G5 and a held C major), timpani under it,
# bells sparkling off its end
b = [0.0] * int(SR * 2.6)
timpani(b, 0.0, 65.4, 0.5)
for i in range(3):
    brass(b, 0.0 + i * 0.09, 392.0, 0.07, 0.32)
brass(b, 0.28, 523.3, 0.16, 0.38)
brass(b, 0.46, 659.3, 0.16, 0.38)
brass(b, 0.64, 784.0, 0.9, 0.42)
brass(b, 0.64, 523.3, 0.9, 0.3)
brass(b, 0.64, 659.3, 0.9, 0.3)
brass(b, 0.64, 261.6, 0.9, 0.26)
timpani(b, 0.64, 65.4, 0.6)
bell(b, 0.66, 2093.0, 0.25, decay=4)
sparkle(b, 0.7, 0.9, 10, rnd, 0.1)
b = room(b, 0.26)
fade_tail(b)
write(os.path.join(out, 'sfx_legendfanfare.wav'), b, 0.85)
made.append('sfx_legendfanfare')

# "LEGENDARY!" stamping in: a deep thump, the slap of the stamp, a bright ring
b = [0.0] * int(SR * 0.75)
thump(b, 0.0, 58, 0.9, decay=12)
noise_swell(b, 0.0, 0.07, 0.6, 3000, 900, 77, shape=0.4)
bell(b, 0.02, 1567.98, 0.25, decay=7)
b = room(b, 0.18)
fade_tail(b, 60)
write(os.path.join(out, 'sfx_legendstamp.wav'), b, 0.8)
made.append('sfx_legendstamp')

# A Legendary becomes yours: the reveal's sting, a low boom and a choir swelling C, F, then C ("amen"), brass on top,
# bells and sparkles all through
b = [0.0] * int(SR * 3.6)
thump(b, 0.0, 44, 0.8, decay=4)
timpani(b, 0.0, 65.4, 0.4)
pad(b, 0.05, (261.6, 329.6, 392.0, 523.3), 1.5, 0.22)
pad(b, 1.2, (261.6, 349.2, 440.0, 523.3), 1.1, 0.22)
pad(b, 2.0, (261.6, 329.6, 392.0, 523.3), 1.55, 0.24)
brass(b, 0.05, 523.3, 0.5, 0.2)
brass(b, 0.55, 659.3, 0.5, 0.2)
brass(b, 2.0, 784.0, 1.1, 0.24)
for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
    bell(b, 0.1 + i * 0.07, f, 0.28, decay=3.5)
bell(b, 2.0, 2093.0, 0.3, decay=3)
sparkle(b, 0.3, 2.6, 18, rnd, 0.08)
b = room(b, 0.3)
fade_tail(b, 160)
write(os.path.join(out, 'sfx_legendreveal.wav'), b, 0.85)
made.append('sfx_legendreveal')

# The First Bake: the wood oven breathes (a warm roar swelling, the fire crackling) and its bell dings: ready
b = [0.0] * int(SR * 1.7)
noise_swell(b, 0.0, 1.0, 0.55, 300, 1400, 31, shape=1.2)
noise_swell(b, 0.05, 0.8, 0.25, 1800, 3800, 32, shape=2.0)
thump(b, 0.0, 70, 0.35, decay=6)
crackle(b, 0.05, 0.9, 26, 0.35, 33)
bell(b, 0.85, 1760.0, 0.42, decay=4.2)
bell(b, 0.85, 2637.0, 0.14, decay=6)
b = room(b, 0.2)
fade_tail(b)
write(os.path.join(out, 'sfx_legendbake.wav'), b, 0.8)
made.append('sfx_legendbake')

# The First Bake stomped: a soft puff of oven heat and a few crackles
b = [0.0] * int(SR * 0.6)
noise_swell(b, 0.0, 0.4, 0.6, 500, 1600, 41, shape=0.8)
thump(b, 0.0, 90, 0.3, decay=16)
crackle(b, 0.04, 0.3, 8, 0.3, 42)
b = room(b, 0.16)
fade_tail(b, 60)
write(os.path.join(out, 'sfx_legendpuff.wav'), b, 0.75)
made.append('sfx_legendpuff')

for name in made:
    src = os.path.join(out, f'{name}.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-q:a', '4', os.path.join(out, f'{name}.mp3')], check=True)
    os.remove(src)
