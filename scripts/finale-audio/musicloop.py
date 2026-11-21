"""Cut a seamless loop from a music track, level it to the game's music loudness and encode it (pure Python + ffmpeg).

  python3 -I musicloop.py profile SRC                      # loudness every 5 s, to choose a range
  python3 -I musicloop.py cut SRC OUT.mp3 MIN MAX [FROM TO] [--lufs -16.5] [--xf 0.25]
  python3 -I musicloop.py scan SRC MIN MAX [FROM TO]        # list the best loop candidates only
  python3 -I musicloop.py check FILE.mp3 ...                # loop-seam and loudness report

`cut` finds start/end points MIN..MAX seconds apart (optionally inside FROM..TO) where the music around the end
matches the music around the start (8 band energies every 50 ms), refines the match to the sample, crossfades the
tail into the bars just before the start, and levels the result to -16.5 LUFS with a limiter run over three copies
back to back, so the gain and limiting are continuous across the wrap. Encodes 128 kb/s stereo MP3 at 44.1 kHz."""
import math
import os
import re
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
SR = 44100
FR = 0.05  # feature frame (s)
BANDS = (63, 125, 250, 500, 1000, 2000, 4000, 8000)


def dec(path, sr=SR, ch=1, af=None):
    cmd = [FF, '-v', 'error', '-i', path]
    if af:
        cmd += ['-af', af]
    cmd += ['-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-']
    a = array('f')
    a.frombytes(subprocess.run(cmd, capture_output=True, check=True).stdout)
    return a


def run_f32(x, ch, af, sr=SR):
    p = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-', '-af', af,
                        '-f', 'f32le', '-'], input=array('f', x).tobytes(), capture_output=True, check=True)
    a = array('f')
    a.frombytes(p.stdout)
    return a


def lufs_of(path_or_raw, ch=2):
    if isinstance(path_or_raw, str):
        cmd = [FF, '-nostats', '-i', path_or_raw, '-af', 'ebur128=peak=true', '-f', 'null', '-']
        inp = None
    else:
        cmd = [FF, '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', str(ch), '-i', '-', '-af', 'ebur128=peak=true',
               '-f', 'null', '-']
        inp = array('f', path_or_raw).tobytes()
    err = subprocess.run(cmd, input=inp, capture_output=True).stderr.decode()
    summ = err[err.rfind('Summary:'):]
    i = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    m = re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', summ)
    return i, (float(m.group(1)) if m else None)


def features(path):
    """per-band log energies every FR seconds."""
    fs = 16000
    hop = int(fs * FR)
    cols = []
    for f in BANDS:
        af = f'bandpass=f={f}:width_type=o:w=1' if f < 8000 else 'highpass=f=5600'
        x = dec(path, fs, 1, af)
        nf = len(x) // hop
        col = []
        for k in range(nf):
            seg = x[k * hop:(k + 1) * hop]
            e = sum(v * v for v in seg) / hop
            col.append(10 * math.log10(e + 1e-10))
        cols.append(col)
    nf = min(len(c) for c in cols)
    return [[c[k] for c in cols] for k in range(nf)]


def profile(src):
    x = dec(src, 11025)
    st = int(11025 * 5)
    for k in range(0, len(x) // st):
        seg = x[k * st:(k + 1) * st]
        r = math.sqrt(sum(v * v for v in seg) / len(seg))
        db = 20 * math.log10(r + 1e-9)
        print(f'{k * 5:4d}s {db:6.1f} ' + '#' * max(0, int((db + 40) * 1.5)))


def find(src, lo, hi, a=None, b=None, pre=3.0, post=3.0):
    F = features(src)
    N = len(F)
    a = a if a is not None else 2.0
    b = b if b is not None else N * FR - 2.0
    W1, W2 = int(pre / FR), int(post / FR)
    cands = []
    s_lo = max(int(a / FR), W1 + 2)
    for L in range(int(lo / FR), int(hi / FR) + 1):
        e_hi = min(int(b / FR), N - W2 - 1)
        if s_lo + L > e_hi:
            continue
        d = [sum(abs(p - q) for p, q in zip(F[t], F[t + L])) for t in range(N - L)]
        # window sum of d over [s-W1, s+W2)
        ps = [0.0]
        for v in d:
            ps.append(ps[-1] + v)
        row = sorted((ps[s + W2] - ps[s - W1], s, L) for s in range(s_lo, e_hi - L + 1))
        keep = []
        for c in row:  # the best few distinct starts for this length
            if all(abs(c[1] - k[1]) > 40 for k in keep):
                keep.append(c)
            if len(keep) >= 3:
                break
        cands += keep
    cands.sort()
    top = []
    for D, s, L in cands:
        if all(abs(s - s2) > 40 or abs(L - L2) > 40 for _, s2, L2 in top):
            top.append((D, s, L))
        if len(top) >= 8:
            break
    k = (W1 + W2) * len(BANDS)
    for D, s, L in top:
        print(f'  candidate: start {s * FR:7.2f}s end {(s + L) * FR:7.2f}s len {L * FR:6.2f}s  band-dist {D / k:.2f} dB')
    D, s, L = top[0]
    return s * FR, (s + L) * FR, D / k


def refine(src, s, e):
    """sample-accurate end: shift e within +-60 ms so the waveform around e best matches the waveform around s."""
    lo = 11025
    x = dec(src, lo)
    win = int(0.25 * lo)
    rad = int(0.06 * lo)
    si, ei = int(s * lo), int(e * lo)
    ref = x[si - win // 2:si + win // 2]
    best = (-2, 0)
    for k in range(-rad, rad + 1):
        seg = x[ei + k - win // 2:ei + k + win // 2]
        num = sum(p * q for p, q in zip(ref, seg))
        den = math.sqrt(sum(p * p for p in ref) * sum(q * q for q in seg)) + 1e-12
        c = num / den
        if c > best[0]:
            best = (c, k)
    e2 = e + best[1] / lo
    # fine search at full rate +-6 samples
    y = dec(src, SR)
    si, ei = int(s * SR), int(e2 * SR)
    w = int(0.08 * SR)
    ref = y[si - w // 2:si + w // 2]
    fb = (-2, 0)
    for k in range(-6, 7):
        seg = y[ei + k - w // 2:ei + k + w // 2]
        num = sum(p * q for p, q in zip(ref, seg))
        den = math.sqrt(sum(p * p for p in ref) * sum(q * q for q in seg)) + 1e-12
        if num / den > fb[0]:
            fb = (num / den, k)
    return si, ei + fb[1], fb[0]


def level(x, ch, target, tp=-1.2):
    """gain + limiter over three copies (continuous across the wrap); returns the middle copy."""
    n = len(x)
    i, _ = lufs_of(x, ch)
    g = 10 ** ((target - i) / 20)
    lim = 10 ** (tp / 20)
    y3 = array('f', [v * g for v in x]) * 3
    y3 = run_f32(y3, ch, f'alimiter=limit={lim:.4f}:attack=3:release=80:level=false:latency=1', SR)
    return y3[n:2 * n]


def encode(x, ch, out, br='128k'):
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(ch), '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', br, '-ar', str(SR), '-ac', str(ch), out],
                   input=array('f', x).tobytes(), check=True)


def finish(x, ch, out, target, br='128k'):
    """level to target LUFS (measured on the decoded MP3, with up to two correction passes) and encode."""
    aim = target
    for _ in range(3):
        encode(level(x, ch, aim), ch, out, br)
        i, _ = lufs_of(out)
        if abs(i - target) <= 0.1:
            break
        aim += target - i
    return lufs_of(out)


def cut(src, out, lo, hi, a=None, b=None, target=-16.5, xf=0.25):
    s, e, score = find(src, lo, hi, a, b)
    si, ei, corr = refine(src, s, e)
    print(f'  match: start {si / SR:.3f}s end {ei / SR:.3f}s len {(ei - si) / SR:.3f}s  band-dist {score:.2f} dB  corr {corr:.3f}')
    x = dec(src, SR, 2)
    C = int(xf * SR)
    L = ei - si
    out_x = array('f', x[2 * si:2 * (ei - C)])
    for k in range(C):
        u = (k + 0.5) / C
        if corr >= 0.6:  # well-correlated material: equal-gain
            fo, fi = math.cos(u * math.pi / 2) ** 2, math.sin(u * math.pi / 2) ** 2
        else:  # loosely matched: equal-power, so the seam doesn't dip
            fo, fi = math.cos(u * math.pi / 2), math.sin(u * math.pi / 2)
        for c in range(2):
            out_x.append(x[2 * (ei - C + k) + c] * fo + x[2 * (si - C + k) + c] * fi)
    assert len(out_x) == 2 * L, (len(out_x), L)
    i, pk = finish(out_x, 2, out, target)
    print(f'  wrote {out}: {L / SR:.2f}s  {i:.1f} LUFS  true-peak {pk} dBFS')
    return si / SR, ei / SR


def check(path):
    """seam report: sample jump at the wrap vs the file's own adjacent-sample jumps, and band-energy change across
    the wrap vs the median change between neighbouring 50 ms frames."""
    y = dec(path, SR, 2)
    n = len(y) // 2
    jumps = sorted(abs(y[2 * k + c] - y[2 * (k - 1) + c]) for k in range(1, n, 7) for c in (0, 1))
    p999 = jumps[int(len(jumps) * 0.999)]
    wrap = max(abs(y[c] - y[2 * (n - 1) + c]) for c in (0, 1))
    m = [0.5 * (y[2 * k] + y[2 * k + 1]) for k in range(n)]
    hop = int(SR * FR)

    def rmsdb(seg):
        return 10 * math.log10(sum(v * v for v in seg) / len(seg) + 1e-12)
    frames = [rmsdb(m[k * hop:(k + 1) * hop]) for k in range(n // hop)]
    steps = sorted(abs(frames[k] - frames[k - 1]) for k in range(1, len(frames)))
    med, p95 = steps[len(steps) // 2], steps[int(len(steps) * 0.95)]
    seam = abs(rmsdb(m[:hop]) - rmsdb(m[-hop:]))
    lead = next((k for k in range(n) if abs(y[2 * k]) > 1e-3 or abs(y[2 * k + 1]) > 1e-3), n)
    tail = next((k for k in range(n) if abs(y[2 * (n - 1 - k)]) > 1e-3 or abs(y[2 * (n - 1 - k) + 1]) > 1e-3), n)
    i, pk = lufs_of(path)
    ok = wrap <= p999 * 1.5 and seam <= max(p95, 1.5) and lead + tail < 32
    print(f'{os.path.basename(path):34s} {n / SR:6.2f}s {i:6.1f} LUFS tp {pk:5.1f} | wrap jump {wrap:.4f} (p99.9 {p999:.4f}) '
          f'| seam 50ms-RMS step {seam:.2f} dB (median {med:.2f}, p95 {p95:.2f}) | edge<1e-3 {lead}+{tail} smp | '
          f'{"OK" if ok else "CHECK"}')
    return ok


if __name__ == '__main__':
    cmd = sys.argv[1]
    args = [v for v in sys.argv[2:] if not v.startswith('--')]
    opts = dict(zip([v[2:] for v in sys.argv[2:] if v.startswith('--')],
                    [sys.argv[i + 1] for i, v in enumerate(sys.argv) if v.startswith('--')]))
    args = [v for v in args if v not in opts.values()]
    if cmd == 'profile':
        profile(args[0])
    elif cmd == 'cut':
        src, out, lo, hi = args[0], args[1], float(args[2]), float(args[3])
        a = float(args[4]) if len(args) > 4 else None
        b = float(args[5]) if len(args) > 5 else None
        cut(src, out, lo, hi, a, b, float(opts.get('lufs', -16.5)), float(opts.get('xf', 0.25)))
    elif cmd == 'scan':
        find(args[0], float(args[1]), float(args[2]), float(args[3]) if len(args) > 3 else None,
             float(args[4]) if len(args) > 4 else None)
    elif cmd == 'check':
        for p in args:
            check(p)
