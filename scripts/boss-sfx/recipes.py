"""Recipes for every Feetza boss-move SFX.  Levels are the 50 ms RMS peak target after TRIM:
REF -10.5 (slap), HI -9.5 (signature hits), TELL -11, MID -12, LOW -13.5 (mashable / repeated), BED -14.5."""
from dsp import (K, mix, at, env, shape, drive, gain, tone, sweep, glide, noise, grains, bubbles, svf, formant,
                 am, jitter_am, bell, whoosh, thump, fx, resample, norm)
from render import S

REF, HI, TELL, MID, LOW, BED = -10.5, -9.5, -11.0, -12.0, -13.5, -14.5


def steps(refs, gap, rate=1.0, db=0.0, fall=0.0):
    return mix(*[at(K(r, rate=rate, db=db - fall * i), i * gap) for i, r in enumerate(refs)])


def voice(dur, f, vowels, wave='saw', vib=None, q=7):
    """crude vocal: saw through 2-3 formant band-passes."""
    src = tone(dur, f, wave, vib=vib)
    return formant(src, vowels, q=q, amps=[1.0, 0.6, 0.35][:len(vowels)])


# ======================= shared kit =======================
@S('sfx_kit_prophit', MID, 0.3, syn='a short synthesized knock')
def _():
    return mix(K('imp/impactWood_light_000', rate=1.15), K('imp/impactPlate_light_000', db=-9, rate=1.3),
               gain(thump(0.12, 260, 160, 0.03), -6))


@S('sfx_kit_propclear', REF, 0.7, syn='a synthesized two-note sparkle')
def _():
    c1 = bell(0.5, 1046, d=0.25)
    c2 = bell(0.6, 1568, d=0.3)
    return mix(K('imp/impactPlate_light_002', rate=1.2, db=-2), at(gain(c1, -6), 0.0), at(gain(c2, -5), 0.08),
               gain(env(noise(0.08), a=0.001, d=0.02), -14))


@S('sfx_kit_shieldup', TELL, 0.9, syn='a synthesized rising hum')
def _():
    hum = env(tone(0.6, sweep(220, 660, 0.45), 'tri'), a=0.08, r=0.2)
    return mix(K('sci/forceField_001'), gain(hum, -10))


@S('sfx_kit_shieldblock', MID, 0.35, syn='a synthesized bubble thunk')
def _():
    return mix(K('sci/forceField_003', 0, 0.3, rate=1.4, db=-2), gain(thump(0.2, 240, 130, 0.05), -3),
               K('imp/impactSoft_medium_000', rate=1.3, db=-6))


@S('sfx_kit_shielddown', MID, 0.5, syn=None)
def _():
    return mix(K('dgt/phaserDown2', rate=1.2, db=-2), K('ui/drop_002', db=-4))


@S('sfx_kit_lane', MID, 0.6, syn='a synthesized low thump and air swell')
def _():
    sw = whoosh(0.45, 300, 1200, q=1.0)
    return mix(gain(thump(0.5, 110, 55, 0.12), -2), K('imp/impactSoft_heavy_000', db=-5), at(gain(sw, -10), 0.0))


@S('sfx_kit_retreat', MID, 0.7, syn='a synthesized cartoon zip')
def _():
    pat = steps(['rpg/footstep00', 'rpg/footstep02', 'rpg/footstep04', 'rpg/footstep06', 'rpg/footstep08', 'rpg/footstep01'],
                0.06, rate=1.7, fall=2.0)
    zip_ = env(tone(0.25, sweep(400, 1500, 0.25), 'tri'), a=0.005, r=0.08)
    return mix(pat, at(gain(zip_, -12), 0.05))


# ======================= Head Waiter =======================
@S('sfx_headwaiter_traytoss', TELL, 0.7, syn='a synthesized spinning whirr')
def _():
    whirr = am(svf(noise(0.65, 'pink'), 1800, 2.0, 'bp'), 14, 0.85)
    whirr = shape(whirr, [(0, 0), (0.15, 1), (0.7, 0.7), (1, 0)])
    return mix(K('imp/impactTin_medium_000', rate=1.3, db=-3), at(gain(whirr, 2), 0.02))


@S('sfx_headwaiter_traybat', REF, 0.6)
def _():
    return mix(K('imp/impactMetal_light_002', rate=1.2), K('imp/impactBell_heavy_001', rate=1.8, db=-8))


@S('sfx_headwaiter_trayclang', REF, 0.9)
def _():
    return mix(K('imp/impactTin_medium_002'), at(K('imp/impactMetal_medium_001', db=-3), 0.012),
               at(K('imp/impactPlate_heavy_000', db=-5), 0.03), at(K('imp/impactTin_medium_004', rate=1.25, db=-8), 0.16))


@S('sfx_headwaiter_service', TELL, 1.0, syn='a synthesized desk-bell double ding')
def _():
    p = ((1, 1, 1.0), (2.4, 0.45, 0.6), (3.9, 0.3, 0.4), (6.1, 0.12, 0.25))
    d1 = bell(0.9, 1480, p, d=0.35)
    d2 = bell(0.8, 1480, p, d=0.35)
    strike = K('imp/impactMetal_light_000', rate=1.8, db=-10)
    return mix(d1, strike, at(gain(d2, -1), 0.17), at(strike, 0.17))


# ======================= Bigfoot =======================
@S('sfx_bigfoot_ring', MID, 0.35, syn='a synthesized rising blip')
def _():
    b = env(tone(0.28, sweep(330, 660, 0.22), 'tri'), a=0.004, r=0.08)
    return mix(b, gain(env(tone(0.05, 1320), a=0.001, d=0.015), -8))


@S('sfx_bigfoot_ringok', TELL, 0.45, syn='a synthesized bright chime')
def _():
    return mix(gain(bell(0.4, 1320, d=0.18), -2), at(gain(bell(0.4, 1980, d=0.16), -4), 0.03),
               K('imp/impactWood_light_002', db=-6))


@S('sfx_bigfoot_bigstep', HI, 1.0, syn='a synthesized sub-bass thud and rumble')
def _():
    sub = thump(0.8, 75, 34, 0.22)
    rum = env(svf(noise(0.8, 'brown'), 260, 0.7), a=0.004, d=0.25)
    return mix(gain(sub, 0), gain(rum, -4), K('imp/impactWood_heavy_001', rate=0.6, db=-3),
               K('sci/lowFrequency_explosion_001', 0, 0.7, db=-8))


@S('sfx_bigfoot_trapbuild', LOW, 0.35)
def _():
    return mix(K('rpg/metalClick', rate=1.1), at(K('rpg/metalLatch', rate=1.25, db=-4), 0.05))


@S('sfx_bigfoot_trapsnap', HI, 0.7, syn='a synthesized snap transient')
def _():
    snap = env(svf(noise(0.04), 2500, 0.8, 'hp'), a=0.0005, d=0.008)
    return mix(gain(snap, 0), K('rpg/metalLatch', rate=0.8), at(K('imp/impactMetal_heavy_002', rate=1.3, db=-2), 0.005),
               at(K('imp/impactMetal_light_004', rate=0.9, db=-8), 0.09))


@S('sfx_bigfoot_pound', HI, 1.1, syn='a synthesized sub thump and debris rumble')
def _():
    rum = env(svf(noise(1.0, 'brown'), 400, 0.7), a=0.002, d=0.35)
    return mix(K('imp/impactMining_000', rate=0.7), K('imp/impactPlank_medium_001', rate=0.7, db=-3),
               gain(thump(0.7, 62, 30, 0.2), -1), gain(rum, -5), at(K('imp/impactWood_light_003', rate=0.8, db=-10), 0.18),
               at(K('imp/impactWood_light_001', rate=0.9, db=-12), 0.3))


@S('sfx_bigfoot_rampage', REF, 1.3, syn='synthesized double thuds and a low growl')
def _():
    growl = voice(1.0, glide([(0, 70), (0.5, 84), (1.0, 62)]), [380, 820], vib=(5, 3))
    growl = shape(jitter_am(growl, 28, 0.5), [(0, 0), (0.2, 1), (0.8, 0.8), (1, 0)])
    t1 = mix(gain(thump(0.45, 70, 36, 0.12), 0), K('imp/impactWood_heavy_000', rate=0.65, db=-5))
    return mix(t1, at(gain(t1, -2), 0.28), at(gain(drive(growl, 2), -4), 0.25))


# ======================= Chimney Sweep =======================
@S('sfx_sweep_brush', MID, 0.75, syn='synthesized bristle scrubs')
def _():
    br = [shape(svf(noise(0.16), 3500, 1.5, 'bp'), [(0, 0), (0.3, 1), (1, 0)]) for _ in range(3)]
    return mix(K('ui/scratch_004', db=-2), at(K('ui/scratch_005', db=-2), 0.2), at(K('ui/scratch_004', rate=1.1, db=-3), 0.4),
               at(gain(br[0], -8), 0.0), at(gain(br[1], -8), 0.2), at(gain(br[2], -8), 0.4))


@S('sfx_sweep_soot', REF, 1.0, syn='a synthesized soot whoomph')
def _():
    puff = env(svf(noise(0.9, 'pink'), sweep(900, 250, 0.6), 0.8), a=0.025, d=0.28)
    return mix(gain(puff, 2), gain(thump(0.5, 110, 48, 0.14), -2), K('sci/explosionCrunch_000', af='lowpass=f=900', db=-9))


@S('sfx_sweep_hop', TELL, 0.45, syn='a synthesized cork pop and puff')
def _():
    pop = env(tone(0.05, sweep(500, 1900, 0.03)), a=0.0005, d=0.012)
    puff = env(svf(noise(0.3, 'pink'), 1200, 0.8), a=0.01, d=0.08)
    return mix(gain(pop, 0), at(gain(puff, -4), 0.01), K('ui/drop_003', db=-6))


@S('sfx_sweep_brick', MID, 0.4)
def _():
    return mix(K('imp/impactPlate_medium_002', rate=0.7), K('imp/impactMining_002', rate=1.2, db=-4))


# ======================= Iron Heel =======================
@S('sfx_ironheel_charge', BED, 2.0, syn='a synthesized two-second energy riser', fade=0.06)
def _():
    d = 1.9
    saw = svf(tone(d, sweep(80, 330, d), 'saw'), sweep(400, 3000, d), 1.5)
    sn = tone(d, sweep(160, 660, d))
    hiss = svf(noise(d), sweep(2000, 6000, d), 0.8, 'hp')
    body = mix(gain(saw, -2), gain(sn, -6), gain(hiss, -16))
    body = am(body, sweep(4, 22, d), 0.5)
    return shape(body, [(0, 0), (0.15, 0.35), (0.92, 1), (1, 0.6)])


@S('sfx_ironheel_launcher', TELL, 0.75)
def _():
    return mix(K('sci/doorOpen_001', db=-2), at(K('rpg/metalLatch', rate=0.9), 0.3), at(K('imp/impactMetal_medium_003', db=-5), 0.32))


@S('sfx_ironheel_rocket', REF, 0.9, syn='a synthesized rising launch whoosh')
def _():
    w = whoosh(0.7, 500, 3500, q=1.4, pts=((0, 0), (0.15, 1), (1, 0)))
    return mix(K('imp/impactMetal_light_001', rate=0.8, db=-4), at(K('sci/thrusterFire_000', 0.2, 0.95, db=0), 0.01),
               at(gain(w, -2), 0.02))


@S('sfx_ironheel_blast', HI, 1.4, syn='a synthesized beam crackle')
def _():
    cr = env(svf(grains(1.0, 900), 3000, 0.8, 'hp'), a=0.01, d=0.4)
    return mix(K('sci/laserLarge_002', rate=0.7), K('sci/lowFrequency_explosion_000', 0, 1.3, db=-2), gain(cr, -6))


@S('sfx_ironheel_vent', TELL, 0.7)
def _():
    return mix(K('rpg/metalLatch', rate=0.85, db=-1), at(K('sci/doorClose_002', rate=0.8), 0.04))


@S('sfx_ironheel_hiss', LOW, 1.3, syn='a synthesized rising steam hiss', fade=0.05)
def _():
    h = svf(noise(1.3), 4500, 1.2, 'bp')
    h = jitter_am(h, 30, 0.3)
    return shape(h, [(0, 0), (0.1, 0.4), (0.9, 1), (1, 0.7)])


@S('sfx_ironheel_steam', REF, 1.0, syn='a synthesized steam burst')
def _():
    b = env(svf(noise(0.9), 1400, 0.7, 'hp'), a=0.008, d=0.3)
    return mix(gain(b, 0), K('sci/thrusterFire_002', 0, 0.8, af='highpass=f=800', db=-3), K('sci/doorOpen_002', db=-6))


@S('sfx_ironheel_press', REF, 0.9, syn='a synthesized low thump')
def _():
    return mix(K('sci/doorClose_000', db=-3), at(K('imp/impactMetal_heavy_000', rate=0.8), 0.12),
               at(gain(thump(0.4, 85, 40, 0.1), -3), 0.12))


@S('sfx_ironheel_valve', TELL, 0.55, syn='a synthesized valve squeak')
def _():
    sq = env(svf(tone(0.18, sweep(1250, 880, 0.18), 'saw', vib=(35, 40)), 1100, 4, 'bp'), a=0.01, r=0.04)
    return mix(gain(sq, -2), at(K('rpg/metalLatch'), 0.14), at(K('imp/impactMetal_light_004', rate=1.5, db=-7), 0.15))


# ======================= Sandcastle Sam =======================
def sand(dur, density=6000, fc=3500, seed=None):
    return svf(grains(dur, density, seed=seed, dec=0.0008), fc, 1.0, 'bp')


@S('sfx_sandcastle_shovel', MID, 0.65, syn='a synthesized sand scrape')
def _():
    sc = shape(mix(sand(0.45, 9000), gain(svf(noise(0.45), 2500, 1.2, 'bp'), -12)), [(0, 0), (0.2, 1), (1, 0)])
    return mix(K('imp/footstep_snow_001', rate=1.2, db=-3), at(gain(sc, 0), 0.04), K('imp/impactMetal_light_003', rate=0.7, db=-14))


@S('sfx_sandcastle_walls', REF, 1.1, syn='a synthesized sand pour')
def _():
    pour = shape(mix(sand(1.0, 12000, 3000), gain(svf(noise(1.0, 'pink'), 1800, 1.0, 'bp'), -8)), [(0, 0), (0.1, 1), (0.6, 0.6), (1, 0)])
    return mix(K('imp/impactSoft_heavy_001', db=-1), gain(pour, -1), at(K('imp/footstep_snow_004', rate=0.7, db=-4), 0.05))


@S('sfx_sandcastle_pour', MID, 1.3, syn='a synthesized sand pour', fade=0.15)
def _():
    pour = mix(sand(1.3, 14000, 4200, seed=3), gain(svf(noise(1.3, 'pink'), 2600, 1.0, 'bp'), -9))
    return shape(pour, [(0, 0), (0.1, 0.6), (0.6, 1), (1, 0)])


@S('sfx_sandcastle_sandland', TELL, 0.6, syn='a synthesized sand spray')
def _():
    spray = env(sand(0.35, 15000, 3000), a=0.002, d=0.1)
    return mix(K('imp/impactSoft_medium_002', rate=0.8), K('imp/footstep_snow_003', rate=0.7, db=-2), at(gain(spray, -3), 0.01))


# ======================= King Honk =======================
def horn(dur, f, bend=0.94):
    fr = glide([(0, f * 0.97), (0.04, f), (dur * 0.75, f), (dur, f * bend)])
    a = tone(dur, fr, 'saw')
    b = tone(dur, lambda t: fr(t) * 1.012, 'sq')
    src = mix(a, gain(b, -6))
    return drive(formant(src, [700, 1600, 2600], q=4, amps=[1.0, 0.7, 0.3]), 2.0)


@S('sfx_clownking_honkwind', TELL, 1.1, syn='synthesized rubber-bulb squeaks')
def _():
    def sq(f):
        return env(svf(tone(0.18, sweep(f, f * 1.5, 0.18), 'sq', vib=(28, f * 0.04)), f * 2.5, 3, 'bp'), a=0.01, r=0.05)
    return mix(sq(380), at(gain(sq(460), 1), 0.33), at(gain(sq(560), 2), 0.66), at(K('rpg/handleSmallLeather', db=-8), 0.0))


@S('sfx_clownking_honk', HI, 0.95, syn='a synthesized bulb-horn blast')
def _():
    h = env(horn(0.6, 330), a=0.012, r=0.08)
    return fx(h, 'aecho=0.8:0.5:90:0.25')


@S('sfx_clownking_leap', TELL, 0.55, syn='a synthesized slide whistle')
def _():
    w = env(tone(0.48, sweep(480, 2200, 0.45), vib=(7, 25)), a=0.02, r=0.06)
    br = gain(svf(noise(0.48), 2000, 1.0, 'bp'), -24)
    return mix(w, br)


@S('sfx_clownking_decoydrop', MID, 0.6, syn='a synthesized falling slide whistle')
def _():
    w = env(tone(0.38, sweep(2000, 420, 0.38), vib=(8, 20)), a=0.01, r=0.04)
    return mix(gain(w, -1), at(K('imp/impactSoft_medium_001', db=-2), 0.37))


@S('sfx_clownking_pie', MID, 0.6, syn='a synthesized wobbling whoosh')
def _():
    w = am(whoosh(0.55, 500, 2000, q=1.3), 9, 0.7)
    return mix(gain(w, 0), K('sci/slime_000', rate=1.3, db=-14))


@S('sfx_clownking_piesplat', HI, 0.8, syn='a synthesized splat burst')
def _():
    b = env(svf(noise(0.3, 'pink'), 1800, 0.7), a=0.001, d=0.06)
    return mix(K('sci/slime_000', rate=0.8), K('imp/impactSoft_heavy_002', db=-1), gain(b, -3), at(K('rpg/dropLeather', db=-5), 0.02))


# ======================= Short-Order Shoe =======================
@S('sfx_shortorder_bell', REF, 1.0, syn='a synthesized service-bell ring')
def _():
    p = ((1, 1, 1.0), (2.0, 0.3, 0.5), (2.9, 0.45, 0.5), (4.3, 0.2, 0.3))
    return mix(K('cas/card-slide-2', db=-6), at(bell(0.9, 2093, p, d=0.45), 0.12), at(K('imp/impactBell_heavy_002', rate=2.2, db=-10), 0.12))


@S('sfx_shortorder_grab', TELL, 0.55, syn='a synthesized lunge whoosh')
def _():
    return mix(gain(whoosh(0.35, 600, 2500, q=1.5), -2), at(K('rpg/cloth1', rate=1.3), 0.12), at(K('rpg/handleSmallLeather2', db=-3), 0.3))


@S('sfx_shortorder_togo', TELL, 0.65, syn='a synthesized yoink zip')
def _():
    z = env(tone(0.22, sweep(1600, 380, 0.22), 'tri'), a=0.004, r=0.05)
    return mix(K('cas/cards-pack-take-out-1', db=-1), K('rpg/cloth3', db=-4), at(gain(z, -8), 0.12))


@S('sfx_shortorder_rush', REF, 0.9, syn='synthesized triple bell dings and ticket-printer chatter')
def _():
    p = ((1, 1, 1.0), (2.9, 0.4, 0.5), (4.3, 0.2, 0.3))
    ding = bell(0.5, 2349, p, d=0.2)
    chat = am(svf(grains(0.32, 220, dec=0.002), 2500, 1.2, 'bp'), 25, 0.9)
    return mix(ding, at(gain(ding, -1), 0.12), at(gain(ding, 0), 0.24), at(gain(chat, -4), 0.36))


# ======================= T-Rex Toes =======================
def chirp(f, dur=0.12):
    return env(formant(tone(dur, glide([(0, f), (dur * 0.4, f * 1.9), (dur, f * 1.25)]), 'tri', vib=(30, f * 0.05)), [f * 1.6, f * 3], q=3),
               a=0.004, r=0.03)


@S('sfx_trex_dinosqueak', MID, 0.4, syn='synthesized baby-dino chirps')
def _():
    return mix(chirp(1100), at(gain(chirp(1350, 0.15), -1), 0.15))


@S('sfx_trex_dinorun', LOW, 0.6)
def _():
    fs = ['rpg/footstep01', 'rpg/footstep03', 'rpg/footstep05', 'rpg/footstep07', 'rpg/footstep09', 'rpg/footstep02', 'rpg/footstep04', 'rpg/footstep06']
    return mix(*[at(K(r, rate=2.1, db=-6 + min(i, 3) * 2), i * 0.055) for i, r in enumerate(fs)])


@S('sfx_trex_growl', TELL, 1.3, syn='a synthesized rumbling growl')
def _():
    g = voice(1.25, glide([(0, 58), (0.6, 66), (1.25, 52)]), [320, 700, 1400], vib=(4, 2))
    g = jitter_am(g, 24, 0.7)
    r = svf(noise(1.25, 'brown'), 200, 0.7)
    return shape(mix(drive(g, 2.5), gain(r, -8)), [(0, 0), (0.25, 0.8), (0.75, 1), (1, 0)])


@S('sfx_trex_snack', REF, 0.6, syn='a synthesized crunch')
def _():
    cr = env(svf(grains(0.15, 3000), 3000, 1.0, 'bp'), a=0.001, d=0.04)
    return mix(K('imp/impactWood_medium_002', rate=0.8), K('imp/impactPunch_medium_001', db=-2), at(gain(cr, -2), 0.01),
               at(K('sci/slime_000', rate=0.8, db=-8), 0.12))


@S('sfx_trex_breath', LOW, 1.1, syn='a synthesized deep inhale', fade=0.08)
def _():
    b = svf(noise(1.05, 'pink'), sweep(350, 1300, 1.05), 1.6, 'bp')
    return shape(b, [(0, 0), (0.7, 1), (0.92, 1), (1, 0)])


@S('sfx_trex_roar', HI, 1.5, syn='a synthesized roar (formant-filtered saw, rasp and sub)', fade=0.15)
def _():
    d = 1.45
    f = glide([(0, 92), (0.25, 135), (0.9, 118), (d, 72)])
    v = voice(d, f, [550, 1100, 2300], vib=(6, 4))
    v = jitter_am(v, 40, 0.6, seed=11)
    rasp = svf(noise(d, 'pink'), 900, 1.0, 'bp')
    sub = tone(d, lambda t: f(t) / 2)
    body = mix(drive(v, 3.0), gain(jitter_am(rasp, 55, 0.7, seed=4), -1), gain(sub, -6))
    body = svf(body, 3800, 0.7)
    body = shape(body, [(0, 0), (0.08, 0.9), (0.6, 1), (1, 0)])
    return mix(body, K('sci/lowFrequency_explosion_001', 0, 1.0, db=-12))


# ======================= Ice Skate Ivy =======================
def tinkle(dur, count, seed=None):
    import random
    r = random.Random(seed)
    return mix(*[at(gain(bell(0.25, r.uniform(3000, 6500), d=0.06), r.uniform(-14, -4)), r.uniform(0, dur - 0.25)) for _ in range(count)])


@S('sfx_iceskate_snow', MID, 1.3, syn='a synthesized wind gust and ice tinkles', fade=0.15)
def _():
    gust = shape(svf(noise(1.25, 'pink'), glide([(0, 500), (0.6, 1400), (1.25, 700)]), 1.2, 'bp'), [(0, 0), (0.45, 1), (1, 0)])
    return mix(gust, gain(tinkle(1.2, 9, seed=4), -2))


@S('sfx_iceskate_freeze', REF, 0.9, syn='a synthesized ice crackle')
def _():
    cr = env(svf(grains(0.7, 2500, dec=0.001), 4000, 0.8, 'hp'), a=0.002, d=0.25)
    return mix(K('imp/impactGlass_light_000', rate=1.3), at(K('imp/impactGlass_light_001', rate=1.1, db=-3), 0.06),
               at(K('imp/impactGlass_light_002', rate=1.5, db=-5), 0.13), gain(cr, -4))


@S('sfx_iceskate_frostbite', TELL, 0.45, syn='a synthesized icy zap')
def _():
    z = env(svf(tone(0.25, sweep(3000, 700, 0.25), 'sq'), 2500, 1.0), a=0.002, d=0.08)
    return mix(K('imp/impactGlass_medium_002', rate=1.4), gain(z, -10))


@S('sfx_iceskate_axel', TELL, 1.05, syn='synthesized skate swishes and an ice scrape')
def _():
    sw = [whoosh(0.2, 1800, 5000, q=2.0) for _ in range(3)]
    scrape = env(mix(svf(noise(0.35), 4500, 0.8, 'hp'), gain(svf(grains(0.35, 4000), 5000, 1, 'bp'), -4)), a=0.005, d=0.12)
    return mix(sw[0], at(gain(sw[1], 1), 0.2), at(gain(sw[2], 2), 0.4), at(gain(scrape, -1), 0.62))


# ======================= The Colossus =======================
@S('sfx_colossus_clang', LOW, 0.35)
def _():
    return mix(K('imp/impactMetal_medium_002', rate=0.9), K('sci/impactMetal_004', db=-7))


@S('sfx_colossus_crack', REF, 0.7, syn='a synthesized crackle')
def _():
    cr = env(svf(grains(0.25, 3000), 2500, 1.0, 'bp'), a=0.001, d=0.07)
    return mix(K('imp/impactMetal_heavy_003'), K('imp/impactMining_003', rate=1.3, db=-3), at(gain(cr, -4), 0.01))


@S('sfx_colossus_shatter', HI, 1.4)
def _():
    pieces = [at(K('imp/impactMetal_light_00%d' % (i % 5), rate=1.0 + 0.15 * i, db=-8 - i), 0.14 + 0.09 * i) for i in range(5)]
    return mix(K('imp/impactMetal_heavy_004'), at(K('imp/impactPlate_heavy_002', db=-3), 0.02), at(K('imp/impactPlate_heavy_004', db=-5), 0.08),
               K('sci/lowFrequency_explosion_001', 0, 0.9, db=-9), *pieces)


@S('sfx_colossus_glint', TELL, 0.7, syn='a synthesized shimmer')
def _():
    sh = mix(bell(0.6, 4200, ((1, 1, 1), (1.5, 0.5, 0.8)), d=0.25))
    return mix(K('rpg/drawKnife2', rate=1.3), at(gain(sh, -8), 0.06))


@S('sfx_colossus_parry', REF, 0.6)
def _():
    return mix(K('rpg/drawKnife1', rate=0.9, db=-2), K('imp/impactMetal_light_003', rate=1.3), K('imp/impactBell_heavy_003', rate=1.5, db=-8))


@S('sfx_colossus_smith', MID, 0.75)
def _():
    return mix(K('imp/impactMetal_light_000', rate=1.6), at(K('imp/impactMetal_light_000', rate=1.75, db=1), 0.16),
               at(K('imp/impactMetal_light_000', rate=1.9, db=2), 0.32))


@S('sfx_colossus_anvil', REF, 0.9)
def _():
    hit = mix(K('imp/impactBell_heavy_004', rate=1.1), K('imp/impactMetal_heavy_001', rate=1.2, db=-2))
    return mix(hit, at(gain(K('imp/impactBell_heavy_004', rate=1.35), -8), 0.22))


# ======================= UFO Toe =======================
@S('sfx_ufotoe_beam', MID, 1.6, syn='a synthesized warbling beam hum', fade=0.2)
def _():
    d = 1.55
    a = tone(d, 220, vib=(8, 55))
    b = am(tone(d, 331, 'tri'), 6, 0.6)
    eng = K('sci/engineCircular_001', 0, d, af='bandpass=f=600:w=500', db=-6)
    body = mix(gain(a, -2), gain(b, -6), eng)
    return mix(shape(body, [(0, 0), (0.1, 1), (0.8, 0.9), (1, 0)]), K('dgt/phaserUp1', db=-6))


@S('sfx_ufotoe_beambreak', TELL, 0.7)
def _():
    return mix(K('dgt/phaserDown3'), K('imp/impactGlass_light_004', rate=1.2, db=-5), K('sci/forceField_004', 0.0, 0.5, rate=0.7, db=-9))


@S('sfx_ufotoe_abduct', TELL, 0.7, syn='a synthesized rising zip')
def _():
    z = env(tone(0.45, sweep(300, 2400, 0.45), vib=(16, 40)), a=0.01, r=0.08)
    return mix(K('dgt/phaserUp5', db=-2), at(gain(z, -4), 0.03))


@S('sfx_ufotoe_twin', TELL, 1.1, syn='a synthesized theremin warble', fade=0.15)
def _():
    t = env(tone(1.05, glide([(0, 600), (0.4, 900), (1.05, 700)]), vib=(7, 25)), a=0.05, r=0.25)
    return mix(t, K('sci/spaceEngineSmall_001', 0, 1.05, db=-12))


# ======================= Cosmic Croc =======================
@S('sfx_cosmiccroc_meteor', MID, 1.5, syn='a synthesized falling whistle and burn', fade=0.1)
def _():
    d = 1.4
    wh = env(tone(d, sweep(1800, 420, d), vib=(5, 15)), a=0.05, r=0.1)
    burn = shape(svf(noise(d, 'pink'), 1500, 1.0, 'bp'), [(0, 0), (1, 1)])
    return mix(gain(wh, -6), gain(burn, -2), K('sci/thrusterFire_003', 0, d, af='lowpass=f=600', db=-6))


@S('sfx_cosmiccroc_impact', REF, 1.1, syn='a synthesized sub boom')
def _():
    return mix(K('sci/explosionCrunch_002'), gain(thump(0.6, 70, 32, 0.18), -3), K('imp/impactMining_004', db=-5))


@S('sfx_cosmiccroc_flip', TELL, 1.4, syn='a synthesized gravity-warp sweep', fade=0.15)
def _():
    d = 1.35
    f = glide([(0, 420), (0.55, 95), (d, 420)])
    a = tone(d, f, 'tri', vib=(9, 30))
    b = tone(d, lambda t: f(t) * 1.5, vib=(5, 20))
    body = shape(mix(a, gain(b, -6)), [(0, 0), (0.15, 1), (0.85, 1), (1, 0)])
    return fx(body, 'aphaser=in_gain=0.6:out_gain=0.9:delay=3:decay=0.6:speed=1.2,flanger=delay=4:depth=6:speed=0.6')


@S('sfx_cosmiccroc_blackhole', TELL, 1.7, syn='a synthesized swirling suction and sub', fade=0.15)
def _():
    d = 1.6
    suck = am(svf(noise(d, 'pink'), sweep(3000, 200, d), 1.5, 'bp'), sweep(3, 14, d), 0.7)
    sub = tone(d, sweep(40, 85, d))
    inrush = K('sci/lowFrequency_explosion_001', rev=True, db=-6)
    return mix(shape(mix(suck, gain(sub, -4)), [(0, 0), (0.25, 1), (1, 0.6)]), at(inrush, 0.0))


@S('sfx_cosmiccroc_holeclose', TELL, 0.6, syn='a synthesized implosion')
def _():
    sw = shape(svf(noise(0.25, 'pink'), sweep(500, 3000, 0.25), 1.5, 'bp'), [(0, 0), (0.95, 1), (1, 0)])
    return mix(sw, at(gain(thump(0.3, 220, 60, 0.07), 0), 0.24), at(K('imp/impactGlass_light_003', rate=1.4, db=-8), 0.24))


# ======================= Dough Boy =======================
@S('sfx_doughboy_ball', MID, 0.45, syn='a synthesized blorp')
def _():
    bl = env(tone(0.12, sweep(180, 520, 0.12)), a=0.003, d=0.05)
    return mix(K('sci/slime_000', rate=1.3, db=-2), K('ui/drop_004', rate=0.7, db=-5), gain(bl, -4))


@S('sfx_doughboy_splat', TELL, 0.55, syn='a synthesized splat transient')
def _():
    b = env(svf(noise(0.05, 'pink'), 1500, 0.7), a=0.0005, d=0.012)
    return mix(K('imp/impactSoft_heavy_003'), K('sci/slime_000', rate=0.7, db=-3), gain(b, -6))


@S('sfx_doughboy_rise', BED, 0.8, syn='synthesized yeasty bubbles and stretch', fade=0.1)
def _():
    stretch = env(svf(tone(0.7, sweep(140, 260, 0.7), 'saw'), 500, 2.0), a=0.1, r=0.25)
    return mix(gain(bubbles(0.7, 14, 250, 700, seed=5), -1), gain(stretch, -14))


# ======================= Nonna's Slipper =======================
@S('sfx_nonna_pin', MID, 1.7, syn='a synthesized wooden rolling rumble', fade=0.15)
def _():
    d = 1.6
    r = am(svf(noise(d, 'brown'), 300, 0.8), 7, 0.6)
    clack = mix(*[at(K('imp/impactWood_light_00%d' % (i % 5), rate=0.75, db=-14), i / 7.0) for i in range(11)])
    return mix(K('imp/impactWood_medium_001', rate=0.8, db=-3), shape(gain(r, 2), [(0, 0), (0.1, 1), (0.85, 1), (1, 0)]), clack,
               at(K('rpg/creak2', db=-12), 0.2))


@S('sfx_nonna_pinsmash', HI, 0.8)
def _():
    return mix(K('imp/impactWood_heavy_002'), at(K('imp/impactWood_heavy_003', db=-3), 0.06), at(K('imp/impactPlate_medium_001', db=-5), 0.02))


@S('sfx_nonna_slippers', MID, 0.9)
def _():
    return mix(K('cas/card-fan-1', rate=0.8), at(K('rpg/cloth2', db=-3), 0.1), at(K('rpg/cloth4', rate=0.9, db=-4), 0.35))


@S('sfx_nonna_slipper', REF, 0.45, syn='a synthesized whip-crack transient')
def _():
    cr = env(svf(noise(0.03), 2200, 0.8, 'hp'), a=0.0005, d=0.006)
    return mix(K('imp/impactPunch_heavy_002', rate=1.2), K('rpg/dropLeather', db=-2), gain(cr, -3))


@S('sfx_nonna_spoon', TELL, 0.55, syn='a synthesized swing whoosh')
def _():
    return mix(gain(whoosh(0.22, 400, 1800, q=1.2), -3), at(K('imp/impactWood_light_003', rate=1.4), 0.2), at(K('rpg/handleSmallLeather', db=-6), 0.22))


@S('sfx_nonna_tug', LOW, 1.5, fade=0.15)
def _():
    return mix(K('rpg/creak1', rate=0.9), at(K('rpg/creak2', rate=0.85, db=-1), 0.45), at(K('rpg/creak3', rate=0.8, db=-2), 1.05))


# ======================= The Pigeon King =======================
def coo(f, seed=None):
    a = env(am(tone(0.22, glide([(0, f), (0.1, f * 1.15), (0.22, f * 0.95)])), 32, 0.6), a=0.02, r=0.06)
    b = env(tone(0.34, glide([(0, f * 1.1), (0.12, f * 1.25), (0.34, f * 0.85)]), vib=(6, 6)), a=0.03, r=0.12)
    v = mix(a, at(gain(b, 1), 0.27))
    return svf(v, 900, 0.8)


@S('sfx_pigeonking_coo', MID, 0.7, syn='a synthesized pigeon coo')
def _():
    return coo(360)


@S('sfx_pigeonking_splat', TELL, 0.4)
def _():
    return mix(K('sci/slime_000', rate=1.5), K('imp/impactSoft_medium_004', rate=1.3, db=-3))


@S('sfx_pigeonking_flock', TELL, 1.3, syn='synthesized coos')
def _():
    return mix(K('cas/card-fan-2', rate=1.2), at(K('cas/card-shuffle', 0, 0.8, rate=1.5, db=-3), 0.1),
               at(gain(coo(330), -4), 0.15), at(gain(coo(410), -6), 0.35), at(gain(coo(290), -6), 0.55))


# ======================= The Gargoyle =======================
@S('sfx_gargoyle_swoop', MID, 0.75, syn='a synthesized low swoop')
def _():
    w = svf(noise(0.65, 'pink'), glide([(0, 300), (0.3, 900), (0.65, 280)]), 1.3, 'bp')
    w = shape(w, [(0, 0), (0.45, 1), (1, 0)])
    return mix(w, at(K('rpg/cloth4', rate=0.7, db=-4), 0.1), at(K('rpg/cloth4', rate=0.65, db=-6), 0.36))


@S('sfx_gargoyle_stone', TELL, 1.1, syn='a synthesized stone grind', fade=0.12)
def _():
    g = svf(mix(grains(1.0, 4000, dec=0.002), gain(noise(1.0, 'brown'), -6)), 350, 1.2, 'bp')
    g = jitter_am(g, 18, 0.5)
    return mix(shape(gain(g, 4), [(0, 0), (0.2, 1), (0.8, 1), (1, 0)]), K('imp/footstep_concrete_000', rate=0.6, db=-3),
               at(K('imp/footstep_concrete_002', rate=0.55, db=-4), 0.4), at(K('imp/impactMining_001', rate=0.6, db=-6), 0.85))


@S('sfx_gargoyle_stonecrack', LOW, 0.4, syn='a synthesized crackle')
def _():
    cr = env(svf(grains(0.15, 3500), 2000, 1, 'bp'), a=0.001, d=0.04)
    return mix(K('imp/impactMining_001', rate=1.1), gain(cr, -4))


@S('sfx_gargoyle_stonebreak', HI, 1.1, syn='a synthesized rubble rumble')
def _():
    rub = env(svf(grains(0.8, 2500, dec=0.003), 900, 0.8), a=0.003, d=0.3)
    return mix(gain(thump(0.4, 90, 40, 0.1), -3), K('imp/impactMining_002'), at(K('imp/impactMining_003', rate=0.9, db=-3), 0.07),
               at(K('imp/impactMining_004', rate=1.1, db=-5), 0.16), at(K('imp/footstep_concrete_003', rate=0.8, db=-6), 0.28), gain(rub, -4))


@S('sfx_gargoyle_storm', TELL, 1.3, syn='a synthesized screech chorus', fade=0.15)
def _():
    def scr(f):
        return env(drive(svf(tone(0.45, glide([(0, f), (0.12, f * 1.4), (0.45, f * 1.1)]), 'saw', vib=(22, f * 0.03)), f * 2.2, 2.5, 'bp'), 2),
                   a=0.02, r=0.12)
    wings = mix(at(K('rpg/cloth4', rate=0.8, db=-4), 0), at(K('rpg/cloth2', rate=0.7, db=-4), 0.25), at(K('rpg/cloth4', rate=0.75, db=-5), 0.55))
    return mix(scr(900), at(gain(scr(1150), -2), 0.22), at(gain(scr(780), -3), 0.5), wings)


# ======================= Jellyfish Flip-Flop =======================
@S('sfx_jellyfish_charge', MID, 0.8, syn='a synthesized wobbling electric hum')
def _():
    d = 0.75
    h = svf(tone(d, sweep(110, 230, d), 'sq'), 900, 1.5, 'bp')
    h = am(h, 11, 0.6)
    cr = svf(grains(d, 600), 4000, 0.8, 'hp')
    return shape(mix(h, gain(cr, -6)), [(0, 0), (0.1, 0.5), (0.95, 1), (1, 0)])


@S('sfx_jellyfish_sting', REF, 0.55, syn='a synthesized crackle burst')
def _():
    cr = env(svf(grains(0.3, 2500), 3500, 0.8, 'hp'), a=0.001, d=0.1)
    return mix(K('dgt/zap2', 0, 0.5, rate=1.3), K('sci/slime_000', rate=1.6, db=-6), gain(cr, -4))


@S('sfx_jellyfish_bright', TELL, 0.85, syn='a synthesized shimmer and crackle')
def _():
    sh = env(tone(0.6, 1760, vib=(13, 60)), a=0.02, r=0.2)
    cr = env(svf(grains(0.6, 1200), 4500, 0.8, 'hp'), a=0.01, d=0.3)
    return mix(K('dgt/zapThreeToneUp', 0, 0.8, rate=1.2, db=-1), gain(sh, -12), gain(cr, -6))


# ======================= Kraken Toes =======================
@S('sfx_kraken_splash', REF, 0.85, syn='a synthesized water splash and bubbles')
def _():
    sp = env(svf(noise(0.5, 'pink'), sweep(3000, 900, 0.4), 0.7), a=0.002, d=0.12)
    return mix(gain(sp, 2), K('imp/impactSoft_heavy_004', rate=0.9, db=-4), at(gain(bubbles(0.5, 18, 500, 1600, seed=2), -6), 0.08))


@S('sfx_kraken_tentacle', TELL, 1.0)
def _():
    return mix(K('sci/slime_001', 0, 0.9), K('sci/slime_000', rate=0.6, db=-2), K('imp/impactSoft_heavy_000', rate=0.7, db=-6))


@S('sfx_kraken_drag', TELL, 1.1, syn='a synthesized sinking gurgle', fade=0.15)
def _():
    sink = env(tone(0.9, sweep(320, 80, 0.9), 'tri'), a=0.02, r=0.25)
    return mix(gain(bubbles(1.0, 30, 180, 600, blen=(0.03, 0.07), seed=8), 0), gain(sink, -8), K('sci/slime_000', rate=0.5, db=-4))


@S('sfx_kraken_squirt', TELL, 0.55, syn='a synthesized pssht')
def _():
    p = env(svf(noise(0.3), sweep(3000, 1200, 0.3), 1.2, 'bp'), a=0.004, d=0.09)
    return mix(K('sci/slime_000', rate=1.2, db=-1), gain(p, -2))


@S('sfx_kraken_inked', TELL, 0.7, syn='synthesized drips')
def _():
    drips = mix(at(gain(bubbles(0.06, 1, 900, 1100, seed=1), -6), 0.25), at(gain(bubbles(0.06, 1, 700, 900, seed=9), -8), 0.42))
    return mix(K('sci/slime_000', rate=0.8), K('imp/impactSoft_medium_003', db=-3), drips)


# ======================= Milkshake Max =======================
@S('sfx_milkshake_freeze', TELL, 1.3, syn='a synthesized brain-freeze chime cluster', fade=0.2)
def _():
    ch = mix(*[at(gain(bell(1.1, f, ((1, 1, 1), (2.0, 0.3, 0.5), (3.0, 0.15, 0.3)), d=0.5), -4), i * 0.06)
               for i, f in enumerate((3951, 3136, 2637, 2093))])
    cold = shape(svf(noise(1.0, 'pink'), 5000, 1.0, 'bp'), [(0, 0), (0.3, 1), (1, 0)])
    return mix(K('ui/glass_004', db=-3), ch, gain(cold, -14))


@S('sfx_milkshake_frozen', REF, 0.8, syn='a synthesized ice crack and low bwong')
def _():
    cr = env(svf(grains(0.3, 2500, dec=0.001), 4000, 0.8, 'hp'), a=0.002, d=0.1)
    bw = env(tone(0.6, sweep(190, 120, 0.6), 'tri'), a=0.005, d=0.2)
    return mix(K('imp/impactGlass_heavy_001', rate=1.2), gain(cr, -6), gain(bw, -6))


@S('sfx_milkshake_straw', MID, 0.45, syn='a synthesized plastic boing')
def _():
    b = env(tone(0.35, glide([(0, 300), (0.06, 170), (0.35, 150)]), 'tri', vib=(18, 25)), a=0.002, d=0.12)
    return mix(K('ui/drop_001', db=-2), gain(b, -3))


@S('sfx_milkshake_slurp', LOW, 0.7, syn='a synthesized straw slurp')
def _():
    d = 0.65
    s = svf(noise(d, 'pink'), glide([(0, 700), (0.3, 1700), (0.65, 1100)]), 4, 'bp')
    s = jitter_am(s, 22, 0.8, seed=6)
    return shape(mix(s, gain(bubbles(d, 8, 300, 800, seed=12), -10)), [(0, 0), (0.15, 1), (0.8, 0.9), (1, 0)])


@S('sfx_milkshake_snap', REF, 0.4, syn='a synthesized snap and pop')
def _():
    cl = env(svf(noise(0.03), 3000, 0.8, 'hp'), a=0.0005, d=0.006)
    pop = env(tone(0.06, sweep(900, 300, 0.05)), a=0.001, d=0.015)
    return mix(K('imp/impactPlate_light_003', rate=1.6), gain(cl, -2), at(gain(pop, -6), 0.01))


# ======================= Queen of the Rink =======================
@S('sfx_rinkqueen_puck', REF, 0.6, syn='a synthesized puck whoosh')
def _():
    return mix(K('imp/impactWood_medium_000', rate=1.3), K('imp/impactPlank_medium_002', rate=1.2, db=-4),
               at(gain(whoosh(0.3, 1200, 3500, q=1.8), -6), 0.04))


@S('sfx_rinkqueen_roll', MID, 1.2, syn='synthesized long skate glides', fade=0.2)
def _():
    g1 = whoosh(0.8, 2500, 4200, q=1.8, pts=((0, 0), (0.3, 1), (1, 0)))
    g2 = whoosh(0.8, 3000, 2200, q=1.8, pts=((0, 0), (0.4, 1), (1, 0)))
    rum = shape(svf(noise(1.1, 'brown'), 180, 0.7), [(0, 0), (0.3, 1), (1, 0)])
    return mix(g1, at(gain(g2, -1), 0.3), gain(rum, -10))


@S('sfx_rinkqueen_dash', REF, 0.95, syn='a synthesized dash swish and ice spray')
def _():
    sw = whoosh(0.3, 1500, 6000, q=1.6, pts=((0, 0), (0.7, 1), (1, 0.4)))
    spray = env(mix(svf(noise(0.5), 5000, 0.8, 'hp'), gain(svf(grains(0.5, 6000), 6000, 1, 'bp'), -4)), a=0.003, d=0.16)
    return mix(sw, at(spray, 0.26), at(K('imp/footstep_snow_002', rate=1.6, db=-6), 0.26))


# ======================= The Lumberjack =======================
def saw_engine(d, f0, f1, grit=-8, seed=None):
    f = glide([(0, f0), (d * 0.35, f1), (d, f1 * 0.97)])
    eng = tone(d, f, 'pulse')
    eng = jitter_am(eng, 90, 0.35, seed=seed)
    body = mix(svf(eng, 2200, 0.9), gain(svf(noise(d), 3500, 1.2, 'bp'), grit))
    return drive(body, 2.5)


@S('sfx_lumberjack_timber', TELL, 1.3, fade=0.15)
def _():
    return mix(K('rpg/creak2', rate=0.7), at(K('rpg/creak1', rate=0.6, db=-1), 0.35), at(K('imp/impactWood_heavy_004', rate=0.8), 0.78),
               at(K('imp/impactPlank_medium_003', rate=0.7, db=-4), 0.8))


@S('sfx_lumberjack_chainsaw', MID, 1.3, syn='a synthesized two-stroke chainsaw rev', fade=0.15)
def _():
    return shape(saw_engine(1.25, 48, 105, seed=2), [(0, 0), (0.05, 0.7), (0.4, 1), (0.85, 0.85), (1, 0)])


@S('sfx_lumberjack_sawbite', REF, 0.7, syn='a synthesized chainsaw bite')
def _():
    bite = shape(saw_engine(0.6, 140, 120, grit=-3, seed=5), [(0, 1), (0.7, 0.8), (1, 0)])
    return mix(gain(bite, -2), K('imp/impactWood_medium_003', db=-1), at(K('imp/impactPlank_medium_004', rate=1.2, db=-6), 0.1))


@S('sfx_lumberjack_axe', MID, 0.6, syn='a synthesized spinning whoosh')
def _():
    w = am(svf(noise(0.55, 'pink'), 1200, 1.4, 'bp'), 12, 0.9)
    return shape(w, [(0, 0), (0.3, 1), (1, 0)])


@S('sfx_lumberjack_thunk', REF, 0.55)
def _():
    return mix(K('rpg/chop', rate=0.8), K('imp/impactWood_heavy_000', rate=1.1, db=-2), K('imp/impactMetal_light_000', rate=0.8, db=-12))


# ======================= The Yeti Ski Boot =======================
@S('sfx_yeti_icicle', MID, 0.6, syn='a synthesized ice creak and tinkle')
def _():
    cr = env(svf(grains(0.35, 1500, dec=0.001), 3500, 0.8, 'hp'), a=0.01, d=0.15)
    return mix(K('imp/impactGlass_light_003', rate=0.8), gain(cr, -4), at(gain(tinkle(0.4, 4, seed=21), -2), 0.05))


@S('sfx_yeti_iciclehit', REF, 0.85)
def _():
    return mix(K('imp/impactGlass_heavy_002'), at(K('imp/impactGlass_medium_003', rate=1.2, db=-3), 0.03),
               at(K('imp/impactGlass_light_001', rate=1.6, db=-8), 0.12))


@S('sfx_yeti_snowball', MID, 0.55, syn='a synthesized throw whoosh')
def _():
    return mix(K('imp/footstep_snow_002', rate=1.1), at(gain(whoosh(0.32, 500, 1500, q=1.2), -4), 0.08))


@S('sfx_yeti_avalanche', REF, 2.0, syn='a synthesized avalanche rumble', fade=0.3)
def _():
    d = 1.95
    r = svf(noise(d, 'brown'), 220, 0.7)
    r = jitter_am(r, 12, 0.4, seed=3)
    sub = am(tone(d, sweep(38, 50, d)), 3, 0.5)
    crumbles = mix(*[at(K('imp/footstep_snow_00%d' % (i % 5), rate=0.5, db=-8 - (i % 3) * 2), 0.15 + i * 0.17) for i in range(9)])
    return mix(shape(mix(gain(r, 4), gain(sub, -4)), [(0, 0), (0.35, 0.8), (0.75, 1), (1, 0)]), crumbles)


@S('sfx_yeti_bigball', TELL, 0.75, syn='a synthesized snow spray')
def _():
    spray = env(svf(noise(0.4, 'pink'), 2500, 0.8, 'hp'), a=0.003, d=0.12)
    return mix(K('imp/footstep_snow_000', rate=0.6), K('imp/impactSoft_heavy_004', rate=0.7, db=-1), gain(spray, -6))


# ======================= The Zombie Loafer (poltergeist) =======================
@S('sfx_poltergeist_groan', TELL, 1.3, syn='a synthesized zombie groan', fade=0.2)
def _():
    d = 1.25
    f = glide([(0, 112), (0.5, 120), (d, 92)])
    v = voice(d, f, [750, 1150, 2500], vib=(5, 3))
    v = jitter_am(v, 30, 0.45, seed=7)
    v = svf(mix(drive(v, 2.0), gain(svf(noise(d, 'pink'), 700, 1.5, 'bp'), -12)), 2600, 0.7)
    return shape(v, [(0, 0), (0.15, 1), (0.7, 0.9), (1, 0)])


@S('sfx_poltergeist_bite', REF, 0.55, syn='a synthesized crunch')
def _():
    cr = env(svf(grains(0.2, 3500), 2500, 1, 'bp'), a=0.001, d=0.05)
    return mix(K('imp/impactWood_light_004', rate=0.9), gain(cr, -2), at(K('sci/slime_000', rate=0.9, db=-7), 0.05))


@S('sfx_poltergeist_cough', TELL, 0.75, syn='synthesized coughs')
def _():
    def c(f, dur=0.14):
        n_ = formant(noise(dur, 'pink'), [600, 1400], q=3)
        vv = gain(voice(dur, f, [600, 1300]), -10)
        return env(mix(n_, vv), a=0.003, d=dur / 3)
    return mix(c(150), at(gain(c(140), -1), 0.2), at(gain(c(130, 0.2), 0), 0.42))


@S('sfx_poltergeist_sick', MID, 0.9, syn='a synthesized gurgle and short groan', fade=0.15)
def _():
    g = shape(gain(voice(0.6, glide([(0, 95), (0.6, 80)]), [500, 1000]), -6), [(0, 0), (0.3, 1), (1, 0)])
    return mix(gain(bubbles(0.85, 22, 160, 520, blen=(0.03, 0.06), seed=14), 0), at(g, 0.15))


@S('sfx_poltergeist_munch', MID, 0.5, syn='a synthesized crunch')
def _():
    def m():
        return mix(K('imp/impactSoft_medium_001', rate=1.2, db=-2), env(svf(grains(0.12, 3000), 2200, 1, 'bp'), a=0.001, d=0.03))
    return mix(m(), at(gain(m(), -2), 0.2))


# ======================= Phantom King =======================
@S('sfx_phantomking_fade', MID, 1.1, syn='a synthesized ghostly shimmer', fade=0.25)
def _():
    d = 0.9
    w = shape(svf(noise(d, 'pink'), sweep(600, 2000, d), 1.5, 'bp'), [(0, 0), (0.5, 1), (1, 0)])
    t = env(tone(d, sweep(620, 520, d), vib=(5, 12)), a=0.15, r=0.4)
    return fx(mix(w, gain(t, -8)), 'aecho=0.8:0.6:140|260:0.35|0.2')


@S('sfx_phantomking_echo', TELL, 1.4, syn='a synthesized ghostly "ooo" with echoes', fade=0.3)
def _():
    v = env(voice(0.7, glide([(0, 300), (0.35, 420), (0.7, 330)]), [400, 800], wave='tri', vib=(5, 8)), a=0.08, r=0.25)
    return fx(gain(v, 0), 'aecho=0.8:0.7:120|240|360:0.5|0.33|0.2')


@S('sfx_phantomking_stir', MID, 1.1, syn='a synthesized rising shimmer', fade=0.2)
def _():
    d = 1.0
    s = am(svf(noise(d, 'pink'), sweep(800, 3500, d), 2.0, 'bp'), sweep(6, 16, d), 0.6)
    lo = env(tone(d, 110, vib=(4, 3), harm=((1, 1), (1.5, 0.4))), a=0.2, r=0.3)
    return shape(mix(s, gain(lo, -8)), [(0, 0), (0.85, 1), (1, 0.5)])


@S('sfx_phantomking_curse', TELL, 0.95, syn='a synthesized echoing whoosh', fade=0.2)
def _():
    return fx(mix(K('dgt/phaseJump3', rate=0.7), gain(whoosh(0.4, 500, 2500, q=1.4), -6)), 'aecho=0.8:0.55:110|220:0.4|0.2')


@S('sfx_phantomking_exorcise', REF, 1.5, syn='a synthesized holy chime arpeggio', fade=0.3)
def _():
    notes = (1047, 1319, 1568, 2093)
    arp = mix(*[at(gain(bell(1.0, f, ((1, 1, 1), (2, 0.25, 0.6), (3, 0.1, 0.4)), d=0.4), -3), i * 0.07) for i, f in enumerate(notes)])
    up = whoosh(0.5, 400, 4000, q=1.2, pts=((0, 0), (0.8, 1), (1, 0)))
    return fx(mix(arp, gain(up, -8)), 'aecho=0.8:0.5:150:0.3')
