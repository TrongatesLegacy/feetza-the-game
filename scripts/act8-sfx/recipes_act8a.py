"""Recipes for Act 8's new Jotunheim feet, first batch: Wolf-Pup Paws, Berserker Boots and Shieldmaiden Sabatons.
Same kit and level targets as recipes_act8.py: REF -10.5 (slap), HI -9.5 (signature moments), TELL -11,
MID -12, LOW -13.5 (repeated: hurt sounds play on many smacks).

  KENNEY=/path/to/kenney RECIPES=recipes_act8a python3 -I build.py OUTDIR
  python3 -I integrate_act8a.py OUTDIR REPO"""
import random

from dsp import K, mix, at, env, shape, drive, gain, tone, glide, noise, svf, jitter_am, bell, whoosh, thump
from render import REG, S

# borrow two helpers from the Act 8 recipes without registering (and rendering) all of those again
_n = len(REG)
from recipes_act8 import voice, chain_rattle  # noqa: E402
del REG[_n:]

REF, HI, TELL, MID, LOW = -10.5, -9.5, -11.0, -12.0, -13.5


def yip(dur, f0, peak, end, seed=1):
    """a pup's yip: a short bright voice that leaps up and falls, a puff of breath on it."""
    f = glide([(0, f0), (dur * 0.3, peak), (dur, end)])
    v = env(voice(dur, f, [950, 2100, 3300], wave='saw', vib=(14, 25), q=8), a=0.006, r=dur * 0.4)
    b = env(svf(noise(dur, 'pink', seed=seed), 2600, 1.4, 'bp'), a=0.004, r=dur * 0.5)
    return mix(drive(v, 1.4), gain(b, -12))


def shout(dur, pts, vowels, k=2.0, seed=3, vib=(6, 8)):
    """a shouted voice (war cries, grunts): formant voice through a drive, rough with jitter."""
    v = voice(dur, glide(pts), vowels, wave='saw', vib=vib, q=6)
    v = jitter_am(v, 30, 0.35, seed=seed)
    breath = svf(noise(dur, 'pink', seed=seed + 1), 1400, 0.9, 'bp')
    return mix(drive(v, k), gain(breath, -10))


# ======================= Wolf-Pup Paws =======================
@S('sfx_wolfpupyip', MID, 0.9, syn='three synthesized puppy yips')
def _():
    return mix(yip(0.13, 900, 1500, 1150, seed=1), at(gain(yip(0.11, 1050, 1700, 1300, seed=2), -2), 0.17),
               at(gain(yip(0.15, 820, 1350, 980, seed=3), -1), 0.36), at(gain(yip(0.09, 1150, 1850, 1500, seed=4), -4), 0.55))


@S('sfx_wolfpuphurt', LOW, 0.4, syn='a synthesized puppy yelp')
def _():
    return mix(K('imp/impactSoft_medium_001', rate=1.3, db=-6), at(yip(0.2, 1300, 1900, 900, seed=5), 0.01))


@S('sfx_wolfpupdie', MID, 1.0, syn='a synthesized yelp falling to a whine')
def _():
    whine = env(voice(0.55, glide([(0, 1200), (0.2, 1050), (0.55, 620)]), [800, 1800], wave='saw', vib=(9, 30), q=9), a=0.02, r=0.25)
    return mix(yip(0.16, 1400, 2000, 1100, seed=6), at(drive(whine, 1.2), 0.15),
               at(K('imp/footstep_snow_002', rate=1.2, db=-4), 0.05), at(K('imp/impactSoft_medium_003', rate=1.1, db=-8), 0.0))


# ======================= Berserker Boots =======================
@S('sfx_berserkerspawn', TELL, 1.0, syn='a synthesized war cry')
def _():
    cry = shout(0.62, [(0, 150), (0.12, 205), (0.45, 190), (0.62, 150)], [720, 1180, 2600], k=2.4, seed=11)
    cry = shape(cry, [(0, 0), (0.08, 1), (0.75, 0.9), (1, 0)])
    return mix(cry, gain(thump(0.35, 110, 45, 0.12), -2), at(K('imp/footstep_snow_001', rate=0.75, db=-3), 0.02),
               at(K('rpg/cloth2', rate=0.8, db=-8), 0.0))


@S('sfx_berserkerhurt', LOW, 0.45, syn='a synthesized grunt')
def _():
    g = shout(0.2, [(0, 165), (0.2, 115)], [560, 1050, 2400], k=2.2, seed=13)
    return mix(K('imp/impactPunch_medium_002', rate=0.85, db=-3), at(shape(g, [(0, 0), (0.1, 1), (1, 0)]), 0.02))


@S('sfx_berserkerrage', HI, 1.8, syn='a synthesized berserker roar over war-drum hits', fade=0.3)
def _():
    d = 1.3
    roar = shout(d, [(0, 120), (0.25, 175), (0.9, 165), (d, 120)], [640, 1100, 2450], k=3.2, seed=15, vib=(7, 14))
    growl = jitter_am(svf(noise(d, 'brown', seed=16), 300, 0.9), 38, 0.8, seed=17)
    roar = shape(mix(roar, gain(growl, -4)), [(0, 0), (0.06, 1), (0.8, 0.85), (1, 0)])
    drums = mix(*[at(mix(gain(thump(0.4, 95, 40, 0.14), 1), K('imp/impactPunch_heavy_00%d' % i, rate=0.6, db=-6)), t)
                  for i, t in enumerate([0.0, 0.32, 0.64])])
    return mix(at(roar, 0.08), gain(drums, -1))


@S('sfx_berserkerdie', REF, 1.6, syn='a synthesized dying groan', fade=0.4)
def _():
    groan = shout(1.0, [(0, 170), (0.3, 150), (1.0, 80)], [600, 980, 2300], k=1.8, seed=19, vib=(4, 6))
    groan = shape(groan, [(0, 0), (0.1, 1), (0.6, 0.6), (1, 0)])
    return mix(groan, at(K('imp/impactPunch_heavy_003', rate=0.7), 0.45), at(gain(thump(0.5, 80, 35, 0.2), 0), 0.45),
               at(K('imp/footstep_snow_004', rate=0.7, db=-2), 0.5), at(K('rpg/dropLeather', rate=0.8, db=-4), 0.55))


# ======================= Shieldmaiden Sabatons =======================
@S('sfx_shieldmaidenspawn', TELL, 1.0, syn='a synthesized battle shout')
def _():
    ha = shout(0.32, [(0, 310), (0.08, 380), (0.32, 300)], [850, 1400, 2900], k=1.8, seed=21)
    ha = shape(ha, [(0, 0), (0.08, 1), (0.6, 0.8), (1, 0)])
    bang = mix(K('imp/impactWood_heavy_002', rate=0.9), at(K('imp/impactMetal_medium_001', rate=0.9, db=-5), 0.005))
    return mix(bang, at(chain_rattle(0.45, 8, seed=22, rate=1.3), 0.05), at(gain(ha, -1), 0.2))


@S('sfx_shieldmaidenparry', HI, 1.2, syn='a synthesized ringing shield-boss clang', fade=0.3)
def _():
    ring = mix(bell(1.0, 1180, d=0.35), gain(bell(0.8, 1655, d=0.25), -6))
    return mix(K('imp/impactMetal_heavy_003', rate=1.05), at(K('imp/impactPlate_medium_002', rate=1.2, db=-4), 0.004),
               at(K('imp/impactWood_medium_001', rate=0.9, db=-6), 0.0), at(gain(ring, -9), 0.006),
               at(gain(whoosh(0.18, 2500, 900, q=1.2), -14), 0.0))


@S('sfx_shieldmaidenhurt', LOW, 0.5, syn='a synthesized grunt and mail rattle')
def _():
    g = shout(0.15, [(0, 330), (0.15, 250)], [800, 1350, 2800], k=1.6, seed=25)
    return mix(K('imp/impactPlate_light_001', rate=1.0, db=-2), at(chain_rattle(0.25, 4, seed=26, rate=1.4), 0.02),
               at(gain(shape(g, [(0, 0), (0.1, 1), (1, 0)]), -3), 0.02))


@S('sfx_shieldmaidendie', REF, 1.8, syn='a synthesized gasp, armour and a falling shield', fade=0.4)
def _():
    gasp = shout(0.4, [(0, 360), (0.4, 220)], [800, 1300, 2800], k=1.4, seed=27)
    gasp = shape(gasp, [(0, 0), (0.1, 1), (1, 0)])
    return mix(gasp, at(K('imp/impactPlate_heavy_002', rate=0.9), 0.3), at(chain_rattle(0.7, 12, seed=28, rate=1.1), 0.3),
               at(K('imp/impactWood_medium_003', rate=0.8, db=-3), 0.62), at(K('imp/impactWood_light_002', rate=0.85, db=-8), 0.86),
               at(K('imp/impactWood_light_004', rate=0.9, db=-12), 1.0))
