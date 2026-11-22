"""Act 10 · Finale SFX recipes (Mirror Peel, the Sole Proprietor, Ghost of Feet Future, Sole Proprietor Unbound and
the shared finale sounds). Built with the boss-sfx kit (../boss-sfx: dsp.py, render.py), so levels match the boss SFX.
Levels are the 50 ms RMS peak target after TRIM: REF -10.5 (slap), HI -9.5 (signature hits), TELL -11, MID -12,
LOW -13.5 (mashable / repeated), BED -14.5.  WHAT says what each sound is (for TRIM comments and credits)."""
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
from dsp import (K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant,  # noqa: E402
                 am, jitter_am, bell, whoosh, thump, fx, resample, n)
from render import S  # noqa: E402

REF, HI, TELL, MID, LOW, BED = -10.5, -9.5, -11.0, -12.0, -13.5, -14.5
WHAT = {}


def R(key, level, dur, what, syn=None, fade=0.04):
    WHAT[key] = what
    return S(key, level, dur, syn=syn, fade=fade)


# ---------- helpers ----------
def rev(x):
    return x[::-1]


def pad(x, sec):
    return x + [0.0] * n(sec)


def space(x, tail=0.6, wet=0.45):
    """a cheap room/cosmic tail: a few aecho taps over a padded copy."""
    return fx(pad(x, tail), f'aecho=0.8:{wet:.2f}:43|71|109|157|233:0.5|0.42|0.34|0.26|0.18')


def tinkle(dur, count, lo=3000, hi=6500, seed=None, d=0.06):
    r = random.Random(seed)
    return mix(*[at(gain(bell(0.3, r.uniform(lo, hi), d=d), r.uniform(-14, -3)), r.uniform(0, max(0.01, dur - 0.3)))
                 for _ in range(count)])


def shimmer(dur, f0=2400, f1=5200, count=14, seed=None):
    """glassy shimmer: a cloud of high bell partials over a band of bright noise."""
    t = tinkle(dur, count, f0, f1, seed=seed, d=0.12)
    air = shape(svf(noise(dur, 'white', seed=seed), sweep(f0, f1, dur), 3.0, 'bp'), [(0, 0), (0.4, 1), (1, 0)])
    return mix(t, gain(air, -12))


def voice(dur, f, vowels, wave='saw', vib=None, q=7, amps=None):
    src = tone(dur, f, wave, vib=vib)
    return formant(src, vowels, q=q, amps=amps or [1.0, 0.6, 0.35][:len(vowels)])


def choir(dur, freqs, vowels=(700, 1150, 2800), seed=3):
    r = random.Random(seed)
    parts = []
    for f in freqs:
        for det in (-0.6, 0.5):
            parts.append(voice(dur, f * (1 + det / 100), list(vowels), vib=(r.uniform(4.5, 5.8), f * 0.006), q=6))
    return mix(*parts)


def snap(dur=0.04, fc=2500):
    return env(svf(noise(dur), fc, 0.8, 'hp'), a=0.0005, d=dur / 5)


def boom(dur, f0=70, f1=30, d=0.25):
    return mix(thump(dur, f0, f1, d), gain(env(svf(noise(dur, 'brown'), 300, 0.7), a=0.003, d=d * 1.2), -5))


# ======================= Mirror Peel (mini-boss) =======================
@R('sfx_mirrorpeel_enter', REF, 1.6, 'mirror peel shimmers in', syn='a synthesized glassy shimmer and reversed whoosh', fade=0.2)
def _():
    sw = rev(whoosh(0.9, 3500, 400, q=1.3, pts=((0, 0), (0.1, 1), (1, 0))))
    sh = shimmer(1.1, 2500, 6000, 18, seed=11)
    ring = mix(bell(1.2, 1568, d=0.5), at(gain(bell(1.0, 2349, d=0.4), -3), 0.05))
    return mix(gain(sw, 0), at(gain(sh, -2), 0.6), at(K('imp/impactGlass_light_002', rate=0.9, db=-4), 0.86),
               at(gain(space(ring, 0.4), -8), 0.86))


@R('sfx_mirrorpeel_charge', TELL, 1.6, 'mirrored wind-up (tell)', syn='a synthesized reversed riser with mirrored sweeps', fade=0.05)
def _():
    d = 1.5
    tail = rev(space(bell(1.0, 1175, d=0.45), 0.5, 0.5))[-n(d):]
    up = env(tone(d, sweep(300, 1400, d), 'tri', vib=(7, 12)), a=0.3, r=0.05)
    dn = env(tone(d, sweep(2400, 520, d), vib=(7, 12)), a=0.3, r=0.05)
    rise = shape(svf(noise(d, 'pink'), sweep(500, 4500, d), 2.0, 'bp'), [(0, 0), (0.9, 1), (1, 0.3)])
    return shape(mix(gain(tail, -2), gain(up, -12), gain(dn, -14), gain(rise, -4)), [(0, 0.2), (0.85, 1), (1, 0.9)])


@R('sfx_mirrorpeel_fire', REF, 0.7, 'reversed slam and zap', syn='a reversed synthesized slam into a zap')
def _():
    slam = rev(mix(K('imp/impactPunch_heavy_001', rate=0.8), gain(thump(0.3, 160, 60, 0.07), -4)))
    zap = K('dgt/zap2', rate=0.8)
    return mix(gain(slam, -2), at(zap, len(slam) / 44100 - 0.02), at(gain(snap(0.03, 3000), -4), len(slam) / 44100 - 0.02))


@R('sfx_mirrorpeel_interrupt', REF, 0.8, 'glass crack (charge broken)', syn='a synthesized crackle')
def _():
    cr = env(svf(grains(0.3, 2600, seed=4), 3500, 0.9, 'bp'), a=0.001, d=0.08)
    return mix(K('imp/impactGlass_medium_001'), at(K('imp/impactGlass_light_004', rate=1.25, db=-4), 0.03),
               at(gain(cr, -2), 0.005), at(gain(tinkle(0.5, 6, seed=5), -4), 0.08))


@R('sfx_mirrorpeel_echo', LOW, 0.55, 'dark peel echo swoops down', syn='a synthesized falling dark whoosh')
def _():
    w = whoosh(0.45, 1500, 220, q=1.6, color='pink', pts=((0, 0), (0.35, 1), (1, 0)))
    t = env(tone(0.45, sweep(420, 140, 0.45), 'tri'), a=0.03, r=0.15)
    return fx(mix(w, gain(t, -12)), 'aphaser=in_gain=0.7:out_gain=0.9:delay=2:decay=0.5:speed=2')


@R('sfx_mirrorpeel_shatter', LOW, 0.5, 'falling echo smacked to glass shards')
def _():
    return mix(K('imp/impactGlass_light_001', rate=1.2), at(K('imp/impactGlass_light_003', rate=1.5, db=-6), 0.04),
               at(gain(tinkle(0.35, 4, 4000, 7500, seed=8), -6), 0.05))


@R('sfx_mirrorpeel_land', MID, 0.6, 'dark echo thuds onto a pizza', syn='a synthesized low thud')
def _():
    return mix(K('imp/impactSoft_heavy_002', rate=0.8), gain(thump(0.4, 120, 45, 0.1), -2),
               K('imp/impactGlass_light_000', rate=0.6, db=-12))


@R('sfx_mirrorpeel_death', HI, 1.8, 'mirror peel shatters', syn='a synthesized sub boom and glass shimmer tail', fade=0.3)
def _():
    pieces = [at(K('imp/impactGlass_light_00%d' % (i % 5), rate=1.0 + 0.12 * i, db=-6 - i), 0.12 + 0.08 * i) for i in range(6)]
    return mix(K('imp/impactGlass_heavy_000'), at(K('imp/impactGlass_heavy_003', db=-2), 0.03),
               at(K('imp/impactGlass_medium_002', rate=0.8, db=-4), 0.06), gain(boom(0.8, 80, 35, 0.2), -4),
               at(gain(tinkle(1.2, 22, 2500, 7500, seed=12), 0), 0.15), *pieces)


# ======================= The Sole Proprietor (first meeting) =======================
@R('sfx_soleprop_enter', REF, 2.4, 'ominous gong chord and coins', syn='a synthesized gong and low brass chord', fade=0.4)
def _():
    gong = bell(2.3, 82, ((1, 1, 1.0), (1.48, 0.7, 0.8), (2.0, 0.5, 0.7), (2.76, 0.45, 0.5), (3.9, 0.3, 0.35), (5.4, 0.2, 0.2)), d=0.9)
    chord = mix(*[voice(2.0, f, [500, 900], vib=(4, 0.4)) for f in (55, 82.4, 110, 130.8)])  # A minor, low
    chord = shape(svf(chord, 900, 0.7), [(0, 0), (0.15, 1), (0.6, 0.8), (1, 0)])
    return mix(gain(gong, 0), K('imp/impactBell_heavy_002', rate=0.5, db=-4), at(gain(chord, -6), 0.05),
               at(K('rpg/handleCoins', db=-4), 0.25), at(K('rpg/handleCoins2', rate=0.9, db=-6), 0.6))


@R('sfx_soleprop_voice', MID, 0.85, 'low "hmm-hm" murmur', syn='a synthesized low hummed "hmm-hm"', fade=0.08)
def _():
    def hum(dur, f):
        v = voice(dur, f, [250, 820, 2300], wave='saw', vib=(5, 1.2), q=5, amps=[1.0, 0.25, 0.06])
        v = fx(mix(v, gain(tone(dur, f, 'tri', vib=(5, 1.2)), -4)), 'lowpass=f=950,lowpass=f=1100')  # closed-mouth hum
        return shape(v, [(0, 0), (0.15, 1), (0.7, 0.85), (1, 0)])
    a = hum(0.42, glide([(0, 92), (0.2, 100), (0.42, 90)]))
    b = hum(0.3, glide([(0, 84), (0.3, 74)]))
    return mix(a, at(gain(b, -1), 0.48))


@R('sfx_soleprop_stamp', HI, 0.8, 'heavy SOLD stamp thunk', syn='a synthesized low thump')
def _():
    return mix(K('imp/impactPunch_heavy_003', rate=0.75), K('imp/impactWood_heavy_002', rate=0.7, db=-2),
               gain(thump(0.5, 110, 40, 0.1), -1), at(K('imp/impactPlate_medium_001', rate=0.6, db=-12), 0.01))


@R('sfx_soleprop_cash', MID, 1.0, 'cash register ka-ching', syn='a synthesized register bell', fade=0.15)
def _():
    p = ((1, 1, 1.0), (2.4, 0.5, 0.6), (3.9, 0.3, 0.4), (6.1, 0.15, 0.25))
    ding = bell(0.85, 2093, p, d=0.35)
    return mix(K('rpg/metalLatch', rate=1.1, db=-2), at(K('rpg/metalClick', rate=0.9, db=-4), 0.06),
               at(gain(ding, -2), 0.1), at(K('rpg/handleCoins', rate=1.1, db=-6), 0.14))


@R('sfx_soleprop_leave', TELL, 1.3, 'portal whoosh out', syn='a synthesized swirling portal whoosh', fade=0.2)
def _():
    d = 1.1
    sw = am(svf(noise(d, 'pink'), sweep(300, 3500, d), 1.6, 'bp'), sweep(4, 18, d), 0.7)
    sw = shape(sw, [(0, 0), (0.3, 1), (0.8, 0.7), (1, 0)])
    sub = env(tone(d, sweep(60, 200, d)), a=0.05, r=0.3)
    return fx(mix(sw, gain(sub, -8), K('dgt/phaserUp3', db=-6)), 'flanger=delay=3:depth=5:speed=0.8')


@R('sfx_soleprop_agent', LOW, 0.4, 'briefcase snaps open (agent arrives)')
def _():
    return mix(K('rpg/metalLatch', rate=1.2), at(K('rpg/metalClick', rate=1.0, db=-2), 0.07),
               K('rpg/dropLeather', rate=1.3, db=-8))


@R('sfx_soleprop_clock', LOW, 0.15, 'clock tick', syn='a synthesized tick')
def _():
    tk = env(svf(noise(0.03, seed=2), 3200, 2.0, 'bp'), a=0.0003, d=0.004)
    body = env(tone(0.1, 1250, harm=((1, 1), (2.7, 0.35), (4.1, 0.15))), a=0.0005, d=0.02)  # wooden case resonance
    return mix(K('rpg/metalClick', 0, 0.1, rate=1.6, db=-4), gain(tk, 0), gain(body, -2))


@R('sfx_soleprop_bell', REF, 1.8, 'shift-over bell and whistle', syn='a synthesized factory bell and steam whistle', fade=0.3)
def _():
    p = ((1, 1, 1.0), (2.1, 0.5, 0.6), (3.2, 0.35, 0.4), (5.0, 0.2, 0.25))
    ring = am(bell(1.3, 880, p, d=0.6), 22, 0.5)  # rattling clapper
    wh = voice(1.1, glide([(0, 560), (0.08, 600), (1.1, 590)]), [1200, 2400], wave='saw', vib=(6, 3), q=4)
    wh = mix(wh, gain(voice(1.1, glide([(0, 700), (0.08, 750), (1.1, 738)]), [1500, 3000], vib=(6, 3), q=4), -2))
    wh = shape(mix(wh, gain(svf(noise(1.1, 'white'), 2000, 1.0, 'bp'), -14)), [(0, 0), (0.06, 1), (0.8, 0.9), (1, 0)])
    return mix(gain(ring, 0), K('imp/impactBell_heavy_000', rate=1.1, db=-4), at(gain(wh, -5), 0.35))


# ======================= Ghost of Feet Future (mini-boss) =======================
@R('sfx_ghostfuture_enter', REF, 1.8, 'reversed ghostly swell', syn='a reversed synthesized ghostly "ooo" and shimmer', fade=0.08)
def _():
    v = env(voice(0.9, glide([(0, 330), (0.45, 440), (0.9, 392)]), [400, 820], wave='tri', vib=(5, 8)), a=0.05, r=0.3)
    v = fx(pad(mix(v, gain(shimmer(0.9, 1800, 4000, 10, seed=21), -6)), 0.7), 'aecho=0.8:0.7:120|240|360:0.5|0.33|0.2')
    sw = rev(v)
    return mix(sw, at(gain(bell(0.6, 784, d=0.25), -8), len(sw) / 44100 - 0.02))


@R('sfx_ghostfuture_foresee', LOW, 0.9, 'ghost phases out', syn='a synthesized ghostly shimmer', fade=0.2)
def _():
    d = 0.7
    w = shape(svf(noise(d, 'pink'), sweep(2500, 900, d), 2.0, 'bp'), [(0, 0), (0.2, 1), (1, 0)])
    return fx(mix(w, gain(shimmer(d, 2000, 4500, 8, seed=22), -2)), 'aecho=0.8:0.5:90|180:0.35|0.2')


@R('sfx_ghostfuture_mark', TELL, 0.9, 'future footprint appears (tell)', syn='a synthesized tick and reversed shimmer')
def _():
    sh = rev(space(mix(bell(0.5, 1760, d=0.2), at(bell(0.4, 2637, d=0.15), 0.03)), 0.3, 0.5))
    tick = mix(K('rpg/metalClick', 0, 0.1, rate=1.5), gain(env(tone(0.04, 2400), a=0.0005, d=0.006), -6))
    return mix(gain(sh, -2), at(tick, len(sh) / 44100 - 0.01))


@R('sfx_ghostfuture_stomp', REF, 1.0, 'pale ethereal stomp lands', syn='a synthesized airy thump and shimmer tail', fade=0.2)
def _():
    hit = mix(K('imp/impactSoft_heavy_001', rate=0.85), gain(thump(0.4, 100, 40, 0.1), -2))
    air = env(svf(noise(0.5, 'pink'), 1800, 0.8, 'hp'), a=0.002, d=0.12)
    return mix(hit, gain(air, -10), at(gain(space(shimmer(0.4, 1500, 3500, 6, seed=23), 0.4, 0.5), -8), 0.02))


@R('sfx_ghostfuture_paradox', REF, 0.8, 'peel caught in a paradox: warped zap', syn='a synthesized warping zap', fade=0.1)
def _():
    z = env(tone(0.6, glide([(0, 1400), (0.2, 300), (0.4, 900), (0.6, 200)]), 'sq', vib=(18, 60)), a=0.002, r=0.15)
    z = svf(z, 3000, 0.8)
    return fx(mix(K('dgt/zapThreeToneDown', db=-2), gain(z, -12)), 'flanger=delay=2:depth=8:speed=3,aphaser=speed=2:decay=0.6')


@R('sfx_ghostfuture_rewind', TELL, 1.0, 'tape rewind', syn='a synthesized tape-rewind squeal and chatter', fade=0.1)
def _():
    d = 0.9
    squeal = tone(d, glide([(0, 400), (0.2, 1500), (0.7, 2600), (d, 3200)]), 'saw', vib=(23, 120))
    squeal = svf(squeal, 3500, 1.0)
    chatter = am(svf(noise(d, 'white', seed=31), sweep(800, 4000, d), 1.4, 'bp'), sweep(12, 45, d), 0.9)
    body = shape(mix(gain(squeal, -10), chatter), [(0, 0), (0.08, 1), (0.85, 1), (1, 0)])
    return mix(body, K('ui/switch_003', rate=0.8, db=-6), at(K('ui/switch_004', rate=1.1, db=-6), d - 0.05))


@R('sfx_ghostfuture_death', REF, 2.0, 'ghost dissolves', syn='a synthesized falling dissolve and granular fizz', fade=0.4)
def _():
    d = 1.8
    v = env(voice(d, glide([(0, 440), (d, 160)]), [450, 900], wave='tri', vib=(5, 12)), a=0.02, r=0.6)
    fizz = shape(svf(grains(d, 2500, seed=41, dec=0.0008), sweep(5000, 1500, d), 1.0, 'bp'), [(0, 1), (1, 0)])
    sh = shimmer(d, 1200, 4800, 20, seed=42)
    return fx(mix(gain(v, -4), gain(fizz, 0), gain(sh, -4), K('dgt/phaserDown1', db=-6)), 'aecho=0.8:0.5:150|300:0.35|0.2')


# ======================= Sole Proprietor Unbound (final boss) =======================
@R('sfx_soleunbound_enter', HI, 3.0, 'massive impact and low choir chord', syn='a synthesized sub boom and low choir chord', fade=0.6)
def _():
    hit = mix(K('sci/explosionCrunch_003'), K('sci/lowFrequency_explosion_000', db=-1), K('imp/impactPunch_heavy_004', rate=0.6, db=-2),
              gain(boom(1.4, 60, 26, 0.45), 0))
    ch = choir(2.7, (73.4, 110, 146.8, 174.6, 220))  # D minor, low
    ch = shape(svf(ch, 2400, 0.7), [(0, 0), (0.12, 1), (0.65, 0.85), (1, 0)])
    return mix(hit, at(gain(space(ch, 0.3, 0.4), -4), 0.05))


@R('sfx_soleunbound_fist', TELL, 0.9, 'gauntlet fist wind-up whoosh (tell)', syn='a synthesized heavy wind-up whoosh')
def _():
    d = 0.75
    w = whoosh(d, 200, 1400, q=1.2, color='pink', pts=((0, 0), (0.85, 1), (1, 0)))
    groan = env(tone(d, sweep(55, 90, d), 'saw'), a=0.2, r=0.1)
    return mix(gain(w, 0), gain(svf(groan, 300, 0.8), -6), at(K('rpg/metalLatch', rate=0.6, db=-8), 0.0))


@R('sfx_soleunbound_krak', HI, 0.9, 'comic KRAK impact', syn='a synthesized snap transient and crackle')
def _():
    cr = env(svf(grains(0.25, 3500, seed=51), 2500, 1.0, 'bp'), a=0.001, d=0.06)
    return mix(gain(snap(0.05, 2200), 2), K('imp/impactPunch_heavy_000', rate=0.85), at(K('imp/impactWood_heavy_003', rate=0.8, db=-2), 0.004),
               at(K('imp/impactMining_001', db=-4), 0.01), gain(cr, -2), gain(thump(0.4, 90, 38, 0.1), -3))


@R('sfx_soleunbound_frost', REF, 1.0, 'ice crackle freeze', syn='a synthesized ice crackle and frost hiss', fade=0.15)
def _():
    cr = env(svf(grains(0.6, 2500, seed=52, dec=0.001), 3500, 0.8, 'hp'), a=0.005, d=0.25)
    hiss = shape(svf(noise(0.7, 'white'), 6000, 0.8, 'hp'), [(0, 0), (0.1, 1), (1, 0)])
    return mix(K('imp/impactGlass_heavy_001', rate=1.1, db=-2), gain(cr, 0), gain(hiss, -12),
               at(gain(tinkle(0.6, 8, 3500, 7000, seed=53), -4), 0.08))


@R('sfx_soleunbound_fire', REF, 1.1, 'fire whoomph ignites', syn='a synthesized fire whoomph', fade=0.2)
def _():
    d = 1.0
    wh = shape(svf(noise(d, 'brown'), sweep(250, 1400, 0.25), 0.8, 'lp'), [(0, 0), (0.12, 1), (0.4, 0.6), (1, 0)])
    roar = shape(jitter_am(svf(noise(d, 'pink'), 900, 0.9, 'bp'), 30, 0.5, seed=54), [(0, 0), (0.15, 1), (1, 0)])
    return mix(gain(wh, 2), gain(roar, -4), K('sci/thrusterFire_001', 0, d, db=-4), gain(thump(0.3, 90, 50, 0.08), -6))


@R('sfx_soleunbound_douse', MID, 0.8, 'flame smacked out: hiss', syn='a synthesized steam hiss', fade=0.2)
def _():
    hiss = shape(svf(noise(0.7, 'white'), sweep(5000, 2500, 0.7), 0.9, 'hp'), [(0, 0), (0.03, 1), (1, 0)])
    return mix(K('imp/impactSoft_medium_002', rate=0.9), at(gain(hiss, -2), 0.01))


@R('sfx_soleunbound_gaze', TELL, 1.3, 'glowing eyes hum (tell)', syn='a synthesized rising glow hum', fade=0.2)
def _():
    d = 1.2
    hum = tone(d, sweep(110, 140, d), harm=((1, 1), (2, 0.5), (3, 0.35), (5, 0.15)))
    hum = am(hum, sweep(6, 14, d), 0.4)
    whine = env(tone(d, sweep(1760, 2350, d), vib=(9, 15)), a=0.4, r=0.2)
    return shape(mix(hum, gain(whine, -14), K('sci/forceField_000', 0, d, db=-10)), [(0, 0), (0.3, 0.8), (0.9, 1), (1, 0)])


@R('sfx_soleunbound_stone', REF, 0.9, 'petrify crunch', syn='a synthesized stone crunch')
def _():
    cr = env(svf(grains(0.4, 2000, seed=55, dec=0.002), 1200, 0.8, 'lp'), a=0.002, d=0.12)
    return mix(K('imp/impactMining_002', rate=0.85), at(K('imp/footstep_concrete_002', rate=0.7, db=-2), 0.03),
               gain(cr, 0), gain(thump(0.3, 120, 50, 0.07), -4), at(K('imp/impactMining_004', rate=1.1, db=-8), 0.12))


@R('sfx_soleunbound_reflect', MID, 0.8, 'mirror shield reflects: ping', syn='a synthesized bright reflect ping', fade=0.15)
def _():
    ping = mix(bell(0.7, 2637, ((1, 1, 1), (2.0, 0.3, 0.6), (3.0, 0.15, 0.4)), d=0.3), at(gain(bell(0.6, 3951, d=0.2), -5), 0.02))
    return mix(K('imp/impactMetal_light_001', rate=1.4, db=-2), gain(ping, -1), K('sci/forceField_002', 0, 0.4, rate=1.3, db=-10))


@R('sfx_soleunbound_hole', TELL, 1.7, 'black hole opens: deep suction drone', syn='a synthesized deep swirling suction and sub', fade=0.2)
def _():
    d = 1.6
    suck = am(svf(noise(d, 'pink'), sweep(2500, 120, d), 1.6, 'bp'), sweep(2, 11, d), 0.7)
    sub = tone(d, sweep(32, 58, d), harm=((1, 1), (2, 0.4)))
    drone = svf(tone(d, sweep(55, 49, d), 'saw', vib=(0.8, 1.5)), 500, 0.8)
    body = shape(mix(suck, gain(sub, -2), gain(drone, -8)), [(0, 0), (0.2, 1), (0.85, 0.9), (1, 0)])
    return mix(body, K('sci/lowFrequency_explosion_001', rev=True, db=-6))


@R('sfx_soleunbound_collapse', REF, 1.2, 'black hole collapses', syn='a synthesized implosion and boom', fade=0.25)
def _():
    sw = shape(svf(noise(0.35, 'pink'), sweep(300, 4000, 0.35), 1.6, 'bp'), [(0, 0), (0.95, 1), (1, 0)])
    return mix(sw, at(gain(boom(0.8, 140, 35, 0.15), 0), 0.34), at(K('sci/explosionCrunch_001', db=-4), 0.34),
               at(K('imp/impactGlass_light_003', rate=0.8, db=-10), 0.34))


@R('sfx_soleunbound_eat', HI, 1.1, 'huge chomp and gulp as he eats a pizza', syn='a synthesized crunch and gulp', fade=0.15)
def _():
    cr = env(svf(grains(0.25, 4000, seed=56), 2200, 1.0, 'bp'), a=0.001, d=0.06)
    chomp = mix(K('imp/impactSoft_heavy_003', rate=0.7), K('imp/impactWood_medium_002', rate=0.75, db=-3), gain(cr, -1),
                gain(thump(0.3, 140, 60, 0.07), -3))
    gulp = env(voice(0.3, glide([(0, 240), (0.3, 70)]), [400, 900], wave='tri', q=4), a=0.01, d=0.1, r=0.05)
    bl = env(tone(0.18, sweep(320, 110, 0.18)), a=0.003, d=0.06)
    return mix(chomp, at(gain(chomp, -4), 0.18), at(gain(drive(gulp, 2), -2), 0.45), at(gain(bl, -4), 0.48))


@R('sfx_soleunbound_gather', TELL, 2.6, 'power gathers (riser)', syn='a synthesized two-and-a-half-second power riser', fade=0.05)
def _():
    d = 2.5
    a = tone(d, sweep(110, 880, d), 'saw', vib=(sweep(4, 12, d)(0), 6))
    a = svf(a, sweep(400, 5000, d), 1.2)
    b = tone(d, sweep(165, 1320, d), 'tri')
    air = am(svf(noise(d, 'pink'), sweep(300, 6000, d), 1.5, 'bp'), sweep(3, 24, d), 0.6)
    sub = tone(d, sweep(40, 70, d))
    return shape(mix(gain(a, -6), gain(b, -10), air, gain(sub, -6)), [(0, 0), (0.6, 0.55), (0.97, 1), (1, 0.6)])


@R('sfx_soleunbound_montage', LOW, 0.3, 'punchy whoosh-hit (montage, many fast)', syn='a short synthesized whoosh')
def _():
    w = whoosh(0.1, 600, 3000, q=1.4, pts=((0, 0), (0.8, 1), (1, 0)))
    return mix(gain(w, -4), at(K('imp/impactPunch_medium_002', rate=1.1), 0.09))


@R('sfx_soleunbound_final', HI, 3.2, 'the final smack: the biggest impact in the game', syn='a synthesized sub boom, snap and long rumble', fade=0.8)
def _():
    sub = boom(2.8, 55, 22, 0.7)
    rum = shape(jitter_am(svf(noise(3.0, 'brown'), 260, 0.7), 10, 0.4, seed=57), [(0, 1), (0.4, 0.6), (1, 0)])
    hit = mix(gain(snap(0.06, 1800), 4), K('imp/impactPunch_heavy_002', rate=0.7), K('imp/impactPunch_heavy_000', rate=0.55, db=-1),
              K('sci/explosionCrunch_000', db=-1), K('sci/lowFrequency_explosion_000', db=0), K('imp/impactMetal_heavy_000', rate=0.5, db=-6))
    return mix(hit, gain(sub, 0), gain(rum, -4), at(gain(space(K('imp/impactBell_heavy_004', rate=0.5), 1.2, 0.5), -10), 0.0))


@R('sfx_soleunbound_crack', HI, 3.0, 'the sole cracks open into light', syn='a synthesized bright shimmer swell and choir', fade=0.6)
def _():
    cr = env(svf(grains(0.5, 3000, seed=58), 2500, 0.9, 'bp'), a=0.001, d=0.15)
    shat = mix(K('imp/impactGlass_heavy_002'), at(K('imp/impactMining_003', db=-2), 0.01), gain(cr, -2),
               at(K('imp/impactGlass_heavy_004', rate=0.9, db=-4), 0.12))
    d = 2.4
    light = choir(d, (523.3, 659.3, 784, 1046.5), vowels=(800, 1200, 3000), seed=9)  # C major, bright
    light = shape(svf(light, 5000, 0.7), [(0, 0), (0.45, 1), (0.8, 0.8), (1, 0)])
    sh = shimmer(d, 3000, 8000, 34, seed=59)
    return mix(shat, at(gain(light, -8), 0.15), at(gain(sh, -2), 0.2))


# ======================= Finale shared =======================
@R('sfx_finale_warp', TELL, 0.9, 'memory-lane warp between backdrops (tell)', syn='a synthesized warp sweep and glitch stutter', fade=0.1)
def _():
    d = 0.8
    f = glide([(0, 300), (0.4, 1500), (d, 500)])
    t = tone(d, f, 'tri', vib=(11, 40))
    w = shape(svf(noise(d, 'pink'), f, 1.6, 'bp'), [(0, 0), (0.5, 1), (1, 0)])
    body = fx(shape(mix(gain(t, -8), w), [(0, 0), (0.4, 1), (1, 0)]), 'flanger=delay=2:depth=9:speed=1.5,acrusher=bits=8:mix=0.3')
    stut = mix(*[at(K('ui/glitch_002', 0, 0.06, db=-4 - 2 * i), 0.3 + 0.07 * i) for i in range(4)])
    return mix(body, stut)


@R('sfx_finale_glitch', LOW, 0.25, 'glitching echo foot blip', syn='a synthesized bit-crushed blip')
def _():
    b = env(tone(0.12, glide([(0, 1800), (0.03, 600), (0.06, 1400), (0.12, 900)]), 'sq'), a=0.001, r=0.03)
    b = fx(b, 'acrusher=bits=5:samples=6:mix=0.8')
    return mix(K('ui/glitch_001', 0, 0.2), gain(b, -10))


@R('sfx_finale_peelwall', LOW, 0.8, 'peel on the wall lights up: chime', syn='a synthesized chime', fade=0.2)
def _():
    return mix(gain(bell(0.7, 1319, ((1, 1, 1), (2.0, 0.3, 0.6), (3.0, 0.12, 0.4)), d=0.3), 0),
               at(gain(bell(0.6, 1976, d=0.25), -6), 0.04), K('imp/impactGlass_light_000', rate=1.3, db=-8))
