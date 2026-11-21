"""Act 10 ambience loops (CC0, made for Feetza; a few quiet Kenney CC0 layers).
  KENNEY=/path/to/kenney python3 -I ambience.py OUTDIR [oven|firstpizzeria]
Every layer is built circularly: beds are rendered a little long and their tail folded over the head, and one-off
events (sparkles, chirps, pops) wrap round the end, so each file loops without a seam. Stereo, levelled to the
ambience loudness (-16.5 LUFS), 96 kb/s MP3 like the other ambience_*.mp3."""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
sys.path.insert(0, HERE)
import dsp  # noqa: E402
from dsp import K, env, gain, tone, noise, grains, svf, bell, fx, n, SR  # noqa: E402
import musicloop  # noqa: E402

XF = 2.0


class Loop:
    def __init__(self, sec):
        self.L = n(sec)
        self.l = [0.0] * self.L
        self.r = [0.0] * self.L

    def bed(self, make, db=0.0, width=1.0, seed=0):
        """make(dur, seed) -> mono samples; called once per channel (different seeds) and folded into a loop."""
        g = 10 ** (db / 20)
        for k, ch in enumerate((self.l, self.r)):
            x = make(self.L / SR + XF, seed * 10 + (k if width > 0 else 0))
            X = n(XF)
            for i in range(self.L):
                v = x[i]
                if i < X:
                    u = i / X
                    v = v * math.sin(u * math.pi / 2) + x[self.L + i] * math.cos(u * math.pi / 2)
                ch[i] += v * g

    def event(self, x, t, db=0.0, pan=0.0):
        g = 10 ** (db / 20)
        gl, gr = g * math.cos((pan + 1) * math.pi / 4), g * math.sin((pan + 1) * math.pi / 4)
        o = n(t)
        for i, v in enumerate(x):
            j = (o + i) % self.L
            self.l[j] += v * gl
            self.r[j] += v * gr

    def write(self, out, target=-16.5, hp=28):
        x = [0.0] * (2 * self.L)
        x[0::2], x[1::2] = self.l, self.r
        x3 = musicloop.run_f32(x * 3, 2, f'highpass=f={hp},lowpass=f=15000', SR)  # filter 3 copies, keep the middle
        y = list(x3[2 * self.L:4 * self.L])
        # the loop is circular, so start the file where the sound is steadiest (no flicker or event right at the wrap)
        h = n(0.05)
        def rms(k):
            return 10 * math.log10(sum(y[2 * ((k + j) % self.L)] ** 2 for j in range(h)) / h + 1e-12)
        rot = min(range(0, self.L - h, n(0.25)), key=lambda k: abs(rms(k - h) - rms(k)) + abs(rms(k - 2 * h) - rms(k + h)))
        y = y[2 * rot:] + y[:2 * rot]
        jump = max(abs(y[c] - y[-2 + c]) for c in (0, 1))
        i, pk = musicloop.finish(y, 2, out, target, br='96k')
        print(f'  pre-encode wrap jump {jump:.4f}')
        print(f'wrote {out}: {self.L / SR:.1f}s {i:.1f} LUFS true-peak {pk} dBFS; Kenney layers: {sorted(set(dsp.USED))}')
        dsp.USED.clear()


def slow_lfo(dur, rate, depth, ph=0.0, seed=None):
    """smooth random-ish swell: sum of two slow sines."""
    r = random.Random(seed)
    p2 = r.uniform(0, 1)
    out = []
    for i in range(n(dur)):
        t = i / SR
        v = 0.6 * math.sin(2 * math.pi * (rate * t + ph)) + 0.4 * math.sin(2 * math.pi * (rate * 1.618 * t + p2))
        out.append(1 - depth * 0.5 * (1 - v))
    return out


def mul(a, b):
    return [p * q for p, q in zip(a, b)]


# ======================= The Oven Between Worlds =======================
def oven(out):
    lp = Loop(48.0)
    T = lp.L / SR
    # low roaring fire hum: brown rumble with a slow breathing swell and a fast flicker
    lp.bed(lambda d, s: mul(fx(noise(d, 'brown', seed=s), 'lowpass=f=180,lowpass=f=220'),
                            mul(slow_lfo(d, 0.09, 0.5, seed=s), dsp.jitter_am([1.0] * n(d), 18, 0.35, seed=s))), db=-12, seed=1)
    lp.bed(lambda d, s: mul(fx(noise(d, 'pink', seed=s), 'bandpass=f=420:width_type=o:w=1.2'),
                            mul(slow_lfo(d, 0.13, 0.7, ph=0.3, seed=s), dsp.jitter_am([1.0] * n(d), 26, 0.5, seed=s + 5))),
           db=-3, seed=2)
    # distant cosmic drone: a low open fifth, slowly detuned between the ears, with a breathing filter
    def drone(d, s):
        r = random.Random(s)
        x = [0.0] * n(d)
        for f, a in ((55.0, 1.0), (82.4, 0.6), (110.0, 0.45), (164.8, 0.25)):
            f2 = f * (1 + r.uniform(-0.003, 0.003))
            y = tone(d, f2, 'saw')
            for i in range(len(x)):
                x[i] += y[i] * a
        x = fx(x, 'lowpass=f=420,lowpass=f=600')
        return mul(x, slow_lfo(d, 0.05, 0.6, ph=s * 0.37, seed=s))
    lp.bed(drone, db=-9, seed=3)
    # very high cosmic air
    lp.bed(lambda d, s: mul(fx(noise(d, 'white', seed=s), 'bandpass=f=6500:width_type=o:w=1'), slow_lfo(d, 0.07, 0.8, seed=s)),
           db=-12, seed=4)
    # occasional glassy shimmers and glitch ticks, panned, wrapping round the loop
    r = random.Random(77)
    t = 1.3
    while t < T:
        kind = r.random()
        if kind < 0.55:
            f = r.choice((1568, 1760, 2093, 2349, 2637, 3136))
            sh = dsp.mix(bell(1.4, f, d=0.5), dsp.at(gain(bell(1.2, f * 1.5, d=0.4), -6), r.uniform(0.04, 0.12)))
            sh = fx(sh + [0.0] * n(1.0), 'aecho=0.8:0.6:180|370:0.4|0.25')
            lp.event(sh, t, db=r.uniform(-13, -8), pan=r.uniform(-0.8, 0.8))
        elif kind < 0.85:
            g = K('ui/glitch_00%d' % r.randint(1, 4), 0, 0.25, rate=r.uniform(0.8, 1.2))
            lp.event(g, t, db=r.uniform(-20, -15), pan=r.uniform(-0.9, 0.9))
        else:
            tk = dsp.mix(*[dsp.at(env(tone(0.03, r.uniform(2500, 4500), 'sq'), a=0.001, d=0.006), k * 0.045) for k in range(r.randint(2, 4))])
            lp.event(fx(tk, 'acrusher=bits=6:mix=0.6'), t, db=-20, pan=r.uniform(-0.9, 0.9))
        t += r.uniform(2.2, 5.0)
    lp.write(out)


# ======================= The First Pizzeria =======================
def cricket(dur, f, rate, pulses, seed):
    """one cricket: trains of `pulses` short tone pulses at about 30 Hz, a train every 1/rate s."""
    r = random.Random(seed)
    x = [0.0] * n(dur)
    p = tone(0.018, f, harm=((1, 1), (2, 0.15)))
    p = env(p, a=0.003, r=0.008)
    t = r.uniform(0, 1 / rate)
    while t < dur - 0.3:
        amp = r.uniform(0.6, 1.0)
        for k in range(pulses):
            o = n(t + k * 0.033)
            for i, v in enumerate(p):
                if o + i < len(x):
                    x[o + i] += v * amp
        t += 1 / rate * r.uniform(0.85, 1.15)
    return x


def firstpizzeria(out):
    lp = Loop(50.0)
    T = lp.L / SR
    # soft night wind: pink noise in a slowly wandering band
    lp.bed(lambda d, s: mul(fx(noise(d, 'pink', seed=s), 'bandpass=f=700:width_type=o:w=1.6,highpass=f=180,lowpass=f=1800'),
                            slow_lfo(d, 0.045, 0.85, ph=s * 0.21, seed=s)), db=-6, seed=11)
    lp.bed(lambda d, s: mul(fx(noise(d, 'pink', seed=s), 'bandpass=f=1400:width_type=o:w=1'),
                            slow_lfo(d, 0.06, 0.95, ph=0.5 + s * 0.13, seed=s)), db=-14, seed=12)
    # the wood fire in the stone oven: a low breathy roar, a constant fine crackle and occasional pops
    lp.bed(lambda d, s: mul(fx(noise(d, 'brown', seed=s), 'lowpass=f=260'), dsp.jitter_am([1.0] * n(d), 9, 0.4, seed=s)),
           db=-27, seed=13)
    lp.bed(lambda d, s: fx(grains(d, 70, seed=s, dec=0.0007), 'highpass=f=1200,lowpass=f=7000'), db=-4, seed=14)
    lp.bed(lambda d, s: fx(grains(d, 10, seed=s, dec=0.0015), 'bandpass=f=1600:width_type=o:w=2'), db=-2, seed=15)
    r = random.Random(91)
    t = 0.7
    while t < T:
        pop = dsp.mix(env(dsp.svf(noise(0.06, seed=r.randint(0, 1 << 30)), r.uniform(900, 2500), 1.0, 'bp'), a=0.0005, d=0.01),
                      dsp.at(gain(grains(0.15, 220, seed=r.randint(0, 999), dec=0.0006), -6), 0.004))
        lp.event(pop, t, db=r.uniform(-8, -2), pan=r.uniform(-0.25, 0.25))
        t += r.expovariate(1 / 1.3)
    # a log settles now and then (Kenney wood knock, low and soft)
    for t in (11.3, 33.8):
        lp.event(fx(K('imp/impactWood_light_00%d' % (int(t) % 5), rate=0.6), 'lowpass=f=1500'), t, db=-12, pan=0.1)
    # crickets: three of them, panned and at slightly different pitches and rates
    for f, rate, pulses, pan, db, sd in ((4400, 1.6, 3, -0.6, -13, 1), (4750, 1.25, 4, 0.55, -15, 2), (4100, 2.1, 2, 0.15, -18, 3)):
        c = cricket(T, f, rate, pulses, sd)
        g = 10 ** (db / 20)
        gl, gr = g * math.cos((pan + 1) * math.pi / 4), g * math.sin((pan + 1) * math.pi / 4)
        for i, v in enumerate(c):
            sw = 1 - 0.35 * (1 - math.sin(2 * math.pi * (i / lp.L + sd * 0.3)))  # each swells and fades once a loop
            lp.l[i] += v * gl * sw
            lp.r[i] += v * gr * sw
    lp.write(out, hp=110)  # keep it light: night air, not rumble


if __name__ == '__main__':
    outdir = sys.argv[1]
    sel = sys.argv[2:] or ['oven', 'firstpizzeria']
    os.makedirs(outdir, exist_ok=True)
    if 'oven' in sel:
        oven(os.path.join(outdir, 'ambience_oven.mp3'))
    if 'firstpizzeria' in sel:
        firstpizzeria(os.path.join(outdir, 'ambience_firstpizzeria.mp3'))
