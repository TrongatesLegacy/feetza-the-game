# Synthesized applause for Curtain Call: hundreds of hand claps (short filtered noise bursts), a crowd swelling
# in and dying away. Pure Python, released as CC0 (made for Feetza).
import math
import random
import struct
import sys
import wave

SR = 44100
DUR = 2.8
N = int(SR * DUR)
buf = [0.0] * N
rnd = random.Random(1010)
for p in range(70):
    rate = rnd.uniform(4.5, 7.0)  # claps per second
    tone = rnd.uniform(0.25, 0.85)  # one-pole lowpass: the hands' size
    gain = rnd.uniform(0.4, 1.0)
    start = rnd.uniform(0.0, 0.35)
    stop = rnd.uniform(1.6, DUR - 0.2)
    t = start
    while t < stop:
        i0 = int(t * SR)
        length = int(SR * rnd.uniform(0.006, 0.014))
        y = 0.0
        env = min(1.0, t / 0.35) * (1.0 if t < stop - 0.5 else max(0.0, (stop - t) / 0.5))
        amp = gain * env * rnd.uniform(0.6, 1.0)
        for k in range(length):
            if i0 + k >= N:
                break
            y = y + tone * (rnd.uniform(-1, 1) - y)
            buf[i0 + k] += y * amp * math.exp(-k / (length * 0.35))
        t += 1.0 / rate * rnd.uniform(0.8, 1.2)
peak = max(abs(v) for v in buf) or 1
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, v / peak * 0.9)) * 32000)) for v in buf))
