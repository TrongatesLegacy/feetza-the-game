"""Seamless music loops for Batpeel's Gotham (needs ffmpeg; no pip packages). Modelled on scripts/act7-audio/loops.py.

  python3 -I loops.py tempo SRC.mp3                                # each band's beat period, to choose a whole-bar length
  python3 -I loops.py music SRC.mp3 OUT.mp3 SECONDS [START_S [SPAN_S]]
  python3 -I loops.py seam FILE.mp3 ...                            # the last and first 50 ms either side of the loop point

Act 7's beat estimate is quantised to 10 ms frames and picks one band, which drifts by a large part of a beat over
30 bars (and here it read Crossing the Chasm's 200 BPM as 128). So: `tempo` measures each band's beat at a 32-beat lag;
`music` takes a whole-bar SECONDS from that, snaps it to the nearest peak (±0.25 s) of the whole track's onset
autocorrelation in three bands, starts on a strong onset within SPAN_S of START_S (default: anywhere after 8 s) whose
next 6 s best match the 6 s one loop later, fine-tunes the length to the sample by waveform match, and crossfades the
bar after the tail into the head. It's normalised to the music loudness (-16.4 LUFS, measured on the final MP3) with a
-1.5 dBFS limiter run over three copies end to end (the middle one is kept, so the limiter's look-ahead never touches
the seam), and encoded like the other tracks (128 kbps stereo). Temp files go in $SCRATCH (default: the temp dir)."""
import math
import os
import re
import subprocess
import sys
import tempfile
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
TMP = os.environ.get('SCRATCH', tempfile.gettempdir())
SR = 44100
FR = 200  # onset frames per second (5 ms)
BANDS = ('lowpass=f=150', 'bandpass=f=1000:width_type=o:width=2', 'highpass=f=2000')


def decode(path, sr=SR, ch=2, ss=None, t=None, af=None):
    cmd = [FF, '-v', 'error']
    if ss is not None:
        cmd += ['-ss', str(ss)]
    if t is not None:
        cmd += ['-t', str(t)]
    cmd += ['-i', path]
    if af:
        cmd += ['-af', af]
    cmd += ['-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-']
    a = array('f')
    a.frombytes(subprocess.run(cmd, capture_output=True, check=True).stdout)
    return a


def lufs(path):
    out = subprocess.run([FF, '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', out)[-1])


def encode(samples, path, target, kbps):
    tag = re.sub(r'\W', '', path)
    raw = os.path.join(TMP, f'_gloop_{tag}.f32')
    with open(raw, 'wb') as f:
        f.write(samples.tobytes())
    tmp = os.path.join(TMP, f'_gloop_{tag}.wav')
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, tmp], check=True)
    g = target - lufs(tmp)
    with open(raw, 'wb') as f:
        f.write(samples.tobytes() * 3)
    one = len(samples) * 4
    for _ in range(3):  # the limiter takes a little loudness back: measure the MP3 and make it up
        p = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-af',
                            f'volume={g:.2f}dB,alimiter=limit=0.84:level=false', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame',
                        '-b:a', f'{kbps}k', '-ar', str(SR), '-ac', '2', path], input=p[one:2 * one], check=True)
        got = lufs(path)
        if abs(target - got) < 0.15:
            break
        g += target - got
    os.remove(raw)
    os.remove(tmp)
    print(path, 'gain', round(g, 2), 'LUFS', got)


def onsets(path):
    """per band: mean-removed, unit-variance energy flux in 5 ms frames."""
    out = []
    hop = 22050 // FR
    for af in BANDS:
        x = decode(path, 22050, 1, af=af)
        env = [sum(v * v for v in x[i:i + hop]) for i in range(0, len(x) - hop, hop)]
        on = [max(0.0, env[i] - env[i - 1]) for i in range(1, len(env))]
        m = sum(on) / len(on)
        sd = math.sqrt(sum((v - m) ** 2 for v in on) / len(on)) or 1
        out.append([(v - m) / sd for v in on])
    return out


def ac(on, lag):
    return sum(on[i] * on[i + lag] for i in range(0, len(on) - lag, 2)) / ((len(on) - lag) / 2)


def tempo(path):
    for af, on in zip(BANDS, onsets(path)):
        coarse = max(range(int(FR * 0.25), int(FR * 1.0)), key=lambda L: ac(on, L))
        c = coarse * 32
        fine = max(range(c - FR // 5, c + FR // 5), key=lambda L: ac(on, L)) if c < len(on) * 0.6 else c
        b = fine / FR / 32
        print(f'{af:40s} beat {b:.5f}s ({60 / b:.2f} BPM)  4-beat bar {4 * b:.4f}s')


def features(path):
    """10 ms frames of (log energy, log brightness), for matching the music either side of the seam."""
    x = decode(path, 11025, 1)
    hop = 110
    f = []
    for i in range(0, len(x) - hop, hop):
        e = h = 0.0
        last = x[i]
        for j in range(i, i + hop):
            v = x[j]
            e += v * v
            h += (v - last) ** 2
            last = v
        f.append((math.log10(e + 1e-9), math.log10(h + 1e-9)))
    return f


def music(src, out, want, fixed=None, span=None):
    dur = float(subprocess.run(['/opt/homebrew/bin/ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src],
                               capture_output=True, text=True).stdout)
    ons = onsets(src)
    c = int(round(want * FR))
    Lf = max(range(c - FR // 4, c + FR // 4 + 1), key=lambda L: sum(ac(on, L) for on in ons))
    L = Lf / FR
    on = [sum(v) for v in zip(*ons)]
    if fixed is None:
        lo, hi = 8.0, dur
    else:
        w = span if span is not None else 1.0
        lo, hi = max(0.0, fixed - w), fixed + w
    hi = min(hi, dur - L - 8.5)
    feats = features(src)
    W = 600  # 6 s
    cand = sorted(range(int(lo * FR), int(hi * FR)), key=lambda i: -on[i])[:max(1, int((hi - lo) * 4))]
    best = (-1e18, 0)
    for t in cand:
        a0, b0 = t // 2, (t + Lf) // 2  # 10 ms feature frames
        sc = -sum((feats[a0 + j][0] - feats[b0 + j][0]) ** 2 + (feats[a0 + j][1] - feats[b0 + j][1]) ** 2 for j in range(0, W, 2))
        sc += on[t] * 2  # prefer a strong downbeat
        if sc > best[0]:
            best = (sc, t)
    start = best[1] / FR
    bar = 2.0
    seg = decode(src, SR, 2, ss=start, t=L + bar + 0.05)
    n0 = int(L * SR)
    bestd, n = 1e18, n0
    for d in range(-300, 301):  # ±7 ms by waveform match just after the seam
        m = n0 + d
        sd = sum((seg[j * 2] - seg[(m + j) * 2]) ** 2 + (seg[j * 2 + 1] - seg[(m + j) * 2 + 1]) ** 2 for j in range(0, 4096, 2))
        if sd < bestd:
            bestd, n = sd, m
    print(src.split('/')[-1], f'start {start:.3f}s loop {n / SR:.3f}s (asked {want:.3f}s, autocorr peak {L:.3f}s)')
    X = int(bar * SR)
    outs = array('f', seg[:n * 2])
    for i in range(X):
        k = i / X
        fin = math.sin(k * math.pi / 2)
        fout = math.cos(k * math.pi / 2)
        for ch in range(2):
            outs[i * 2 + ch] = seg[i * 2 + ch] * fin + seg[(n + i) * 2 + ch] * fout
    encode(outs, out, -16.4, 128)


def seam(path):
    """the level of the last and first 50 ms, and the jump at the wrap against the typical sample-to-sample step."""
    x = decode(path, SR, 1)
    s = next(i for i, v in enumerate(x) if abs(v) > 1e-4)  # skip any decoder padding, like the game does
    e = len(x) - next(i for i, v in enumerate(reversed(x)) if abs(v) > 1e-4)
    x = x[s:e]
    w = int(0.05 * SR)

    def db(seg):
        return 20 * math.log10(math.sqrt(sum(v * v for v in seg) / len(seg)) + 1e-9)

    steps = sorted(abs(x[i + 1] - x[i]) for i in range(0, len(x) - 1, 7))
    p99 = steps[int(len(steps) * 0.99)]
    jump = abs(x[0] - x[-1])
    tail, head = db(x[-w:]), db(x[:w])
    ok = jump <= p99 and abs(tail - head) < 6 and head > -40
    print(f"{path.split('/')[-1]:28s} {len(x) / SR:6.2f}s LUFS {lufs(path):6.1f}  last 50 ms {tail:6.1f} dB / first 50 ms {head:6.1f} dB  "
          f"wrap jump {jump:.4f} (p99 step {p99:.4f})  {'OK' if ok else 'CHECK'}")


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'tempo':
        tempo(sys.argv[2])
    elif cmd == 'music':
        music(sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]) if len(sys.argv) > 5 else None,
              float(sys.argv[6]) if len(sys.argv) > 6 else None)
    else:
        for p in sys.argv[2:]:
            seam(p)
