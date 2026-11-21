"""Find a seamless loop in a music file and render it (pure Python + ffmpeg, no pip packages).

usage: python3 -I loopfind.py IN.mp3 OUT.mp3 --min 60 --max 100 [--from 0.08] [--to 0.9] [--lufs -16.4]

Features: log energy in 4 bands every 20 ms. For each loop length L in [min, max] the mean distance between
f[t] and f[t+L] over the allowed region picks the music's repeat period; the start s is then the point
where a ±1.5 s window matches best. The excerpt [s, s+L) gets the audio after s+L crossfaded (equal power,
0.3 s) into its head, so playback wraps from its end straight back into its start.
"""
import argparse
import math
import subprocess
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
SR = 8000
HOP = 160  # 20 ms
BANDS = ['lowpass=f=200', 'bandpass=f=600:width_type=o:w=1.5', 'bandpass=f=2000:width_type=o:w=1.5', 'highpass=f=5000']


def decode(path, af, sr, ch=1):
    cmd = [FF, '-v', 'error', '-i', path, '-af', af, '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-']
    a = array('f')
    a.frombytes(subprocess.run(cmd, capture_output=True, check=True).stdout)
    return a


def feats(path):
    out = []
    for b in BANDS:
        x = decode(path, b, SR)
        fr = []
        for i in range(0, len(x) - HOP, HOP):
            s = 0.0
            for v in x[i:i + HOP]:
                s += v * v
            fr.append(10 * math.log10(s / HOP + 1e-9))
        out.append(fr)
    n = min(len(f) for f in out)
    return [[out[b][i] for b in range(len(BANDS))] for i in range(n)]


def dist(a, b):
    return sum(abs(x - y) for x, y in zip(a, b))


def search(o):
    F = feats(o.inp)
    n = len(F)
    fps = SR / HOP
    lo, hi = int(n * o.frm), int(n * o.to)
    best = None
    for L in range(int(o.min * fps), int(o.max * fps) + 1, 2):
        if lo + L >= hi:
            break
        idx = range(lo, hi - L, 7)
        d = sum(dist(F[t], F[t + L]) for t in idx) / max(1, len(idx))
        if best is None or d < best[0]:
            best = (d, L)
    d0, L = best
    for L2 in range(L - 3, L + 4):
        idx = range(lo, hi - L2, 3)
        d = sum(dist(F[t], F[t + L2]) for t in idx) / max(1, len(idx))
        if d < d0:
            d0, L = d, L2
    W = int(1.5 * fps)
    bs = None
    for s in range(lo + W, hi - L - W):
        d = sum(dist(F[s + k], F[s + L + k]) for k in range(-W, W, 2))
        if bs is None or d < bs[0]:
            bs = (d, s)
    s = bs[1]
    print(f'period {L / fps:.2f}s mean-dist {d0:.2f}; start {s / fps:.2f}s end {(s + L) / fps:.2f}s seam-dist {bs[0] / W:.2f}')
    return s / fps, (s + L) / fps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inp')
    ap.add_argument('out')
    ap.add_argument('--min', type=float, default=60)
    ap.add_argument('--max', type=float, default=100)
    ap.add_argument('--frm', type=float, default=0.06)
    ap.add_argument('--to', type=float, default=0.95)
    ap.add_argument('--lufs', type=float, default=-16.4)
    ap.add_argument('--xf', type=float, default=0.3)
    ap.add_argument('--t0', type=float)
    ap.add_argument('--t1', type=float)
    o = ap.parse_args()
    if o.t0 is not None:
        t0, t1 = o.t0, o.t1
    else:
        t0, t1 = search(o)
    # render at 44.1k stereo
    R = 44100
    x = decode(o.inp, f'atrim={t0}:{t1 + o.xf + 0.05},asetpts=N/SR/TB', R, 2)
    nL = int(round((t1 - t0) * R))
    nx = int(o.xf * R)
    y = array('f', x[:nL * 2])
    for i in range(nx):
        k = i / nx
        gi, go = math.sin(k * math.pi / 2), math.cos(k * math.pi / 2)
        for c in range(2):
            y[i * 2 + c] = x[i * 2 + c] * gi + x[(nL + i) * 2 + c] * go
    tmp = o.out + '.f32'
    with open(tmp, 'wb') as fh:
        fh.write(y.tobytes())
    # two-pass loudness to the target, then MP3 128k
    m = subprocess.run([FF, '-v', 'info', '-f', 'f32le', '-ar', str(R), '-ac', '2', '-i', tmp, '-af',
                        f'loudnorm=I={o.lufs}:TP=-1.5:LRA=20:print_format=summary', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    vals = {}
    for line in m.splitlines():
        for key, lab in [('Input Integrated', 'i'), ('Input True Peak', 'tp'), ('Input LRA', 'lra'), ('Input Threshold', 'th')]:
            if line.strip().startswith(key):
                vals[lab] = line.split(':')[1].split()[0]
    gain = o.lufs - float(vals['i'])
    tp = float(vals['tp']) + gain
    af = f'volume={gain:.2f}dB'
    # a -2 dB sample ceiling, so the true peak stays near -1 dB (MP3 encoding overshoots a little)
    af += ',alimiter=limit=0.79:attack=1:release=80:level=false'
    # the limiter runs over three copies end to end and keeps the middle one, so its state at the seam
    # is the same as anywhere else in the loop (no level jump or click where it wraps)
    with open(tmp, 'wb') as fh:
        fh.write(y.tobytes() * 3)
    p = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(R), '-ac', '2', '-i', tmp, '-af', af,
                        '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    mid = p[len(y) * 4:len(y) * 8]
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(R), '-ac', '2', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '128k', o.out], input=mid, check=True)
    subprocess.run(['rm', tmp])
    print(f'gain {gain:+.2f} dB, true peak after {tp:.1f}')


main()
