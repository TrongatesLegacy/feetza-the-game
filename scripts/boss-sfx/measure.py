"""Measure audio files: duration, sample peak dBFS, 50ms RMS peak dB, leading silence ms.
Usage: python3 -I measure.py file...  (prints one line per file)"""
import math
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'


def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    a = array('f')
    a.frombytes(raw)
    return a


def measure(path):
    x = load(path)
    n = len(x)
    sr = 44100
    peak = max((abs(v) for v in x), default=0.0)
    win = int(0.05 * sr)
    hop = win
    # prefix sum of squares
    ps = [0.0] * (n + 1)
    s = 0.0
    for i, v in enumerate(x):
        s += v * v
        ps[i + 1] = s
    best = 0.0
    for st in range(0, max(1, n - win + 1), hop):
        e = min(n, st + win)
        r = (ps[e] - ps[st]) / max(1, e - st)
        if r > best:
            best = r
    rms_db = 10 * math.log10(best) if best > 0 else -120
    thr = 10 ** (-40 / 20)
    lead = next((i for i, v in enumerate(x) if abs(v) > thr), n)
    clip = sum(1 for v in x if abs(v) >= 0.999)
    return n / sr, 20 * math.log10(peak) if peak else -120, rms_db, lead / sr * 1000, clip


if __name__ == '__main__':
    for p in sys.argv[1:]:
        d, pk, r, lead, clip = measure(p)
        name = p.rsplit('/', 1)[-1]
        print(f'{name:40s} dur={d:5.2f}s peak={pk:6.1f} rms50={r:6.1f} lead={lead:5.1f}ms clip={clip}')
