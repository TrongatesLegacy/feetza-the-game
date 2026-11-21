"""Thrown-prop SFX (src/game/projectiles.ts): a launch and an impact for each family of props.
Built with the boss-sfx kit (../boss-sfx: dsp.py, render.py), so levels are measured the same way.

  KENNEY=/path/to/kenney python3 -I build.py OUTDIR    # Kenney CC0 packs from ../boss-sfx/getpacks.sh
Then copy OUTDIR/*.mp3 into public/audio and use report.json's trims for TRIM in src/systems/audio.ts.
Levels are the 50 ms RMS peak target after TRIM (the slap is about -10.5): launches sit well under it
(they fire often), impacts just under it, the explosion near it."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
from dsp import K, mix, at, env, shape, gain, tone, sweep, glide, noise, svf, formant, am, jitter_am, bell, whoosh, thump  # noqa: E402
from render import S, REG, build  # noqa: E402

LAUNCH, HIT, BIG = -14.5, -12.5, -11.0


# ——— launches ———
@S('sfx_tosssoft', LAUNCH, 0.3, syn='a short synthesized air swish')
def _():
    return mix(gain(whoosh(0.2, 500, 1900, q=1.4), -2), K('rpg/cloth1', 0, 0.2, rate=1.3, db=-8))


@S('sfx_tossflick', LAUNCH, 0.25, syn='a quick synthesized flick swish')
def _():
    return mix(gain(whoosh(0.13, 1400, 5200, q=1.6, pts=((0, 0), (0.3, 1), (1, 0))), 0), K('ui/click_002', rate=1.3, db=-12))


@S('sfx_tossspin', LAUNCH, 0.42, syn='a synthesized spinning whirr')
def _():
    w = am(whoosh(0.38, 700, 2400, q=2.0, pts=((0, 0), (0.15, 1), (1, 0))), 22, 0.85)
    return mix(gain(w, 0), K('ui/scroll_002', rate=1.2, db=-14))


@S('sfx_tossheavy', LAUNCH, 0.4, syn='a low synthesized heave and swish')
def _():
    return mix(gain(whoosh(0.32, 220, 900, q=1.1, color='brown'), 0), gain(thump(0.16, 140, 80, 0.05), -10))


@S('sfx_tossrope', LAUNCH, 0.48, syn='a synthesized lasso swing')
def _():
    w = am(whoosh(0.45, 400, 1500, q=1.3), 9, 0.9)
    return mix(gain(w, 0), at(K('rpg/beltHandle1', rate=1.2, db=-10), 0.02))


# ——— impacts ———
@S('sfx_hitsplat', HIT, 0.35, syn='a wet synthesized splat')
def _():
    wet = shape(svf(noise(0.25, 'pink'), sweep(2400, 500, 0.2), 1.4, 'lp'), [(0, 0), (0.03, 1), (0.25, 0.4), (1, 0)])
    return mix(K('imp/impactSoft_medium_000', rate=1.2, db=-2), gain(wet, -3), K('sci/slime_000', 0, 0.25, rate=1.4, db=-8))


@S('sfx_hittink', HIT, 0.3)
def _():
    return mix(K('imp/impactPlate_light_001', rate=1.35), K('imp/impactGlass_light_000', rate=1.2, db=-10))


@S('sfx_hitcoin', HIT, 0.5, syn='a synthesized coin ring')
def _():
    ring = mix(gain(bell(0.4, 2093, d=0.2), -6), at(gain(bell(0.35, 2637, d=0.18), -9), 0.05))
    return mix(K('rpg/handleCoins', 0, 0.22, rate=1.15, db=-2), ring, K('imp/impactPlate_light_000', rate=1.5, db=-8))


@S('sfx_hitclang', HIT, 0.4)
def _():
    return mix(K('imp/impactPlate_medium_000', rate=1.1), K('imp/impactMetal_light_001', rate=1.3, db=-9))


@S('sfx_hitbonk', HIT, 0.35, syn='a rubbery synthesized bonk')
def _():
    bonk = env(tone(0.22, glide([(0, 420), (0.04, 260), (0.22, 200)]), 'tri'), a=0.002, d=0.06, r=0.03)
    return mix(K('imp/impactSoft_heavy_000', rate=1.35, db=-3), gain(bonk, -4))


@S('sfx_hitthud', HIT, 0.45, syn='a low synthesized thump')
def _():
    return mix(K('imp/impactPunch_heavy_000', rate=0.95), gain(thump(0.3, 120, 45, 0.08), -4), K('imp/impactWood_heavy_000', rate=0.9, db=-10))


@S('sfx_hitboom', BIG, 0.9)
def _():
    return mix(K('sci/explosionCrunch_002', rate=1.1), K('sci/lowFrequency_explosion_000', 0, 0.7, rate=1.2, db=-5))


@S('sfx_hitrope', HIT, 0.35, syn='a synthesized rope snap')
def _():
    snap = shape(svf(noise(0.08), 2600, 1.2, 'bp'), [(0, 0), (0.05, 1), (1, 0)])
    return mix(K('rpg/beltHandle2', rate=1.1), gain(snap, -6), K('rpg/cloth3', 0, 0.2, db=-10))


@S('sfx_hitsqueak', HIT, 0.4, syn='a synthesized rubber-duck squeak')
def _():
    src = tone(0.24, glide([(0, 700), (0.05, 1300), (0.18, 1150), (0.24, 900)]), 'saw', vib=(28, 30))
    sq = env(formant(src, [1100, 2600], q=5, amps=[1.0, 0.5]), a=0.01, r=0.06)
    return mix(gain(sq, 0), K('imp/impactSoft_medium_000', rate=1.6, db=-10))


@S('sfx_hitrattle', HIT, 0.4, syn=None)
def _():
    return mix(K('cas/dice-shake-1', 0, 0.3, rate=1.25), K('imp/impactPlate_light_002', rate=1.4, db=-6))


@S('sfx_rollrumble', HIT, 0.7, syn='a synthesized rolling rumble')
def _():
    rum = jitter_am(svf(noise(0.65, 'brown'), 260, 0.9, 'lp'), 40, 0.6)
    return mix(gain(shape(rum, [(0, 0), (0.08, 1), (0.7, 0.8), (1, 0)]), 0), K('imp/impactWood_medium_000', rate=0.8, db=-6))


@S('sfx_beam', HIT, 0.5)
def _():
    return mix(K('sci/laserLarge_001', rate=1.0), K('dgt/zap1', rate=0.9, db=-8))


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    res = [build(r, out) for r in REG]
    json.dump(res, open(os.path.join(out, 'report.json'), 'w'), indent=1)
    for d in res:
        print(f"{d['key']:18s} dur={d['dur']:.2f} meas={d['measured']:6.1f} tgt={d['target']:6.1f} trim={d['trim']:.2f} peak={d['peak']:5.1f} lead={d['lead']:4.1f} clip={d['clip']}")
