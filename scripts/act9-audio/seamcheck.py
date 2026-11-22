"""Check a loop's seam: the jump from the last sample to the first against typical sample-to-sample steps,
the level either side of the seam, and the integrated loudness. usage: python3 -I seamcheck.py file.mp3 ..."""
import math
import re
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'


def load(p):
    raw = subprocess.run([FF, '-v', 'error', '-i', p, '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    a = array('f')
    a.frombytes(raw)
    return a


def rms(x):
    return 20 * math.log10(math.sqrt(sum(v * v for v in x) / max(1, len(x))) + 1e-9)


for p in sys.argv[1:]:
    x = load(p)
    # the game trims encoder padding: skip the decoder's leading/trailing near-silence like it does
    s = next(i for i, v in enumerate(x) if abs(v) > 1e-4)
    e = len(x) - next(i for i, v in enumerate(reversed(x)) if abs(v) > 1e-4)
    x = x[s:e]
    steps = sorted(abs(x[i + 1] - x[i]) for i in range(0, len(x) - 1, 7))
    p99 = steps[int(len(steps) * 0.99)]
    jump = abs(x[0] - x[-1])
    tail, head = rms(x[-2205:]), rms(x[:2205])
    lu = subprocess.run([FF, '-nostats', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True).stderr.decode()
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', lu)
    print(f'{p.split("/")[-1]:30s} dur={len(x) / 44100:6.2f}s LUFS={m[-1] if m else "?"} seam jump={jump:.4f} (p99 step {p99:.4f}) '
          f'tail {tail:.1f} dB / head {head:.1f} dB')
