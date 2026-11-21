"""Seamless music and ambience loops for Act 7 (needs ffmpeg; no pip packages).

  python3 -I loops.py music SRC.mp3 OUT.mp3 SECONDS     # a bar-aligned excerpt of about SECONDS, crossfaded at the loop
  python3 -I loops.py amb OUT.mp3 SECONDS SRC[:gain_dB[:start_s]] ...   # layered beds, crossfaded loop

Music: the beat period comes from the onset envelope's autocorrelation; the excerpt starts on a strong onset
after the intro and runs a whole number of bars, then its tail (the bar after it) is crossfaded into its head,
so the loop point lands on the beat. Everything is normalised to the game's music loudness (-16.4 LUFS; beds
-16.6) with a -1.5 dBFS limiter and encoded like the existing tracks."""
import math
import re
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
SR = 44100


def decode(path, sr=SR, ch=2, ss=None, t=None):
    cmd = [FF, '-v', 'error']
    if ss is not None:
        cmd += ['-ss', str(ss)]
    if t is not None:
        cmd += ['-t', str(t)]
    cmd += ['-i', path, '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-']
    a = array('f')
    a.frombytes(subprocess.run(cmd, capture_output=True, check=True).stdout)
    return a


def lufs(path):
    out = subprocess.run([FF, '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', out)[-1])


def encode(samples, path, target, kbps):
    tag = re.sub(r'\W', '', path)
    raw = f'/tmp/_a7loop_{tag}.f32'
    with open(raw, 'wb') as f:
        f.write(samples.tobytes())
    tmp = f'/tmp/_a7loop_{tag}.wav'
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, tmp], check=True)
    g = target - lufs(tmp)
    subprocess.run([FF, '-v', 'error', '-y', '-i', tmp, '-af', f'volume={g:.2f}dB,alimiter=limit=0.84:level=false',
                    '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ar', str(SR), '-ac', '2', path], check=True)
    print(path, 'gain', round(g, 2), 'LUFS', lufs(path))


def beat_period(path):
    """Seconds per beat from the onset envelope (10 ms frames)."""
    x = decode(path, 11025, 1)
    hop = 110
    env = [math.sqrt(sum(v * v for v in x[i:i + hop]) / hop) for i in range(0, len(x) - hop, hop)]
    on = [max(0.0, env[i] - env[i - 1]) for i in range(1, len(env))]
    best, lag = 0.0, 50
    for L in range(33, 101):  # 180 .. 60 BPM
        s = sum(on[i] * on[i + L] for i in range(0, len(on) - L))
        # mild preference for a period near 120 BPM so half/double tempos don't win on noise
        s *= 1 - 0.15 * abs(math.log2(L / 50))
        if s > best:
            best, lag = s, L
    return lag * hop / 11025, on


def music(src, out, want):
    dur = float(subprocess.run(['/opt/homebrew/bin/ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
    beat, on = beat_period(src)
    bar = beat * 4
    bars = max(4, round(want / bar))
    L = bars * bar
    # start on the strongest onset between 8 s in and where a full excerpt (plus a bar of tail) still fits
    lo = int(min(8.0, dur * 0.1) * 100)
    hi = int(max(lo + 1, (dur - L - bar - 0.5) * 100))
    start = max(range(lo, min(hi, len(on))), key=lambda i: on[i]) / 100 if hi > lo else 0.0
    if start + L + bar > dur:
        bars = int((dur - start - bar) / bar)
        L = bars * bar
    print(src.split('/')[-1], f'beat {beat:.3f}s ({60 / beat:.0f} BPM) start {start:.2f}s bars {bars} loop {L:.2f}s')
    seg = decode(src, SR, 2, ss=start, t=L + bar)
    n = int(L * SR)
    X = int(min(bar, 2.0) * SR)
    outs = array('f', seg[:n * 2])
    for i in range(X):
        k = i / X
        fin = math.sin(k * math.pi / 2)
        fout = math.cos(k * math.pi / 2)
        for c in range(2):
            outs[i * 2 + c] = seg[i * 2 + c] * fin + seg[(n + i) * 2 + c] * fout
    encode(outs, out, -16.4, 128)


def amb(out, secs, layers):
    n = int(secs * SR)
    X = int(3.0 * SR)
    acc = array('f', [0.0] * (n * 2))
    for spec in layers:
        parts = spec.split(':')
        path, db, ss = parts[0], float(parts[1]) if len(parts) > 1 else 0.0, float(parts[2]) if len(parts) > 2 else 0.0
        seg = decode(path, SR, 2, ss=ss, t=secs + 3.0)
        need = (n + X) * 2
        if len(seg) < need:  # short sources repeat
            seg = array('f', (seg * (need // len(seg) + 1))[:need])
        g = 10 ** (db / 20)
        for i in range(n):
            if i < X:
                k = i / X
                fin, fout = math.sin(k * math.pi / 2), math.cos(k * math.pi / 2)
                for c in range(2):
                    acc[i * 2 + c] += g * (seg[i * 2 + c] * fin + seg[(n + i) * 2 + c] * fout)
            else:
                acc[i * 2] += g * seg[i * 2]
                acc[i * 2 + 1] += g * seg[i * 2 + 1]
    encode(acc, out, -16.6, 96)


if __name__ == '__main__':
    if sys.argv[1] == 'music':
        music(sys.argv[2], sys.argv[3], float(sys.argv[4]))
    else:
        amb(sys.argv[2], float(sys.argv[3]), sys.argv[4:])
