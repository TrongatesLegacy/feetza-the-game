"""Finalise a recipe: trim, fade, normalise to a 50 ms RMS target, limit, encode MP3, measure."""
import json
import math
import os
import subprocess
from array import array

import dsp
from dsp import SR, FF, n

REG = []


def S(key, level, dur, syn=None, fade=0.04):
    """Register a recipe. level = target 50 ms RMS peak (dB) after TRIM; dur = max length (s).
    syn: description of original synthesized layers (for credits), or None."""
    def deco(fn):
        REG.append(dict(key=key, level=level, dur=dur, syn=syn, fade=fade, fn=fn))
        return fn
    return deco


def rms50(x):
    win = n(0.05)
    best = 0.0
    for st in range(0, max(1, len(x) - win + 1), win):
        seg = x[st:st + win]
        r = sum(v * v for v in seg) / len(seg)
        best = max(best, r)
    return 10 * math.log10(best) if best > 0 else -120


def peakdb(x):
    m = max(abs(v) for v in x) or 1e-9
    return 20 * math.log10(m)


def finalise(x, dur, fade):
    x = dsp.fx(x, 'highpass=f=35,lowpass=f=14500')
    pk = max(abs(v) for v in x) or 1e-9
    thr = pk * 10 ** (-40 / 20)
    s = next(i for i, v in enumerate(x) if abs(v) > thr)
    x = x[max(0, s - 8):]
    tthr = pk * 10 ** (-52 / 20)
    e = len(x) - next(i for i, v in enumerate(reversed(x)) if abs(v) > tthr)
    x = x[:min(e, n(dur))]
    x = dsp.env(x, a=0.0008, r=min(fade, len(x) / SR / 3))
    return x


def encode(x, path):
    a = array('f', x)
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', str(SR), '-ac', '1', path],
                   input=a.tobytes(), check=True)


def build(r, outdir):
    dsp.USED.clear()
    x = r['fn']()
    x = finalise(x, r['dur'], r['fade'])
    target = r['level']
    goal = max(target, -12.0)
    x = dsp.gain(x, goal - rms50(x))
    LIM = 0.84  # -1.5 dBFS
    for _ in range(4):  # limit, then make up the lost level, a few times
        if max(abs(v) for v in x) > LIM:
            x = dsp.fx(x, 'alimiter=limit=%.2f:attack=2:release=60:level=false:latency=1' % LIM)
        short = goal - rms50(x)
        if short < 0.5:
            break
        x = dsp.gain(x, short)
    for _ in range(2):
        if goal - rms50(x) <= 1.0:
            break
        # still short: gently saturate the transients
        k = 10 ** (min(goal - rms50(x), 6) / 20)
        m = max(abs(v) for v in x)
        x = [math.tanh(v / m * k) for v in x]
        x = dsp.gain(x, goal - rms50(x))
        m = max(abs(v) for v in x)
        if m > LIM:
            x = [v * LIM / m for v in x]
    m = max(abs(v) for v in x)
    if m > LIM:
        x = [v * LIM / m for v in x]
    x = dsp.env(x, a=0.0008, r=min(r['fade'], len(x) / SR / 3))
    s0 = next((i for i, v in enumerate(x) if abs(v) > 0.02), 0)  # no leading silence below -40 dBFS
    x = x[max(0, s0 - 40):]
    path = os.path.join(outdir, r['key'] + '.mp3')
    for _ in range(8):  # keep MP3 overshoot under -0.5 dBFS
        encode(x, path)
        y = dsp.decode(path)
        over = peakdb(y) + 0.8
        if over <= 0:
            break
        x = dsp.gain(x, -over - 0.3)
    meas = rms50(y)
    pk = peakdb(y)
    thr = 10 ** (-40 / 20)
    lead = next((i for i, v in enumerate(y) if abs(v) > thr), len(y)) / SR * 1000
    clip = sum(1 for v in y if abs(v) >= 0.999)
    trim = round(10 ** ((target - meas) / 20), 2)
    used = []
    for u in dsp.USED:
        if u not in used:
            used.append(u)
    return dict(key=r['key'], measured=round(meas, 1), target=target, trim=trim, peak=round(pk, 1),
                dur=round(len(y) / SR, 2), lead=round(lead, 1), clip=clip, used=used, syn=r['syn'])
