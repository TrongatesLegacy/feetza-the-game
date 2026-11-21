"""Recipes for the Act 8 · Norse sounds (Fenrir's Paw, Thrym, Jörmungandr, Surtr and the Norse feet).
Same kit and level targets as scripts/boss-sfx/recipes.py: REF -10.5 (slap), HI -9.5 (signature hits),
TELL -11, MID -12, LOW -13.5 (mashable / repeated), BED -14.5."""
import math
import random

from dsp import (K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant,
                 am, jitter_am, bell, whoosh, thump, fx, n, SR)
from render import S

REF, HI, TELL, MID, LOW, BED = -10.5, -9.5, -11.0, -12.0, -13.5, -14.5


def voice(dur, f, vowels, wave='saw', vib=None, q=7):
    src = tone(dur, f, wave, vib=vib)
    return formant(src, vowels, q=q, amps=[1.0, 0.6, 0.35][:len(vowels)])


def tinkle(dur, count, lo=2500, hi=6000, seed=1):
    r = random.Random(seed)
    parts = []
    for _ in range(count):
        f = r.uniform(lo, hi)
        parts.append(at(gain(bell(0.35, f, d=0.12), r.uniform(-10, -2)), r.uniform(0, dur)))
    return mix(*parts)


def crackle(dur, dens, seed=1, hp=1500):
    return svf(grains(dur, dens, seed=seed, dec=0.0008), hp, 0.7, 'hp')


def fire(dur, seed=3, lo=500):
    """roaring flame: low rumbling noise with flicker and crackle."""
    roar = jitter_am(svf(noise(dur, 'pink', seed=seed), lo, 0.8), 18, 0.5, seed=seed + 1)
    return mix(gain(roar, 2), gain(crackle(dur, 260, seed=seed + 2), -6))


def howl(dur, f0, peak, end, seed=5, vib=(5.5, 6)):
    f = glide([(0, f0), (dur * 0.25, peak), (dur * 0.75, peak * 0.97), (dur, end)])
    v = voice(dur, f, [380, 900, 2500], wave='saw', vib=vib, q=9)
    breath = svf(noise(dur, 'pink', seed=seed), 1800, 1.2, 'bp')
    return shape(mix(drive(v, 1.6), gain(breath, -14)), [(0, 0), (0.12, 0.9), (0.7, 1), (1, 0)])


def chain_rattle(dur, links, seed=2, rate=1.0):
    r = random.Random(seed)
    parts = []
    for i in range(links):
        ref = r.choice(['rpg/metalClick', 'rpg/metalLatch', 'imp/impactMetal_light_001', 'imp/impactMetal_light_003'])
        parts.append(at(K(ref, rate=rate * r.uniform(0.9, 1.3), db=r.uniform(-12, -4)), r.uniform(0, dur)))
    return mix(*parts)


def splash(dur, f0=3000, f1=700, seed=4):
    sp = env(svf(noise(dur, 'pink', seed=seed), sweep(f0, f1, dur * 0.8), 0.7), a=0.003, d=dur / 3)
    return mix(gain(sp, 2), at(gain(bubbles(dur, 24, 400, 1500, seed=seed + 1), -6), 0.06))


def ice_crack(dur, seed=1):
    c = env(svf(grains(dur, 2200, seed=seed, dec=0.0006), 2500, 0.7, 'hp'), a=0.002, d=dur / 2.5)
    return c


# ======================= Fenrir's Paw =======================
@S('sfx_fenrir_strain', LOW, 0.7, syn='a synthesized chain creak')
def _():
    creak = svf(tone(0.6, glide([(0, 120), (0.5, 95)]), 'saw'), 900, 3.0, 'bp')
    creak = jitter_am(creak, 35, 0.8, seed=3)
    return mix(K('rpg/creak2', rate=0.8, db=-2), gain(env(creak, a=0.02, r=0.1), -6), chain_rattle(0.45, 4, seed=5, rate=0.9))


@S('sfx_fenrir_snap', HI, 1.0, syn='a synthesized magic snap shimmer')
def _():
    sh = env(tone(0.7, sweep(2400, 600, 0.6), 'tri'), a=0.002, d=0.2)
    return mix(K('imp/impactMetal_heavy_002', rate=1.1), at(K('imp/impactMetal_light_004', rate=1.5, db=-4), 0.02),
               chain_rattle(0.6, 7, seed=9, rate=1.1), at(gain(sh, -10), 0.01), gain(thump(0.3, 140, 60, 0.08), -4))


@S('sfx_fenrir_howl', HI, 2.4, syn='a synthesized wolf howl', fade=0.4)
def _():
    h = howl(2.3, 330, 620, 380)
    h2 = gain(howl(2.3, 335, 632, 390, seed=8, vib=(5.0, 5)), -6)
    return mix(h, at(h2, 0.05))


@S('sfx_fenrir_pounce', REF, 0.8, syn='a synthesized lunge whoosh and sub thump')
def _():
    return mix(at(gain(whoosh(0.28, 300, 1600, q=1.0), -5), 0.0), at(K('imp/impactPunch_heavy_002', rate=0.75), 0.22),
               at(K('imp/footstep_snow_003', rate=0.6, db=-3), 0.24), at(gain(thump(0.4, 90, 40, 0.12), -2), 0.22))


@S('sfx_fenrir_claw', MID, 0.6, syn='a synthesized swipe and frost crackle')
def _():
    swipe = whoosh(0.22, 1500, 4500, q=1.5)
    return mix(gain(swipe, -2), at(K('rpg/knifeSlice', rate=0.9, db=-3), 0.1), at(gain(ice_crack(0.35, seed=4), -6), 0.15))


@S('sfx_fenrir_link', MID, 0.6, syn='a synthesized rune chime')
def _():
    return mix(K('imp/impactMetal_light_002', rate=1.1), at(gain(bell(0.5, 1318, d=0.2), -8), 0.01))


@S('sfx_fenrir_bind', HI, 1.4, syn='a synthesized rising magic shimmer', fade=0.2)
def _():
    rise = env(tone(1.1, sweep(300, 1400, 1.0), 'tri', vib=(9, 12)), a=0.3, r=0.2)
    sp = tinkle(0.9, 10, seed=7)
    return mix(gain(rise, -8), at(sp, 0.3), chain_rattle(0.8, 9, seed=12, rate=0.9),
               at(K('imp/impactMetal_heavy_000', rate=0.9), 0.95), at(gain(bell(0.4, 880, d=0.25), -6), 0.95))


@S('sfx_fenrir_death', REF, 2.4, syn='a synthesized whimpering howl', fade=0.6)
def _():
    h = howl(2.2, 520, 560, 180, seed=21, vib=(7, 10))
    whim = env(voice(0.45, glide([(0, 900), (0.45, 600)]), [600, 1300], vib=(12, 30)), a=0.02, r=0.1)
    return mix(gain(whim, -2), at(shape(h, [(0, 0), (0.15, 1), (0.6, 0.6), (1, 0)]), 0.35))


# ======================= Thrym the Frost King =======================
@S('sfx_thrym_enter', HI, 2.4, syn='a synthesized glacier rumble and cracks', fade=0.4)
def _():
    d = 2.3
    rum = shape(mix(gain(svf(noise(d, 'brown', seed=1), 160, 0.7), 4), gain(am(tone(d, 42), 2.5, 0.6), -4)), [(0, 0), (0.3, 1), (0.8, 0.9), (1, 0)])
    cracks = mix(*[at(gain(ice_crack(0.3, seed=i), -2 - i), 0.2 + i * 0.35) for i in range(5)])
    return mix(rum, cracks, at(K('imp/impactGlass_heavy_001', rate=0.6, db=-3), 0.1), at(K('imp/impactGlass_heavy_003', rate=0.55, db=-5), 1.2))


@S('sfx_thrym_freeze', REF, 0.9, syn='a synthesized frost hiss and crystal set')
def _():
    hiss = env(svf(noise(0.5, 'white', seed=3), sweep(6000, 2500, 0.5), 1.2, 'hp'), a=0.05, d=0.2)
    return mix(gain(hiss, -6), at(K('imp/impactGlass_medium_001', rate=0.8), 0.25), at(gain(tinkle(0.4, 6, seed=3), -4), 0.25))


@S('sfx_thrym_thaw', REF, 0.8)
def _():
    return mix(K('imp/impactGlass_heavy_002', rate=1.1), at(K('imp/impactGlass_light_002', rate=1.3, db=-5), 0.05),
               at(gain(tinkle(0.5, 8, seed=6), -4), 0.05))


@S('sfx_thrym_block', TELL, 0.8, syn='a synthesized ice grind')
def _():
    grind = env(jitter_am(svf(noise(0.5, 'pink', seed=8), 700, 1.0, 'bp'), 30, 0.7, seed=8), a=0.08, r=0.1)
    return mix(gain(grind, -3), at(K('imp/impactGlass_medium_004', rate=0.7), 0.4), at(gain(thump(0.3, 120, 60, 0.08), -6), 0.4))


@S('sfx_thrym_crack', LOW, 0.4)
def _():
    return mix(K('imp/impactGlass_light_004', rate=0.85), gain(ice_crack(0.2, seed=13), -6))


@S('sfx_thrym_shatter', REF, 0.9)
def _():
    return mix(K('imp/impactGlass_heavy_000', rate=0.9), at(K('imp/impactGlass_medium_002', rate=1.2, db=-4), 0.04),
               at(gain(tinkle(0.6, 10, seed=14), -4), 0.08))


@S('sfx_thrym_close', HI, 1.6, syn='a synthesized icy boom', fade=0.4)
def _():
    boom = env(mix(gain(svf(noise(1.4, 'brown', seed=2), 200, 0.7), 4), gain(tone(1.4, sweep(70, 34, 1.2)), -2)), a=0.004, d=0.45)
    return mix(boom, K('imp/impactGlass_heavy_004', rate=0.6), at(K('imp/impactGlass_heavy_001', rate=0.5, db=-4), 0.06),
               at(gain(tinkle(1.0, 14, 1800, 5000, seed=17), -6), 0.15))


@S('sfx_thrym_keystone', MID, 0.5)
def _():
    return mix(K('imp/impactMining_002', rate=0.9), K('imp/impactGlass_medium_000', rate=0.8, db=-4))


@S('sfx_thrym_blizzard', TELL, 1.6, syn='a synthesized wind gust', fade=0.4)
def _():
    d = 1.5
    w = svf(noise(d, 'pink', seed=19), glide([(0, 500), (0.6, 1600), (d, 700)]), 2.5, 'bp')
    w2 = svf(noise(d, 'white', seed=20), glide([(0, 2500), (0.7, 4200), (d, 2000)]), 4.0, 'bp')
    return shape(mix(gain(w, 2), gain(w2, -8)), [(0, 0), (0.45, 1), (1, 0)])


@S('sfx_thrym_hail', MID, 0.8, syn='a synthesized falling whistle')
def _():
    wh = env(tone(0.55, sweep(2400, 900, 0.55), 'sin'), a=0.05, r=0.05)
    return mix(gain(wh, -8), gain(svf(noise(0.55, 'white', seed=21), sweep(5000, 2000, 0.55), 3, 'bp'), -12),
               at(K('imp/impactGlass_light_000', rate=0.9, db=-2), 0.55))


@S('sfx_thrym_spread', LOW, 1.0, syn='a synthesized creeping crackle')
def _():
    c = shape(svf(grains(0.9, 900, seed=22, dec=0.0007), 3000, 0.7, 'hp'), [(0, 0.2), (0.6, 1), (1, 0)])
    return mix(c, gain(tinkle(0.8, 5, seed=22), -8))


@S('sfx_thrym_death', HI, 2.6, syn='a synthesized collapse rumble', fade=0.6)
def _():
    d = 2.4
    rum = shape(svf(noise(d, 'brown', seed=30), 220, 0.7), [(0, 0.3), (0.2, 1), (1, 0)])
    sh = mix(*[at(K('imp/impactGlass_heavy_00%d' % (i % 5), rate=0.7 + 0.1 * (i % 3), db=-2 - i * 1.5), i * 0.18) for i in range(6)])
    return mix(gain(rum, 3), sh, at(gain(tinkle(1.6, 24, 1500, 6000, seed=31), -6), 0.3))


# ======================= Jörmungandr =======================
@S('sfx_jormungandr_enter', HI, 2.4, syn='a synthesized sea surge and roar', fade=0.5)
def _():
    d = 2.3
    surge = shape(svf(noise(d, 'pink', seed=40), glide([(0, 300), (1.2, 1400), (d, 500)]), 0.8), [(0, 0), (0.5, 1), (1, 0)])
    sub = shape(tone(d, sweep(36, 55, d)), [(0, 0), (0.5, 1), (1, 0)])
    return mix(gain(surge, 3), gain(sub, -3), at(splash(0.8, seed=41), 1.1))


@S('sfx_jormungandr_surface', TELL, 1.1, syn='a synthesized water surge')
def _():
    up = shape(svf(noise(0.9, 'pink', seed=42), sweep(400, 2200, 0.8), 0.9), [(0, 0), (0.7, 1), (1, 0)])
    return mix(gain(up, 2), at(splash(0.5, 3500, 1200, seed=43), 0.55), gain(bubbles(0.8, 20, 200, 700, seed=44), -6))


@S('sfx_jormungandr_hiss', TELL, 1.0, syn='a synthesized serpent hiss')
def _():
    h = svf(noise(0.9, 'white', seed=45), 5200, 1.4, 'bp')
    return shape(mix(h, gain(svf(noise(0.9, 'white', seed=46), 8000, 0.7, 'hp'), -6)), [(0, 0), (0.15, 1), (0.8, 0.9), (1, 0)])


@S('sfx_jormungandr_bite', REF, 0.6, syn='a synthesized snap')
def _():
    return mix(gain(whoosh(0.18, 600, 2500, q=1.2), -6), at(K('imp/impactWood_heavy_002', rate=1.2), 0.15),
               at(K('imp/impactPunch_medium_001', rate=0.8, db=-2), 0.16))


@S('sfx_jormungandr_reflect', REF, 0.6, syn='a synthesized springy boing')
def _():
    boing = env(tone(0.45, lambda t: 180 + 60 * math.sin(2 * math.pi * 14 * t) * math.exp(-t * 6)), a=0.002, d=0.14)
    return mix(K('imp/impactSoft_heavy_002', rate=1.1), K('cas/card-slide-3', rate=0.6, db=-6), gain(boing, -3),
               at(K('imp/impactGeneric_light_002', rate=0.8, db=-4), 0.01))


@S('sfx_jormungandr_constrict', MID, 1.2, syn='a synthesized squeeze creak')
def _():
    cr = jitter_am(svf(tone(1.1, glide([(0, 85), (1.1, 60)]), 'saw'), 600, 2.5, 'bp'), 25, 0.85, seed=47)
    return mix(gain(env(cr, a=0.1, r=0.2), -2), K('rpg/creak1', rate=0.6, db=-4), at(K('rpg/creak3', rate=0.55, db=-5), 0.5),
               K('cas/card-slide-1', rate=0.4, db=-8))


@S('sfx_jormungandr_venom', MID, 0.6, syn='a synthesized wet spit')
def _():
    sp = env(svf(noise(0.25, 'pink', seed=48), 2200, 1.5, 'bp'), a=0.003, d=0.06)
    return mix(gain(sp, 2), K('sci/slime_000', rate=1.3, db=-3), at(gain(bubbles(0.2, 6, 600, 1600, seed=49), -8), 0.04))


@S('sfx_jormungandr_dive', MID, 0.9)
def _():
    return mix(splash(0.7, 2500, 600, seed=50), K('imp/impactSoft_heavy_003', rate=0.7, db=-4))


@S('sfx_jormungandr_death', HI, 2.6, syn='a synthesized roar and huge splash', fade=0.6)
def _():
    d = 1.6
    f = glide([(0, 110), (0.3, 150), (d, 60)])
    roar = drive(voice(d, f, [500, 1100, 2400], vib=(6, 5)), 2.5)
    roar = jitter_am(roar, 40, 0.6, seed=51)
    return mix(shape(roar, [(0, 0), (0.1, 1), (0.7, 0.6), (1, 0)]), at(splash(1.0, seed=52), 1.0),
               at(K('imp/impactSoft_heavy_004', rate=0.6, db=-2), 1.0), at(gain(bubbles(1.2, 30, 150, 600, seed=53), -8), 1.2))


# ======================= Surtr =======================
@S('sfx_surtr_enter', HI, 2.4, syn='a synthesized fire giant roar and fire whoosh', fade=0.5)
def _():
    d = 1.7
    f = glide([(0, 70), (0.3, 105), (1.2, 95), (d, 55)])
    roar = jitter_am(drive(voice(d, f, [480, 1000, 2200], vib=(5, 4)), 3.0), 45, 0.6, seed=60)
    return mix(shape(roar, [(0, 0), (0.12, 1), (0.8, 0.8), (1, 0)]), gain(tone(d, lambda t: f(t) / 2), -8),
               at(shape(fire(1.6, seed=61), [(0, 0), (0.3, 1), (1, 0)]), 0.5), at(K('sci/thrusterFire_002', rate=0.7, db=-4), 0.4))


@S('sfx_surtr_fireball', MID, 0.8, syn='a synthesized fire whoosh')
def _():
    return mix(K('sci/thrusterFire_000', 0, 0.6, rate=0.9), gain(whoosh(0.5, 300, 1400, q=0.9), -4), gain(crackle(0.5, 200, seed=62), -10))


@S('sfx_surtr_impact', REF, 0.9)
def _():
    return mix(K('sci/explosionCrunch_001', rate=0.9), at(gain(fire(0.6, seed=63), -6), 0.05), K('imp/impactPunch_heavy_001', rate=0.7, db=-6))


@S('sfx_surtr_ignite', REF, 1.0, syn='a synthesized flame burst')
def _():
    burst = shape(fire(0.9, seed=64), [(0, 0), (0.08, 1), (0.6, 0.6), (1, 0)])
    return mix(gain(burst, 2), K('sci/thrusterFire_003', 0, 0.7, rate=0.8, db=-4), gain(whoosh(0.3, 200, 1200, q=0.8), -6))


@S('sfx_surtr_douse', MID, 0.8, syn='a synthesized steam hiss')
def _():
    h = env(svf(noise(0.7, 'white', seed=65), 3800, 1.0, 'bp'), a=0.005, d=0.22)
    return mix(gain(h, 1), K('imp/impactSoft_medium_002', rate=1.1, db=-5))


@S('sfx_surtr_fuse', LOW, 1.6, syn='a synthesized running fire', fade=0.2)
def _():
    run = mix(fire(1.5, seed=66, lo=900), gain(crackle(1.5, 500, seed=67, hp=2500), -4))
    return shape(run, [(0, 0), (0.1, 1), (0.85, 1), (1, 0)])


@S('sfx_surtr_raise', TELL, 1.8, syn='a synthesized rising riser and flame swell', fade=0.1)
def _():
    d = 1.65
    riser = mix(gain(tone(d, sweep(110, 660, d), 'saw'), -12), gain(svf(noise(d, 'pink', seed=68), sweep(300, 4000, d), 1.5, 'bp'), -2))
    return shape(mix(riser, gain(fire(d, seed=69), -8)), [(0, 0.1), (0.9, 1), (1, 0)])


@S('sfx_surtr_window', REF, 0.9, syn='a synthesized bright ting')
def _():
    return mix(gain(bell(0.8, 1760, d=0.3), -2), gain(bell(0.8, 2637, d=0.25), -6), K('imp/impactBell_heavy_002', rate=1.6, db=-6))


@S('sfx_surtr_sweep', HI, 1.4, syn='a synthesized flaming sweep', fade=0.3)
def _():
    sw = whoosh(1.1, 180, 2400, q=0.8, pts=((0, 0), (0.4, 1), (1, 0)))
    return mix(gain(sw, 3), at(shape(fire(1.2, seed=70), [(0, 0), (0.3, 1), (1, 0)]), 0.1), at(K('sci/explosionCrunch_003', rate=0.7, db=-4), 0.4))


@S('sfx_surtr_parry', HI, 1.4, syn='a synthesized clang ring and whoosh', fade=0.3)
def _():
    return mix(K('imp/impactMetal_heavy_003', rate=0.8), at(K('imp/impactBell_heavy_000', rate=0.9, db=-3), 0.01),
               at(gain(bell(1.2, 523, d=0.5), -8), 0.01), at(gain(whoosh(0.6, 2500, 300, q=0.9), -4), 0.1), gain(thump(0.5, 100, 40, 0.15), -2))


@S('sfx_surtr_roar', REF, 1.5, syn='a synthesized giant roar', fade=0.3)
def _():
    d = 1.4
    f = glide([(0, 80), (0.25, 118), (1.0, 100), (d, 60)])
    v = jitter_am(drive(voice(d, f, [520, 1050, 2300], vib=(6, 4)), 3.0), 45, 0.6, seed=71)
    return mix(shape(v, [(0, 0), (0.1, 1), (0.8, 0.8), (1, 0)]), gain(fire(d, seed=72), -10))


@S('sfx_surtr_death', HI, 2.8, syn='a synthesized collapse and dying fire', fade=0.8)
def _():
    d = 1.3
    f = glide([(0, 110), (0.4, 90), (d, 45)])
    groan = jitter_am(drive(voice(d, f, [450, 950], vib=(4, 6)), 2.0), 30, 0.5, seed=73)
    dying = shape(fire(1.6, seed=74), [(0, 1), (1, 0)])
    return mix(shape(groan, [(0, 0), (0.1, 1), (1, 0)]), at(K('sci/lowFrequency_explosion_001', rate=0.8, db=-2), 0.5),
               at(gain(dying, -4), 0.8), at(gain(svf(noise(1.0, 'white', seed=75), 3500, 1.0, 'bp'), -14), 1.4))


# ======================= Norse feet (core sounds, loaded at boot) =======================
@S('sfx_frostchill', LOW, 0.9, syn='a synthesized frost creep shimmer')
def _():
    return mix(gain(ice_crack(0.7, seed=80), -2), gain(tinkle(0.6, 6, 3000, 7000, seed=80), -6),
               gain(env(svf(noise(0.7, 'white', seed=81), 7000, 1.5, 'bp'), a=0.2, r=0.3), -14))


@S('sfx_trollstone', REF, 1.0, syn='a synthesized stone grind')
def _():
    g = env(jitter_am(svf(noise(0.8, 'brown', seed=82), 400, 0.9), 22, 0.8, seed=83), a=0.05, d=0.35)
    return mix(gain(g, 4), K('imp/impactMining_001', rate=0.7, db=-2), at(K('imp/impactMining_003', rate=0.6, db=-4), 0.35))


@S('sfx_draugrrise', TELL, 1.4, syn='a synthesized grave groan', fade=0.3)
def _():
    d = 1.2
    gr = jitter_am(voice(d, glide([(0, 95), (0.5, 120), (d, 85)]), [400, 800], vib=(3, 5)), 20, 0.6, seed=84)
    earth = mix(*[at(K('imp/footstep_grass_00%d' % (i % 5), rate=0.6, db=-6 - i), i * 0.12) for i in range(5)])
    return mix(shape(drive(gr, 1.5), [(0, 0), (0.3, 1), (1, 0)]), earth)


@S('sfx_valkyrieswoop', MID, 1.0, syn='a synthesized wing beat swoop and shriek')
def _():
    flaps = mix(*[at(K('rpg/cloth%d' % (1 + i % 4), rate=1.1, db=-3 - i), i * 0.11) for i in range(4)])
    shriek = env(voice(0.4, glide([(0, 1100), (0.15, 1500), (0.4, 1200)]), [1200, 2800], vib=(8, 30)), a=0.02, r=0.12)
    return mix(flaps, at(gain(whoosh(0.5, 400, 2500, q=1.1), -4), 0.2), at(gain(shriek, -8), 0.3))


@S('sfx_sungap', TELL, 1.8, syn='a synthesized choir-like shimmer', fade=0.4)
def _():
    d = 1.7
    chord = mix(*[gain(voice(d, f0, [700, 1150], wave='saw', vib=(5, 3), q=10), -4) for f0 in (262, 330, 392, 523)])
    return mix(shape(chord, [(0, 0), (0.35, 1), (0.8, 0.8), (1, 0)]), at(gain(tinkle(1.0, 8, 2500, 6000, seed=90), -8), 0.3))
