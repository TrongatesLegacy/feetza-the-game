# The pizza tiers' counter sounds (docs/pizza-plan.md, "The rarer, the more impressive"): a Rare pizza dealt (a soft
# two-note chime), an Epic dealt (a rising run of bell notes over a swell) and an Epic bought (a short bright sting).
# Bell tones: a few inharmonic partials each, struck and ringing away, with a small room. Pure Python, released as
# CC0 (made for Feetza). Usage: python3 tiers.py <outdir>  (then ffmpeg to mp3: see the bottom).
import math
import os
import random
import struct
import subprocess
import sys
import wave

SR = 44100


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


def swell(buf, t0, dur, f0, f1, amp):
    i0 = int(t0 * SR)
    ph = 0.0
    for k in range(int(dur * SR)):
        if i0 + k >= len(buf):
            break
        u = k / (dur * SR)
        f = f0 * (f1 / f0) ** u
        ph += 2 * math.pi * f / SR
        env = math.sin(math.pi * min(1, u * 1.15)) ** 2
        buf[i0 + k] += amp * env * (math.sin(ph) + 0.3 * math.sin(2 * ph))


def sparkle(buf, t0, dur, n, rnd, amp):
    for _ in range(n):
        bell(buf, t0 + rnd.uniform(0, dur), rnd.uniform(2600, 4200), amp * rnd.uniform(0.4, 1), decay=14, partials=((1, 1), (2.3, 0.2)))


def room(buf, gain=0.22, taps=((0.031, 1), (0.047, 0.8), (0.067, 0.6), (0.089, 0.45), (0.113, 0.3))):
    out = buf[:]
    for d, g in taps:
        o = int(d * SR)
        for i in range(o, len(buf)):
            out[i] += buf[i - o] * gain * g
    return out


def write(path, buf, peak_to=0.85):
    peak = max(abs(v) for v in buf) or 1
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v / peak * peak_to)) * 32000)) for v in buf))


def fade_tail(buf, ms=60):
    n = int(SR * ms / 1000)
    for i in range(n):
        buf[len(buf) - n + i] *= 1 - i / n


out = sys.argv[1] if len(sys.argv) > 1 else '.'
rnd = random.Random(2711)
# Rare dealt: a soft chime, E6 then B6
b = [0.0] * int(SR * 0.9)
bell(b, 0.0, 1318.5, 0.7, decay=5.5)
bell(b, 0.085, 1975.5, 0.55, decay=6)
b = room(b)
fade_tail(b)
write(os.path.join(out, 'sfx_tierchime.wav'), b, 0.6)
# Epic dealt: a rising run (C6 E6 G6 C7) over a swell, sparkles after it
b = [0.0] * int(SR * 1.2)
swell(b, 0.0, 0.42, 520, 1250, 0.18)
for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
    bell(b, 0.06 + i * 0.065, f, 0.55 + i * 0.08, decay=4.5)
sparkle(b, 0.3, 0.4, 7, rnd, 0.12)
b = room(b, 0.26)
fade_tail(b)
write(os.path.join(out, 'sfx_tierrise.wav'), b, 0.75)
# Epic bought: a short sting, a bright G major stab, then its top note rung again an octave up
b = [0.0] * int(SR * 1.1)
for f, a in ((392.0, 0.5), (493.9, 0.42), (587.3, 0.42), (784.0, 0.5)):
    bell(b, 0.0, f, a, decay=3.2, partials=((1, 1), (2, 0.55), (3, 0.35), (4, 0.2), (5, 0.1)))
bell(b, 0.12, 1568.0, 0.45, decay=4)
sparkle(b, 0.12, 0.35, 6, rnd, 0.1)
b = room(b, 0.24)
fade_tail(b)
write(os.path.join(out, 'sfx_tiersting.wav'), b, 0.85)

for name in ('sfx_tierchime', 'sfx_tierrise', 'sfx_tiersting'):
    src = os.path.join(out, f'{name}.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-q:a', '4', os.path.join(out, f'{name}.mp3')], check=True)
    os.remove(src)
