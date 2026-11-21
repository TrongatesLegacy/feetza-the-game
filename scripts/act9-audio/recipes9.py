"""Act 9 (Greek myths) SFX recipes: the Minotaur, Medusa, Cerberus, Hades and the Titans, the myth feet and Charybdis.
Same kit and levels as scripts/boss-sfx/recipes.py (50 ms RMS peak after TRIM):
REF -10.5 (slap), HI -9.5 (signature hits), TELL -11, MID -12, LOW -13.5 (mashable / repeated), BED -14.5."""
import math

from dsp import (K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant,
                 am, jitter_am, bell, whoosh, thump, fx)
from render import S

REF, HI, TELL, MID, LOW, BED = -10.5, -9.5, -11.0, -12.0, -13.5, -14.5


def voice(dur, f, vowels, wave='saw', vib=None, q=7, amps=(1.0, 0.6, 0.35)):
    """crude vocal: a saw through formant band-passes."""
    return formant(tone(dur, f, wave, vib=vib), vowels, q=q, amps=list(amps)[:len(vowels)])


def stone_grind(dur, fc=700, seed=None):
    """gritty scraping stone: dense grains through a low band-pass with a rough flutter."""
    g = svf(grains(dur, 9000, seed=seed, dec=0.0012), fc, 1.2, 'bp')
    n_ = svf(noise(dur, 'brown', seed=seed), fc * 0.6, 0.8)
    return jitter_am(mix(gain(g, 0), gain(n_, -6)), 22, 0.6, seed=seed)


def hiss(dur, fc=6000, seed=None):
    return svf(noise(dur, seed=seed), fc, 1.4, 'bp')


def bronze(dur, f, d=0.6):
    """a struck bronze shield: low inharmonic partials with a long ring."""
    p = ((1, 1, 1.0), (1.47, 0.6, 0.8), (2.09, 0.5, 0.6), (2.56, 0.35, 0.5), (3.9, 0.2, 0.3), (5.2, 0.12, 0.2))
    return bell(dur, f, p, d=d)


def chain_rattle(dur, count=7, seed=1):
    import random
    r = random.Random(seed)
    hits = []
    for i in range(count):
        ref = r.choice(['rpg/metalClick', 'rpg/metalLatch', 'imp/impactMetal_light_001', 'imp/impactMetal_light_003'])
        hits.append(at(K(ref, rate=r.uniform(1.1, 1.6), db=r.uniform(-10, -3)), r.uniform(0, dur * 0.85)))
    return mix(*hits)


def bark(f0=210, dur=0.22, seed=None):
    """a dog bark: a fast pitch drop through a wide 'ruff' formant, with breath."""
    v = voice(dur, glide([(0, f0 * 1.25), (0.05, f0), (dur, f0 * 0.6)]), [650, 1300, 2600], q=5)
    br = svf(noise(dur, seed=seed), 1800, 0.9, 'bp')
    return env(drive(mix(gain(v, 0), gain(br, -8)), 3), a=0.004, d=dur / 3, r=0.03)


# ======================= The Minotaur =======================
@S('sfx_minotaur_bellow', HI, 1.6, syn='a synthesized bull bellow (pitched-down formant voice) and chest rumble')
def _():
    v = voice(1.5, glide([(0, 92), (0.25, 118), (0.9, 108), (1.5, 70)]), [420, 900, 2100], vib=(6, 4), q=6)
    v = shape(jitter_am(drive(v, 2.5), 34, 0.45), [(0, 0), (0.12, 1), (0.75, 0.85), (1, 0)])
    sub = env(tone(1.5, glide([(0, 46), (1.5, 38)])), a=0.08, r=0.3)
    snort = env(svf(noise(0.25), 1100, 0.8, 'bp'), a=0.01, d=0.07)
    return mix(gain(v, 0), gain(sub, -8), at(gain(snort, -4), 1.3), K('imp/impactSoft_heavy_002', rate=0.6, db=-12))


@S('sfx_minotaur_snort', TELL, 1.1, syn='synthesized steam snorts and a hoof scrape')
def _():
    def sn(d):
        return env(svf(noise(d, 'pink'), sweep(1400, 700, d), 0.9, 'bp'), a=0.006, d=d / 2.5, r=0.02)
    scrape = shape(stone_grind(0.35, 1100, seed=4), [(0, 0), (0.2, 1), (1, 0)])
    return mix(gain(sn(0.22), 0), at(gain(sn(0.3), 1), 0.3), at(gain(scrape, -2), 0.62),
               at(K('imp/footstep_concrete_002', rate=0.7, db=-3), 0.62), at(K('imp/footstep_concrete_004', rate=0.65, db=-5), 0.82))


@S('sfx_minotaur_charge', HI, 1.4, syn='synthesized galloping hoof thunder')
def _():
    beats = []
    t = 0.0
    for i in range(9):
        k = 'imp/footstep_concrete_00%d' % (i % 5)
        beats.append(at(mix(K(k, rate=0.55, db=-2 + i * 0.4), gain(thump(0.15, 90, 45, 0.04), -4)), t))
        t += 0.13 if i % 2 == 0 else 0.07
    rum = shape(svf(noise(1.4, 'brown'), 300, 0.7), [(0, 0.2), (0.7, 1), (1, 0)])
    return mix(*beats, gain(rum, -4), at(whoosh(0.6, 300, 1500, q=1.0), 0.7))


@S('sfx_minotaur_gore', REF, 0.8, syn='a synthesized horn-thrust grunt')
def _():
    grunt = env(voice(0.3, glide([(0, 120), (0.3, 80)]), [500, 1000]), a=0.005, d=0.1)
    return mix(K('imp/impactPunch_heavy_003', rate=0.8), K('imp/impactWood_heavy_002', rate=0.8, db=-4), gain(drive(grunt, 2), -6),
               at(K('imp/impactSoft_heavy_000', rate=0.9, db=-6), 0.03))


@S('sfx_minotaur_crash', HI, 1.2, syn='a synthesized stone-wall crunch and dazed tweet')
def _():
    rub = env(stone_grind(0.6, 900, seed=9), a=0.002, d=0.2)
    tweet = env(tone(0.5, glide([(0, 2200), (0.1, 2800), (0.2, 2200), (0.3, 2800), (0.5, 2400)]), 'tri'), a=0.01, r=0.1)
    return mix(K('imp/impactMining_003', rate=0.7), K('imp/impactPunch_heavy_000', rate=0.7, db=-2), gain(thump(0.5, 70, 35, 0.15), -2),
               gain(rub, -4), at(K('imp/impactMining_001', rate=1.1, db=-9), 0.18), at(gain(tweet, -18), 0.45))


@S('sfx_minotaur_walls', MID, 1.3, syn='synthesized heavy stone blocks grinding into place', fade=0.12)
def _():
    g = shape(stone_grind(1.2, 500, seed=2), [(0, 0), (0.15, 1), (0.8, 0.9), (1, 0)])
    return mix(gain(g, 0), at(K('imp/impactMining_004', rate=0.6, db=-3), 1.0), gain(thump(1.2, 50, 40, 0.6), -10))


# ======================= Medusa =======================
@S('sfx_medusa_glow', TELL, 1.3, syn='a synthesized eerie rising shimmer and a snake hiss', fade=0.1)
def _():
    sh = mix(env(tone(1.2, sweep(440, 880, 1.2), 'tri', vib=(7, 12)), a=0.3, r=0.2),
             gain(env(tone(1.2, sweep(660, 1320, 1.2), vib=(9, 18)), a=0.4, r=0.2), -5))
    h = shape(hiss(1.2, 6500, seed=5), [(0, 0), (0.5, 0.4), (0.85, 1), (1, 0)])
    return mix(gain(sh, -2), gain(h, -6), K('sci/forceField_002', rate=0.8, db=-10))


@S('sfx_medusa_petrify', REF, 1.2, syn='synthesized stone grinding over a crackle of frost-like grit')
def _():
    g = shape(stone_grind(1.0, 800, seed=11), [(0, 0), (0.1, 1), (0.7, 0.8), (1, 0)])
    crk = env(svf(grains(0.6, 1400, seed=3), 3000, 0.9, 'hp'), a=0.005, d=0.2)
    return mix(gain(g, 0), at(gain(crk, -8), 0.1), at(K('imp/impactMining_002', rate=0.75, db=-2), 0.85),
               K('sci/forceField_004', rate=0.6, db=-12))


@S('sfx_medusa_crack', LOW, 0.45, syn='a synthesized stone crack')
def _():
    snap = env(svf(noise(0.05), 2200, 0.8, 'hp'), a=0.0005, d=0.01)
    return mix(K('imp/impactMining_000', rate=1.3), gain(snap, -4), at(K('imp/impactGlass_light_001', rate=0.6, db=-12), 0.01))


@S('sfx_medusa_crumble', HI, 1.4, syn='a synthesized crumbling rubble cascade')
def _():
    debris = mix(*[at(K('imp/impactMining_00%d' % (i % 5), rate=0.8 + 0.1 * (i % 3), db=-3 - i * 1.2), 0.07 * i + 0.02 * (i % 2)) for i in range(8)])
    rum = env(svf(noise(1.3, 'brown'), 350, 0.7), a=0.01, d=0.45)
    return mix(K('imp/impactMining_003', rate=0.6), gain(thump(0.7, 64, 30, 0.2), -2), debris, gain(rum, -5))


@S('sfx_medusa_mirror', MID, 1.0, syn='a synthesized bright mirror shimmer', fade=0.15)
def _():
    sp = mix(*[at(gain(bell(0.6, f, d=0.25), -4 - i), 0.08 * i) for i, f in enumerate([1568, 2093, 2637, 3136])])
    sw = whoosh(0.5, 2000, 7000, q=1.5, pts=((0, 0), (0.3, 1), (1, 0)))
    return mix(sp, gain(sw, -10), K('imp/impactMetal_light_002', rate=1.6, db=-12))


@S('sfx_medusa_reflect', REF, 0.9, syn='a synthesized bronze shield ring')
def _():
    return mix(K('imp/impactMetal_heavy_001', rate=1.1), gain(bronze(0.85, 520, d=0.35), -4), K('imp/impactBell_heavy_002', rate=1.4, db=-8))


@S('sfx_medusa_cure', REF, 1.2, syn='a synthesized rising three-note chime and stone release')
def _():
    ch = mix(*[at(gain(bell(0.8, f, d=0.3), -3), t) for f, t in ((784, 0.0), (988, 0.1), (1319, 0.2))])
    puff = env(svf(noise(0.5, 'pink'), 1500, 0.8), a=0.01, d=0.15)
    return mix(ch, gain(puff, -10), K('imp/impactMining_001', rate=1.3, db=-10), at(K('ui/confirmation_002', db=-8), 0.25))


@S('sfx_medusa_hiss', MID, 0.9, syn='synthesized layered snake hisses and a rattle')
def _():
    h1 = shape(hiss(0.7, 6000, seed=21), [(0, 0), (0.1, 1), (0.7, 0.8), (1, 0)])
    h2 = shape(hiss(0.6, 4500, seed=22), [(0, 0), (0.2, 1), (1, 0)])
    rat = env(am(svf(noise(0.4), 5000, 1.2, 'bp'), 38, 1.0), a=0.01, r=0.1)
    return mix(gain(h1, 0), at(gain(h2, -3), 0.15), at(gain(rat, -6), 0.35))


@S('sfx_medusa_gaze', REF, 0.9, syn='a synthesized stony thunk and a frozen shimmer')
def _():
    sh = env(tone(0.6, sweep(1200, 300, 0.6), 'tri'), a=0.002, d=0.25)
    return mix(K('imp/impactMining_004', rate=0.9), K('imp/impactPunch_heavy_002', rate=0.8, db=-5), gain(sh, -10),
               gain(thump(0.4, 90, 45, 0.1), -6))


# ======================= Cerberus =======================
@S('sfx_cerberus_bark', HI, 1.2, syn='three synthesized barks at three pitches and a growl')
def _():
    g = shape(jitter_am(voice(1.1, 72, [350, 800], vib=(4, 3)), 30, 0.6), [(0, 0), (0.2, 0.6), (1, 0)])
    return mix(gain(bark(200, seed=1), 0), at(gain(bark(240, seed=2), -1), 0.24), at(gain(bark(170, seed=3), 0), 0.46), gain(drive(g, 2), -10))


@S('sfx_cerberus_growl', TELL, 1.2, syn='a synthesized triple-throat growl', fade=0.12)
def _():
    layers = [jitter_am(voice(1.1, f, [300 + 40 * i, 700 + 60 * i], vib=(5 + i, 3)), 26 + 4 * i, 0.6, seed=i) for i, f in enumerate((66, 79, 93))]
    g = shape(mix(*[gain(drive(l, 2.2), -2 * i) for i, l in enumerate(layers)]), [(0, 0), (0.2, 1), (0.8, 0.9), (1, 0)])
    return g


@S('sfx_cerberus_fire', REF, 1.1, syn='a synthesized fire-breath roar')
def _():
    roar = env(svf(noise(1.0, 'pink'), sweep(500, 2200, 0.4), 0.7, 'bp'), a=0.03, d=0.45)
    crk = svf(grains(0.9, 800, seed=4), 2500, 1.0, 'hp')
    return mix(gain(roar, 0), K('sci/thrusterFire_001', 0, 1.0, db=-3), gain(env(crk, a=0.05, d=0.4), -10), at(gain(bark(180, 0.18, 7), -8), 0.0))


@S('sfx_cerberus_ice', REF, 1.0, syn='a synthesized frost blast and crystal tinkle')
def _():
    blast = env(svf(noise(0.8), sweep(6000, 2500, 0.6), 1.0, 'hp'), a=0.01, d=0.3)
    tk = mix(*[at(gain(bell(0.3, f, d=0.08), -8), 0.05 + 0.06 * i) for i, f in enumerate((2637, 3520, 3136, 4186))])
    return mix(gain(blast, 0), tk, K('imp/impactGlass_medium_003', rate=0.9, db=-3), at(gain(bark(230, 0.16, 8), -10), 0.0))


@S('sfx_cerberus_poison', REF, 0.9, syn='a synthesized poison spit and bubbling')
def _():
    spit = env(svf(noise(0.15), 2000, 1.0, 'bp'), a=0.002, d=0.04)
    return mix(gain(spit, 0), K('sci/slime_000', db=-2), at(bubbles(0.6, 22, 200, 700, seed=5), 0.12), at(K('sci/slime_001', rate=0.8, db=-6), 0.2))


@S('sfx_cerberus_howl', HI, 1.8, syn='synthesized two-voice howls rising over a yelp', fade=0.2)
def _():
    yelp = env(voice(0.25, glide([(0, 500), (0.25, 300)]), [800, 1700]), a=0.003, d=0.08)
    h1 = shape(voice(1.5, glide([(0, 260), (0.4, 420), (1.2, 400), (1.5, 300)]), [600, 1100], vib=(5, 8), q=8), [(0, 0), (0.2, 1), (0.8, 0.8), (1, 0)])
    h2 = shape(voice(1.4, glide([(0, 300), (0.4, 500), (1.1, 470), (1.4, 340)]), [700, 1300], vib=(6, 9), q=8), [(0, 0), (0.25, 1), (0.8, 0.8), (1, 0)])
    return mix(gain(drive(yelp, 2), 0), at(gain(h1, -1), 0.25), at(gain(h2, -3), 0.32))


# ======================= Hades and the Titans =======================
@S('sfx_hades_toll', HI, 2.4, syn='a synthesized deep funeral bell toll', fade=0.4)
def _():
    b = bell(2.3, 110, ((1, 1, 1.0), (2.0, 0.6, 0.7), (2.4, 0.5, 0.6), (3.0, 0.35, 0.4), (4.2, 0.25, 0.3), (5.4, 0.15, 0.2)), d=1.2)
    return mix(gain(b, 0), K('imp/impactBell_heavy_003', rate=0.5, db=-6), gain(thump(1.0, 60, 40, 0.4), -6))


@S('sfx_hades_rise', HI, 1.8, syn='a synthesized earth-splitting rumble and chains snapping', fade=0.2)
def _():
    rum = shape(svf(noise(1.7, 'brown'), sweep(200, 500, 1.2), 0.7), [(0, 0), (0.3, 1), (0.8, 1), (1, 0)])
    crack = env(stone_grind(0.6, 1000, seed=31), a=0.005, d=0.2)
    return mix(gain(rum, 0), gain(thump(1.6, 48, 32, 0.6), -4), at(gain(crack, -3), 0.5), at(chain_rattle(0.6, 6, 3), 0.9),
               at(K('imp/impactMetal_heavy_003', rate=0.8, db=-3), 0.95), K('sci/lowFrequency_explosion_001', 0, 1.6, db=-8))


@S('sfx_hades_chains', MID, 0.8)
def _():
    return mix(chain_rattle(0.7, 9, 5), at(K('rpg/metalLatch', rate=0.8, db=-2), 0.5))


@S('sfx_hades_tick', LOW, 0.35, syn='a synthesized deep clock tick')
def _():
    t = env(svf(noise(0.03), 2200, 2.0, 'bp'), a=0.0005, d=0.006)
    return mix(K('ui/tick_002', rate=0.6, db=-2), gain(t, -4), gain(thump(0.12, 300, 200, 0.03), -10))


@S('sfx_hades_slow', TELL, 1.5, syn='a synthesized descending tape-slowdown warble', fade=0.2)
def _():
    w = mix(tone(1.4, sweep(660, 110, 1.4), 'tri', vib=(5, 20)), gain(tone(1.4, sweep(990, 165, 1.4), vib=(6, 15)), -6))
    w = shape(w, [(0, 0), (0.1, 1), (0.8, 0.8), (1, 0)])
    ticks = mix(*[at(K('ui/tick_002', rate=0.9 - 0.1 * i, db=-6 - i), 0.18 * i * (1 + 0.25 * i)) for i in range(5)])
    return mix(gain(w, -2), ticks)


@S('sfx_hades_shatter', REF, 1.0, syn='synthesized sand spilling from the broken hourglass')
def _():
    sand = shape(svf(grains(0.8, 14000, seed=8, dec=0.0008), 4000, 1.0, 'bp'), [(0, 0), (0.1, 1), (1, 0)])
    return mix(K('imp/impactGlass_heavy_002', rate=0.9), at(K('imp/impactGlass_light_002', rate=1.1, db=-5), 0.07), at(gain(sand, -6), 0.05))


@S('sfx_hades_tilt', TELL, 1.2, syn='a synthesized table-creak strain and a Titan grunt')
def _():
    grunt = shape(drive(voice(0.6, glide([(0, 85), (0.6, 100)]), [450, 950], vib=(5, 2)), 2), [(0, 0), (0.2, 1), (1, 0)])
    return mix(K('rpg/creak1', rate=0.7), at(K('rpg/creak3', rate=0.6, db=-2), 0.4), at(gain(grunt, -6), 0.1))


@S('sfx_hades_slide', MID, 1.0, syn='a synthesized plates-sliding scrape', fade=0.15)
def _():
    sc = shape(svf(noise(0.9, 'pink'), 1200, 1.4, 'bp'), [(0, 0), (0.2, 1), (0.8, 0.7), (1, 0)])
    return mix(gain(sc, 0), K('cas/card-slide-3', rate=0.6, db=-4), at(K('imp/impactPlate_light_003', rate=0.8, db=-6), 0.85))


@S('sfx_hades_flare', REF, 1.2, syn='a synthesized solar-flare whoosh and roar')
def _():
    w = whoosh(1.0, 300, 4000, q=1.0, pts=((0, 0), (0.6, 1), (1, 0)))
    roar = env(svf(noise(0.6, 'pink'), 900, 0.6), a=0.01, d=0.25)
    return mix(gain(w, 0), at(gain(roar, -2), 0.55), at(K('sci/thrusterFire_003', 0, 0.6, db=-4), 0.55), at(gain(thump(0.4, 120, 50, 0.1), -6), 0.6))


@S('sfx_hades_douse', MID, 0.7, syn='a synthesized fizzle and steam')
def _():
    fz = env(svf(noise(0.6), 5000, 0.8, 'hp'), a=0.005, d=0.2)
    return mix(K('imp/impactSoft_medium_003', rate=1.1), gain(fz, -3), K('sci/thrusterFire_004', 0, 0.3, af='highpass=f=2000', db=-8))


@S('sfx_hades_banish', HI, 1.8, syn='a synthesized downward vortex whoosh and sealing slam', fade=0.2)
def _():
    w = whoosh(1.2, 2500, 150, q=1.2, pts=((0, 0), (0.3, 1), (1, 0.2)))
    low = env(tone(1.2, sweep(220, 40, 1.2), 'saw'), a=0.05, r=0.2)
    return mix(gain(w, 0), gain(svf(low, 600, 0.8), -6), at(K('imp/impactMining_003', rate=0.55, db=-1), 1.15),
               at(gain(thump(0.6, 60, 30, 0.2), -2), 1.15), at(chain_rattle(0.4, 4, 9), 1.2))


@S('sfx_hades_shadow', MID, 1.2, syn='a synthesized creeping shadow whisper', fade=0.2)
def _():
    wh = shape(formant(noise(1.1, 'pink', seed=41), [700, 1500, 2800], q=8, amps=[1, 0.7, 0.4]), [(0, 0), (0.4, 1), (0.8, 0.8), (1, 0)])
    drone = env(tone(1.1, 55, 'saw'), a=0.3, r=0.3)
    return mix(gain(jitter_am(wh, 12, 0.7, seed=4), 0), gain(svf(drone, 300, 0.8), -10))


@S('sfx_hades_grab', REF, 0.9, syn='a synthesized inky snatch')
def _():
    w = whoosh(0.35, 1800, 400, q=1.0, pts=((0, 0), (0.3, 1), (1, 0)))
    return mix(K('sci/slime_001', rate=0.8), gain(w, -3), at(K('imp/impactSoft_medium_001', rate=0.8, db=-3), 0.2),
               at(K('rpg/cloth3', rate=0.8, db=-6), 0.25))


# ======================= Myth feet and Charybdis (core sfx, loaded at boot) =======================
@S('sfx_sirensong', LOW, 1.3, syn='a synthesized wordless siren phrase', fade=0.25)
def _():
    melody = glide([(0, 660), (0.25, 660), (0.32, 880), (0.6, 880), (0.68, 784), (0.95, 784), (1.02, 988), (1.3, 988)])
    v = voice(1.3, melody, [800, 1150, 2900], wave='saw', vib=(5.5, 10), q=9, amps=(1.0, 0.7, 0.3))
    v2 = voice(1.3, lambda t: melody(t) * 1.5, [800, 1150], wave='tri', vib=(5, 9), q=9)
    return shape(mix(gain(v, 0), gain(v2, -10)), [(0, 0), (0.08, 1), (0.85, 0.9), (1, 0)])


@S('sfx_harpy', TELL, 0.9, syn='a synthesized harpy screech and wing flaps')
def _():
    scr = voice(0.45, glide([(0, 1300), (0.1, 1800), (0.45, 1100)]), [1500, 2800, 4200], wave='saw', vib=(30, 60), q=6)
    scr = env(drive(scr, 2.5), a=0.01, d=0.18)
    flaps = mix(*[at(K('rpg/cloth%d' % (1 + i % 4), rate=1.2, db=-2 - i), 0.1 + 0.14 * i) for i in range(4)])
    return mix(gain(scr, 0), flaps)


@S('sfx_eyepoke', REF, 0.7, syn='a synthesized squelchy poke and a Cyclops yowl')
def _():
    yowl = env(voice(0.45, glide([(0, 240), (0.1, 330), (0.45, 180)]), [600, 1200], vib=(6, 8)), a=0.01, d=0.18)
    return mix(K('sci/slime_000', rate=1.4, db=-3), K('imp/impactPunch_medium_002', rate=1.1, db=-2), at(gain(drive(yowl, 2), -5), 0.06))


@S('sfx_whirlpool', TELL, 1.8, syn='a synthesized swirling whirlpool roar', fade=0.3)
def _():
    sw = am(svf(noise(1.7, 'pink'), sweep(300, 900, 1.7), 1.0, 'bp'), sweep(2, 7, 1.7), 0.6)
    gurg = bubbles(1.6, 40, 120, 500, seed=6)
    return mix(shape(gain(sw, 0), [(0, 0), (0.3, 1), (0.8, 1), (1, 0)]), gain(gurg, -6), K('sci/forceField_001', rate=0.5, db=-10))


@S('sfx_gulp', REF, 0.8, syn='a synthesized deep watery gulp')
def _():
    g = env(tone(0.3, sweep(260, 70, 0.3)), a=0.005, d=0.1)
    return mix(gain(g, 0), K('sci/slime_001', rate=0.6, db=-4), at(bubbles(0.4, 14, 100, 300, seed=2), 0.12), at(gain(thump(0.3, 70, 40, 0.1), -6), 0.2))
