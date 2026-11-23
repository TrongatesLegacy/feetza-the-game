"""Kronos the Titan King's reworked fight in Tartarus, sound effects: the titan hauling on his chains, the crumbling walls
and falling boulders, the chains' red-hot weak links, his golden time-forcefield, the swinging chain blades and his stone
head rising over the table. Same kit, levels and house sound as the Kronos set in recipes.py (whose shared voices it
reuses); build.py renders both.

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR titanking_strain titanking_crumble ...   (or any key substrings)
  python3 -I integrate_titanfight.py OUTDIR REPO"""
import random

from recipes import COMP, HI, LOW, MID, REF, TELL, UH_VOWEL, chains, glass, grind, grunt, roar, rumble, sand, stone, where
from dsp import K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, svf, formant, jitter_am, bell, whoosh, thump, fx  # noqa: F401
from render import S


# ======================= shared voices =======================

def creak(dur, f0, f1, seed=80, q=6.0):
    """iron under strain: a slow, resonant metallic groan with a rough stick-slip flutter."""
    src = mix(svf(noise(dur, 'pink', seed=seed), sweep(f0 * 3, f1 * 3, dur), q, 'bp'),
              gain(svf(tone(dur, sweep(f0, f1, dur), 'saw', vib=(4, f0 * 0.03)), f0 * 4, 3.0, 'bp'), -6))
    return shape(jitter_am(src, 26, 0.75, seed=seed), [(0, 0), (0.25, 1), (0.8, 0.8), (1, 0)])


def gravel(dur, seed=81, fc=2400, density=2500, pts=((0, 0), (0.1, 1), (1, 0))):
    """loose stones and grit pouring: gritty grains, low-passed."""
    return shape(svf(grains(dur, density, seed=seed, dec=0.0014), fc, 0.6, 'lp'), list(pts))


def tumble(dur, count, seed=82, rate=1.0, db=0.0):
    """small rocks bouncing away: scattered pitched-up mining hits."""
    r = random.Random(seed)
    return mix(*[at(K('imp/impactMining_00%d' % r.randrange(5), rate=rate * r.uniform(1.2, 1.9), db=db + r.uniform(-16, -6)),
                    r.uniform(0, dur * 0.85)) for _ in range(count)])


def crack(seed=83, fc=2600, d=0.012):
    """a sharp stone crack: a bright noise snap."""
    return env(svf(noise(0.08, 'white', seed=seed), fc, 1.1, 'bp'), a=0.0004, d=d, r=0.01)


def hum(dur, root=196.0, seed=84, pts=((0, 0), (0.6, 1), (0.9, 0.9), (1, 0))):
    """a golden time-forcefield: a detuned major hum with a slow shimmer."""
    parts = []
    for i, m in enumerate((1, 1.5, 2, 2.52, 3)):
        for dt in (-0.4, 0.4):
            parts.append(gain(tone(dur, root * m * (1 + dt / 100), 'sin', vib=(5 + i, 1.5)), -3 * i))
    sh = svf(grains(dur, 500, seed=seed, dec=0.0007), 7000, 0.7, 'hp')
    return shape(mix(*parts, gain(sh, -10)), list(pts))


def sizzle(dur, seed=85):
    """red-hot iron hissing: crackly bright noise."""
    h = svf(noise(dur, 'white', seed=seed), 4500, 0.7, 'hp')
    c = svf(grains(dur, 1500, seed=seed + 1, dec=0.0004), 3500, 0.7, 'hp')
    return shape(mix(jitter_am(h, 60, 0.6, seed=seed), gain(c, -2)), [(0, 0), (0.05, 1), (0.4, 0.5), (1, 0)])


def scrape(dur, seed=86, f=1100):
    """metal dragging on stone: a juddering resonant screech band over a grit grind."""
    r = random.Random(seed)
    band = svf(noise(dur, 'pink', seed=seed), glide([(0, f), (dur * 0.3, f * 1.2), (dur * 0.7, f * 0.85), (dur, f * 0.7)]), 5.0, 'bp')
    ring = mix(*[gain(svf(noise(dur, 'white', seed=seed + k), f * m, 30.0, 'bp'), -6) for k, m in enumerate((1.37, 2.11, 3.03))])
    sparks = svf(grains(dur, 260, seed=seed + 5, dec=0.0006), 6500, 0.7, 'hp')
    x = mix(jitter_am(band, 35, 0.8, seed=seed), jitter_am(ring, 22, 0.6, seed=seed + 1), gain(sparks, -2))
    return mix(x, gain(grind(dur, seed + 7, 200), -2), *[at(gain(stone(0.3, 90 + k, 900), -10 + r.uniform(-3, 0)), r.uniform(0.1, dur - 0.4))
                                                         for k in range(5)])


# ======================= the chains =======================
where('sfx_titanking_strain', 'Kronos hauls on his chains: iron chains creaking taut and a low straining titan grunt (repeats while he pulls)')


@S('sfx_titanking_strain', TELL, 1.4, syn='a synthesized iron chain groan and a low straining grunt', fade=0.25)
def _():
    g = svf(grunt(1.1, 52, 46, seed=100, rasp=0.5), 1400, 0.7)
    c = creak(1.3, 70, 95, seed=101)
    return svf(mix(gain(c, 0), at(gain(g, -4), 0.08), K('rpg/creak1', rate=0.45, db=-6), at(gain(chains(1.0, 6, seed=102, rate=0.6), -10), 0.1),
                   gain(rumble(1.3, 40, seed=103, pts=((0, 0), (0.4, 1), (1, 0))), -10)), 3200, 0.7)


where('sfx_titanking_weakhit', 'a smack on a chain\'s red-hot weak link: a hot iron clang with a sizzle')


@S('sfx_titanking_weakhit', REF, 0.5, syn='a synthesized iron clang ring and a hot sizzle')
def _():
    return mix(K('imp/impactMetal_medium_000', rate=0.9), K('imp/impactMetal_heavy_002', rate=1.2, db=-6), gain(bell(0.45, 740, d=0.12), -10),
               at(gain(sizzle(0.42, 104), -8), 0.01))


where('sfx_titanking_weakbreak', 'the weak link shatters and the chain snaps: a big metal crack, links whipping away and a rattle')


@S('sfx_titanking_weakbreak', HI, 1.6, syn='a synthesized metal snap, a whip-away whoosh, a ring and a hiss', fade=0.3)
def _():
    whip = whoosh(0.35, 600, 3000, q=1.4, pts=((0, 0.2), (0.3, 1), (1, 0)))
    return mix(K('imp/impactMetal_heavy_003', rate=0.9), K('sci/impactMetal_002', rate=0.8, db=-4), gain(crack(105, 3200, 0.01), 2),
               gain(bell(1.0, 410, d=0.3), -12), at(gain(whip, -6), 0.04), at(gain(chains(1.1, 18, seed=106, rate=1.0), -1), 0.06),
               at(gain(chains(0.8, 8, seed=107, rate=0.7), -6), 0.5), at(gain(sizzle(0.5, 108), -14), 0.02))


where('sfx_titanking_rip', 'Kronos rips a chain out of the wall: tearing rock, a titan roar and a massive chain rattle (tell)')


@S('sfx_titanking_rip', HI, 1.6, syn='a synthesized rock tear, titan roar and chain rattle', fade=0.3)
def _():
    tear = mix(*[at(gain(stone(0.4, 110 + i, 600 + 250 * i), -2 - i), i * 0.07) for i in range(4)])
    r = roar(1.3, 55, 98, 46, vowel=(420, 820, 2100), k=3.8, seed=115)
    return fx(mix(K('imp/impactMining_001', rate=0.55), K('sci/explosionCrunch_002', rate=0.6, db=-6), tear, at(gain(r, -3), 0.12),
                  at(gain(chains(1.3, 22, seed=116, rate=0.65), -2), 0.05), gain(rumble(1.5, 38, seed=117), -6),
                  at(gain(gravel(1.0, 118), -8), 0.1)), COMP)


where('sfx_titanking_scrape', 'the ripped chain scrapes along the table: grinding metal on stone, sparks and crunching')


@S('sfx_titanking_scrape', HI, 2.4, syn='a synthesized metal-on-stone screech, sparks and grit', fade=0.4)
def _():
    s = scrape(2.3, seed=120, f=900)
    s = shape(s, [(0, 0.5), (0.04, 1), (0.85, 0.9), (1, 0)])
    return mix(K('imp/impactMetal_heavy_000', rate=0.6, db=-2), s, gain(chains(2.0, 14, seed=127, rate=0.6), -8),
               gain(rumble(2.3, 45, seed=128, pts=((0, 0.5), (0.2, 1), (1, 0))), -8))


where('sfx_titanking_unchained', 'TITAN UNCHAINED: an enormous roar, broken chains rattling and a rumble')


@S('sfx_titanking_unchained', HI, 2.6, syn='a synthesized three-voice titan roar, bursting chains and a rumble', fade=0.4)
def _():
    r1 = roar(2.2, 44, 80, 36, vowel=(380, 760, 2000), k=4.2, seed=130)
    r2 = roar(2.0, 88, 150, 70, vowel=(500, 980, 2400), k=4.0, seed=131)
    r3 = roar(1.6, 60, 120, 50, vowel=UH_VOWEL, k=3.4, seed=132)
    burst = mix(K('imp/impactMetal_heavy_004', rate=0.6), K('imp/impactMetal_heavy_001', rate=0.8, db=-4), gain(crack(133, 2800, 0.015), 0))
    return fx(mix(burst, K('sci/lowFrequency_explosion_000', rate=0.6, db=-3), at(gain(r1, 0), 0.06), at(gain(r2, -8), 0.1),
                  at(gain(r3, -7), 0.3), at(gain(chains(1.8, 26, seed=134, rate=0.75), -2), 0.03),
                  at(gain(chains(1.2, 12, seed=135, rate=0.55), -6), 0.9), gain(rumble(2.5, 34, seed=136), -2),
                  at(gain(gravel(1.6, 137), -10), 0.2)), COMP)


where('sfx_titanking_swing', 'a broken chain with a blade on its end swings down: a heavy whoosh with a chain rattle (tell)')


@S('sfx_titanking_swing', TELL, 1.3, syn='a synthesized heavy swing whoosh and chain rattle', fade=0.25)
def _():
    w = whoosh(1.1, 180, 1400, q=1.3, pts=((0, 0.25), (0.6, 1), (0.8, 0.6), (1, 0)))
    w2 = whoosh(0.9, 90, 500, q=1.0, color='brown', pts=((0, 0.2), (0.65, 1), (1, 0)))
    return mix(gain(chains(0.4, 6, seed=140, rate=0.8), -4), at(w, 0.05), at(gain(w2, -2), 0.12),
               at(gain(chains(0.9, 14, seed=141, rate=0.7), -4), 0.25), at(gain(bell(0.5, 520, d=0.15), -18), 0.7))


where('sfx_titanking_bladehit', 'a smack on the chain\'s blade: a ringing iron clang')


@S('sfx_titanking_bladehit', REF, 0.5, syn='a synthesized ringing blade overtone')
def _():
    ring = mix(gain(bell(0.48, 980, d=0.16), 0), gain(bell(0.48, 1517, d=0.1), -6))
    return mix(K('imp/impactMetal_heavy_002', rate=1.05), K('imp/impactPlate_medium_001', db=-6), gain(ring, -8), K('rpg/metalClick', db=-10, rate=0.8))


# ======================= the walls and the boulders =======================
where('sfx_titanking_crumble', 'the walls of Tartarus crumble: a deep rumble, stones cracking and gravel pouring (repeats)')


@S('sfx_titanking_crumble', MID, 2.0, syn='a synthesized rumble, stone cracks and pouring gravel', fade=0.4)
def _():
    cracks = mix(*[at(gain(stone(0.4, 150 + i, 500 + 180 * i), -3 - 2 * i), t) for i, t in enumerate((0.0, 0.22, 0.5, 0.85))])
    return mix(K('imp/impactMining_003', rate=0.5, db=-2), cracks, gain(rumble(2.0, 38, seed=155, pts=((0, 0.6), (0.2, 1), (1, 0))), 0),
               at(gain(gravel(1.7, 156, 2200, 3000), -6), 0.1), at(tumble(1.2, 6, seed=157, db=-4), 0.4))


where('sfx_titanking_rockcrack', 'a boulder cracks loose from the roof: a sharp stone crack and grind (tell before it falls)')


@S('sfx_titanking_rockcrack', TELL, 0.8, syn='a synthesized stone snap, grind and trickle of grit', fade=0.15)
def _():
    return mix(gain(crack(160, 2400, 0.012), 0), K('imp/impactMining_004', rate=0.85), K('imp/impactPlank_medium_002', rate=0.5, db=-8),
               at(gain(grind(0.55, 161, 260), -4), 0.05), at(gain(gravel(0.6, 162, 3000, 1400), -10), 0.08))


where('sfx_titanking_rockfall', 'the boulder falls: a descending whoosh with tumbling grit')


@S('sfx_titanking_rockfall', MID, 1.6, syn='a synthesized falling whoosh and tumbling grit', fade=0.2)
def _():
    w = whoosh(1.4, 1600, 220, q=1.1, pts=((0, 0.3), (0.75, 1), (1, 0)))
    w2 = whoosh(1.4, 400, 90, q=0.9, color='brown', pts=((0, 0.2), (0.8, 1), (1, 0)))
    return mix(gain(w, 0), gain(w2, -2), gain(gravel(1.3, 170, 3000, 1800, ((0, 0.6), (0.3, 1), (1, 0))), -6),
               gain(tumble(1.1, 5, seed=171, rate=0.9), -6), K('imp/impactMining_002', rate=1.3, db=-10))


where('sfx_titanking_rocksmash', 'a falling boulder is smashed apart in the air by a smack: a stone burst and scattering debris')


@S('sfx_titanking_rocksmash', HI, 0.9, syn='a synthesized stone burst and scattering debris', fade=0.2)
def _():
    return mix(K('imp/impactMining_002', rate=0.8), K('sci/explosionCrunch_000', rate=0.85, db=-4), gain(crack(180, 1800, 0.02), -2),
               gain(thump(0.3, 150, 60, 0.07), -4), gain(stone(0.5, 181, 1400), -4), at(tumble(0.7, 9, seed=182, rate=1.1, db=0), 0.05),
               at(gain(gravel(0.6, 183, 4000, 2500), -8), 0.03))


where('sfx_titanking_rockland', 'a boulder lands on a pizza: a heavy stone thud and crunch')


@S('sfx_titanking_rockland', HI, 1.0, syn='a synthesized heavy thud, stone and crust crunch', fade=0.25)
def _():
    crust = shape(svf(grains(0.3, 2600, seed=190, dec=0.001), 1800, 0.7, 'hp'), [(0, 1), (1, 0)])
    return mix(gain(thump(0.6, 95, 28, 0.2), 0), K('imp/impactPunch_heavy_000', rate=0.6), K('imp/impactMining_003', rate=0.7, db=-2),
               gain(stone(0.4, 191, 800), -4), at(gain(crust, -4), 0.01), at(gain(rumble(0.9, 42, seed=192), -8), 0.02),
               at(tumble(0.5, 4, seed=193, db=-4), 0.12))


# ======================= the golden time-forcefield =======================
where('sfx_titanking_shieldup', 'Kronos raises his golden time-forcefield: a shimmering hum swelling with a clock-like chime (tell)')


@S('sfx_titanking_shieldup', TELL, 1.4, syn='a synthesized golden hum swell, shimmer and clock chime', fade=0.3)
def _():
    h = hum(1.35, 196.0, seed=200)
    rise = whoosh(0.9, 800, 5000, q=2.0, color='white', pts=((0, 0), (0.85, 1), (1, 0)))
    chime = mix(gain(bell(0.6, 1568, d=0.2), 0), at(gain(bell(0.5, 1046, d=0.2), -3), 0.12))
    return mix(K('sci/forceField_001', rate=0.7, db=-8), gain(h, 0), gain(rise, -16), at(K('ui/tick_001', rate=0.6, db=-8), 0.55),
               at(K('ui/tick_002', rate=0.6, db=-8), 0.72), at(gain(chime, -6), 0.85))


where('sfx_titanking_pierce', 'a blade drives through the forcefield: a glassy energy shatter and an iron stab')


@S('sfx_titanking_pierce', HI, 1.2, syn='a synthesized energy crackle, glass shards and a falling hum', fade=0.25)
def _():
    fall = shape(tone(0.9, sweep(784, 196, 0.9), 'sin', vib=(9, 8)), [(0, 1), (1, 0)])
    zap = shape(svf(grains(0.5, 3000, seed=210, dec=0.0005), sweep(5000, 1500, 0.5), 0.9, 'bp'), [(0, 1), (1, 0)])
    return mix(K('imp/impactMetal_heavy_000', rate=1.1), glass(0.9, 211, 1.1), K('sci/forceField_003', rate=1.2, db=-6),
               gain(zap, -6), gain(fall, -12), gain(thump(0.3, 130, 50, 0.08), -6))


where('sfx_titanking_shielddown', 'the forcefield collapses: a falling sparkle and a power-down')


@S('sfx_titanking_shielddown', MID, 1.0, syn='a synthesized falling chime sparkle and power-down sweep', fade=0.2)
def _():
    sparkle = mix(*[at(gain(bell(0.35, f, d=0.1), -2 - i), i * 0.07) for i, f in enumerate((2093, 1568, 1319, 1046, 784, 587))])
    down = shape(drive(tone(0.9, sweep(520, 55, 0.9), 'saw', vib=(6, 6)), 1.5), [(0, 1), (1, 0)])
    return mix(gain(svf(down, 1400, 0.8), -2), gain(sparkle, -4), K('sci/forceField_002', rate=0.6, db=-8),
               gain(svf(grains(0.8, 400, seed=220, dec=0.0006), 6000, 0.7, 'hp'), -12))


# ======================= the stone head =======================
where('sfx_titanking_rise', 'Kronos\'s giant stone head rises from behind the table: grinding stone, a rumble and a low growl (tell)')


@S('sfx_titanking_rise', TELL, 1.8, syn='a synthesized rising stone grind, rumble and low growl', fade=0.3)
def _():
    g = grind(1.6, 230, 150)
    g2 = shape(svf(noise(1.6, 'pink', seed=231), sweep(250, 600, 1.6), 2.0, 'bp'), [(0, 0.3), (0.3, 1), (1, 0)])
    growl = svf(grunt(1.1, 42, 50, seed=232, rasp=0.7), 1200, 0.7)
    return mix(K('imp/impactMining_000', rate=0.5, db=-4), gain(g, 0), gain(jitter_am(g2, 15, 0.6, seed=233), -4),
               gain(rumble(1.7, 36, seed=234, pts=((0, 0.4), (0.3, 1), (1, 0))), -2), at(gain(growl, -4), 0.5),
               at(gain(gravel(1.2, 235, 2000, 1500), -12), 0.2))


where('sfx_titanking_headchew', 'the stone head chews a pizza: a grinding stone crunch with crust crackle (repeats while it eats)')


@S('sfx_titanking_headchew', LOW, 0.7, syn='a synthesized stone grind and crust crackle', fade=0.12)
def _():
    crunch = shape(svf(grains(0.3, 2400, seed=240, dec=0.001), 1700, 0.7, 'hp'), [(0, 0.3), (0.2, 1), (1, 0)])
    g = shape(grind(0.5, 241, 140), [(0, 0.3), (0.2, 1), (0.7, 0.7), (1, 0)])
    x = mix(gain(g, 0), at(gain(crunch, -4), 0.04), at(K('imp/impactWood_medium_001', db=-10, rate=0.6), 0.05),
            at(gain(thump(0.25, 90, 50, 0.07), -8), 0.03))
    return env(x, a=0.02, r=0.01)  # a soft attack: it repeats every ~0.55 s


where('sfx_titanking_sink', 'the beaten stone head sinks away: a descending grinding rumble')


@S('sfx_titanking_sink', MID, 1.4, syn='a synthesized falling stone grind and rumble', fade=0.3)
def _():
    g = shape(svf(noise(1.3, 'pink', seed=250), sweep(600, 160, 1.3), 2.0, 'bp'), [(0, 0.5), (0.15, 1), (1, 0)])
    return mix(gain(grind(1.2, 251, 120), -2), gain(jitter_am(g, 15, 0.6, seed=252), -2), K('imp/impactMining_001', rate=0.5, db=-6),
               gain(rumble(1.35, 32, seed=253, pts=((0, 0.6), (0.2, 1), (1, 0))), 0),
               at(gain(gravel(0.9, 254, 1800, 1200), -12), 0.2))


where('sfx_titanking_gulp', 'Kronos swallows a mouthful of pizza: a deep cavernous gulp')


@S('sfx_titanking_gulp', HI, 1.0, syn='a synthesized deep throat gulp with a cavern echo', fade=0.25)
def _():
    gl = env(formant(tone(0.35, glide([(0, 140), (0.08, 210), (0.35, 70)]), 'saw'), [300, 700, 1800], q=5, amps=[1.0, 0.5, 0.15]),
             a=0.004, d=0.12, r=0.05)
    blob = env(tone(0.3, sweep(260, 60, 0.25), 'sin'), a=0.002, d=0.09, r=0.04)
    dry = mix(K('imp/impactSoft_heavy_001', rate=0.55), gain(drive(gl, 1.8), -2), gain(blob, 0), gain(thump(0.45, 80, 30, 0.15), -2),
              at(gain(svf(noise(0.12, 'pink', seed=260), 500, 1.0, 'bp'), -14), 0.18))
    return fx(dry, 'aecho=0.8:0.6:90|170:0.35|0.2,lowpass=f=4000')
