"""Cut a seamless music loop from a downloaded track and normalise it like the other music (-16.4 LUFS, 128k stereo MP3).
usage: python3 -I loop_music.py IN.mp3 OUT.mp3 [minLen maxLen]
Finds the beat period from the onset envelope, tries loop lengths of whole 4-beat bars, and picks the start whose
music best matches the music one loop later. The head is crossfaded with what follows the tail, so the seam is gapless."""
import json
import math
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
SR = 22050
HOP = 441  # 20 ms frames


def decode(path, sr, ch):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    a = array('f')
    a.frombytes(raw)
    return a


def features(x):
    """per-frame (log energy, log brightness) and onset flux."""
    feats, flux = [], []
    prev = 0.0
    for i in range(0, len(x) - HOP, HOP):
        e = h = 0.0
        last = x[i]
        for j in range(i, i + HOP):
            v = x[j]
            e += v * v
            d = v - last
            h += d * d
            last = v
        le = math.log10(e + 1e-9)
        lh = math.log10(h + 1e-9)
        feats.append((le, lh))
        flux.append(max(0.0, lh - prev))
        prev = lh
    return feats, flux


def beat_period(flux):
    n = len(flux)
    m = sum(flux) / n
    f = [v - m for v in flux]
    best, lag = -1e9, 25
    for L in range(18, 60):  # 0.36–1.2 s
        s = sum(f[i] * f[i + L] for i in range(0, n - L, 2))
        if s > best:
            best, lag = s, L
    return lag


def main():
    src, out = sys.argv[1], sys.argv[2]
    lo = float(sys.argv[3]) if len(sys.argv) > 3 else 60
    hi = float(sys.argv[4]) if len(sys.argv) > 4 else 95
    x = decode(src, SR, 1)
    dur = len(x) / SR
    feats, flux = features(x)
    nf = len(feats)
    lag = beat_period(flux)
    beat = lag * HOP / SR
    ks = [k for k in range(4, int(hi / beat) + 1, 4) if lo <= k * beat <= hi]
    W = 300  # 6 s comparison window
    best = (-1e9, 0, 0)
    for k in ks:
        Lf = round(k * lag)
        for t0 in range(int(3 / 0.02), nf - Lf - W - int(4 / 0.02), 5):
            s = 0.0
            for j in range(0, W, 3):
                a = feats[t0 + j]
                b = feats[t0 + Lf + j]
                s -= (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
            if s > best[0]:
                best = (s, t0, Lf)
    score, t0, Lf = best
    # fine-tune the length at sample level (±1 frame) by waveform match just after the seam
    y = decode(src, 44100, 2)
    a0 = t0 * HOP * 2
    Ls = Lf * HOP * 2
    win = 4096
    bestd, bestL = 1e18, Ls
    for d in range(-HOP * 2, HOP * 2 + 1, 2):
        L = Ls + d
        s = 0.0
        for j in range(0, win, 2):
            s += (y[(a0 + j) * 2] - y[(a0 + L + j) * 2]) ** 2
        if s < bestd:
            bestd, bestL = s, L
    a, L = a0, bestL
    xf = min(int(1.5 * 44100), len(y) // 2 - a - L)
    body = array('f', y[a * 2:(a + L) * 2])
    for i in range(xf):
        g = i / xf
        gi = math.sin(g * math.pi / 2)
        go = math.cos(g * math.pi / 2)
        for c in range(2):
            body[i * 2 + c] = y[(a + i) * 2 + c] * gi + y[(a + L + i) * 2 + c] * go
    raw = body.tobytes()
    meas = subprocess.run([FF, '-v', 'info', '-f', 'f32le', '-ar', '44100', '-ac', '2', '-i', '-', '-af',
                           'loudnorm=I=-16.4:TP=-1.5:LRA=18:print_format=json', '-f', 'null', '-'], input=raw, capture_output=True).stderr.decode()
    js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    af = ('loudnorm=I=-16.4:TP=-1.5:LRA=18:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:'
          'measured_thresh={input_thresh}:offset={target_offset}:linear=true').format(**js)
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', '44100', '-ac', '2', '-i', '-', '-af', af + ',aresample=44100',
                    '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', out], input=raw, check=True)
    print(f'{out.split("/")[-1]}: src {dur:.1f}s beat {beat:.3f}s ({60 / beat:.0f} bpm) loop {a / 44100:.2f}s + {L / 44100:.2f}s '
          f'match {score:.1f} seam diff {math.sqrt(bestd / (win / 2)):.4f}')


main()
