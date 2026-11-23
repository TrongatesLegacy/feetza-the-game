#!/usr/bin/env python3
"""Build Feetza sounds from REAL recordings (Freesound, CC0 / CC-BY), with ffmpeg doing all the audio work.

  python3 -I scripts/real-sfx/build.py SRC_DIR [OUT_DIR] [name ...]

SRC_DIR holds the Freesound HQ previews, named <id>-<slug>.ogg as scripts/sfx-fetch/freesound.mjs saves them.
Fetch the whole set with:

  node scripts/sfx-fetch/freesound.mjs get 870650 870651 623449 623441 85897 57204 527740 416507 161340 \\
       319590 370203 492237 371353 20185 443653 265554 505124 539972 683179 421881 --out SRC_DIR

OUT_DIR defaults to public/audio. Names (default: all): spartanchant spartanrage. Each sound is cut, pitched,
layered and placed by the recipe below, given a short room, then levelled to a 50 ms RMS peak (the same measure
as the TRIM table in src/systems/audio.ts), limited under -1.5 dBFS, faded, and saved as 44.1 kHz mono 96 kbps
MP3. Every source used is credited in public/audio/CREDITS.md and public/audio/credits.json.

Only the Python standard library and ffmpeg are needed. Pitch shifts keep a layer's length (asetrate + atempo),
unless keep=False, which lets a bark run a little shorter or longer like a different man's voice would.
"""
import array
import glob
import math
import os
import shutil
import subprocess
import sys
import tempfile

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = None
TMP = None  # made in main
PAD = 3.0  # every layer is padded to this length so amix sums the same samples every run (see layer())


def src(fid):
    hits = glob.glob(os.path.join(SRC, '%d-*.ogg' % fid)) + glob.glob(os.path.join(SRC, '%d-*.mp3' % fid))
    if not hits:
        sys.exit('missing Freesound %d in %s (fetch it with scripts/sfx-fetch/freesound.mjs get %d --out %s)' % (fid, SRC, fid, SRC))
    return hits[0]


def ff(args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args, check=True)


_n = [0]


def tmp(ext='wav'):
    _n[0] += 1
    return os.path.join(TMP, 'x%03d.%s' % (_n[0], ext))


def L(fid, start, dur, at, semis=0.0, db=0.0, fin=0.004, fout=0.03, keep=True, fx=''):
    """one layer: Freesound <fid> from <start> s for <dur> s (source time), shifted <semis> semitones, at <db>,
    placed at <at> s in the output, with its own fades and any extra ffmpeg filters."""
    return dict(fid=fid, start=start, dur=dur, at=at, semis=semis, db=db, fin=fin, fout=fout, keep=keep, fx=fx)


def chain(l):
    r = 2 ** (l['semis'] / 12.0)
    f = ['aresample=%d' % SR, 'aformat=sample_fmts=flt:channel_layouts=mono',
         'atrim=start=%.4f:duration=%.4f' % (l['start'], l['dur']), 'asetpts=PTS-STARTPTS']
    out_dur = l['dur']
    if abs(r - 1) > 1e-6:
        f += ['asetrate=%d' % round(SR * r), 'aresample=%d' % SR]
        if l['keep']:
            f.append('atempo=%.5f' % (1 / r))
        else:
            out_dur = l['dur'] / r
    if l['fx']:
        f.append(l['fx'])
    f += ['volume=%.2fdB' % l['db'], 'afade=t=in:d=%.4f' % l['fin'],
          'afade=t=out:st=%.4f:d=%.4f' % (max(0, out_dur - l['fout']), l['fout'])]
    if l['at'] > 0:
        f.append('adelay=%d' % round(l['at'] * 1000))
    f.append('apad=whole_dur=%.1f' % PAD)
    return ','.join(f)


def layer(layers, post=''):
    """render a list of layers into one float wav, summed (no normalising), with an optional post chain. Each layer
    is padded to PAD seconds first: amix with inputs ending at different times isn't deterministic run to run."""
    args, fc = [], []
    for i, l in enumerate(layers):
        args += ['-i', src(l['fid'])]
        fc.append('[%d:a]%s[l%d]' % (i, chain(l), i))
    mix = ''.join('[l%d]' % i for i in range(len(layers)))
    fc.append('%samix=inputs=%d:normalize=0:dropout_transition=0%s[o]' % (mix, len(layers), (',' + post) if post else ''))
    out = tmp()
    ff(args + ['-filter_complex', ';'.join(fc), '-map', '[o]', '-c:a', 'pcm_f32le', out])
    return out


def mixw(parts, post=''):
    """sum already-rendered wavs: parts = [(path, db)]."""
    args, fc = [], []
    for i, (p, db) in enumerate(parts):
        args += ['-i', p]
        fc.append('[%d:a]volume=%.2fdB[m%d]' % (i, db, i))
    fc.append('%samix=inputs=%d:normalize=0:dropout_transition=0%s[o]' % (''.join('[m%d]' % i for i in range(len(parts))), len(parts), (',' + post) if post else ''))
    out = tmp()
    ff(args + ['-filter_complex', ';'.join(fc), '-map', '[o]', '-c:a', 'pcm_f32le', out])
    return out


def fx(p, chain_):
    out = tmp()
    ff(['-i', p, '-af', chain_, '-c:a', 'pcm_f32le', out])
    return out


def room_ir(rt60, seed, lp=6000, hp=180, predelay=0.008):
    """a short room's impulse response: pink noise decaying exponentially to -60 dB over rt60, darkened."""
    out = tmp()
    k = 6.91 / rt60
    ff(['-f', 'lavfi', '-i', 'anoisesrc=d=%.3f:c=pink:r=%d:a=0.5:seed=%d' % (rt60 * 1.1, SR, seed), '-af',
        "asetnsamples=n=32,volume='exp(-%.4f*t)':eval=frame,highpass=f=%d,lowpass=f=%d,afade=t=in:d=0.003,adelay=%d" % (k, hp, lp, round(predelay * 1000)),
        '-ac', '1', '-c:a', 'pcm_f32le', out])
    return out


def reverb(p, rt60=0.45, wet_db=-11.0, seed=7):
    """the dry sound plus its convolution with a short room, the wet set <wet_db> under the dry's 50 ms RMS peak."""
    ir = room_ir(rt60, seed)
    wet = tmp()
    ff(['-i', p, '-i', ir, '-filter_complex', '[0:a]apad=pad_dur=%.3f[d];[d][1:a]afir=irnorm=2[o]' % (rt60 + 0.1),
        '-map', '[o]', '-c:a', 'pcm_f32le', wet])
    return mixw([(p, 0), (wet, rms50(read(p)) + wet_db - rms50(read(wet)))])


def read(p):
    """decode any audio file to mono float samples (float, so an unlimited intermediate isn't clipped on the way)."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return array.array('f', raw).tolist()


def rms50(x):
    """the 50 ms RMS peak in dB: the loudest of back-to-back 50 ms windows (as scripts/boss-sfx/render.py)."""
    win = int(0.05 * SR)
    best = 0.0
    for st in range(0, max(1, len(x) - win + 1), win):
        seg = x[st:st + win]
        best = max(best, sum(v * v for v in seg) / len(seg))
    return 10 * math.log10(best) if best > 0 else -120.0


def peak(x):
    return 20 * math.log10(max(abs(v) for v in x) or 1e-9)


def master(p, name, dur, level, fade, comp='acompressor=threshold=-20dB:ratio=2.5:attack=6:release=90:knee=4'):
    """level a mix to a 50 ms RMS peak of <level> dB (before TRIM), limited under -1.5 dBFS, cut to <dur> with a
    <fade> s fade-out, trailing silence trimmed, saved as MP3. (Leading silence is left alone: the recipes start
    on their first sound, and the beats are placed in absolute time.)"""
    body = fx(p, 'areverse,silenceremove=start_periods=1:start_threshold=-62dB,areverse,highpass=f=40,%s,atrim=duration=%.3f' % (comp, dur))
    end = len(read(body)) / SR  # fade over the end of what's left after the silent tail is gone
    pre = fx(body, 'afade=t=out:st=%.3f:d=%.3f' % (max(0, end - fade), min(fade, end)))
    g = level - rms50(read(pre))
    out = os.path.join(OUT, name + '.mp3')
    for _ in range(8):  # level the encoded file itself: MP3 framing moves the 50 ms grid a little
        lim = fx(pre, 'volume=%.2fdB,alimiter=limit=0.84:attack=1.5:release=60:level=0:latency=1,afade=t=in:d=0.003' % g)
        ff(['-i', lim, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '96k', out])
        got = rms50(read(out))
        if abs(got - level) < 0.15:
            break
        g += 1.3 * (level - got)  # the limiter eats part of each step, so overshoot a little
    else:
        print('warning: %s reached %.2f dB, not the %.1f dB target; set its TRIM from the measured level' % (name, got, level))
    x = read(out)
    print('%s: %.2f s, 50 ms RMS peak %.1f dB, sample peak %.1f dBFS' % (out, len(x) / SR, rms50(x), peak(x)))


# =============================== King Leonidas's phalanx chant: HOOOOH... HOO! HOO! ===============================
# Timing as the synthesized version: a ~0.9 s rising HOOOOH cut off together, then two barks landing at 1.02 s and
# 1.38 s, each on a crash of spears on bronze shields and a stamp. About 2.2 s, in a short stone room.
BARK1, BARK2 = 1.02, 1.38
DARK = 'lowpass=f=3800,equalizer=f=220:t=q:w=1.2:g=2'  # chesty, a little dark: men in bronze, not a stadium


def chant():
    # --- the long rising HOOOOH: two real group "ooh"s (CHallSmith, CC0), each doubled at other pitches and a few
    # ms apart, so 10+ voices swell up together; the Kingly Yell's held vowel (WelvynZPorterSamples, CC0), darkened
    # and pitched down, as the front-rank voice that carries the sustain. All cut off together at 0.9 s.
    ooh = 'highpass=f=90,' + DARK
    rise = layer([
        L(870650, 0.26, 0.96, 0.000, 0.0, 0, fin=0.06, fout=0.08, fx=ooh),
        L(870650, 0.26, 0.96, 0.024, -2.0, -2, fin=0.06, fout=0.08, fx=ooh),
        L(870650, 0.26, 0.96, 0.041, +1.5, -3, fin=0.06, fout=0.08, fx=ooh),
        L(870651, 0.40, 0.94, 0.012, -1.0, -1, fin=0.06, fout=0.08, fx=ooh),
        L(870651, 0.40, 0.94, 0.033, +2.0, -4, fin=0.06, fout=0.08, fx=ooh),
        L(870651, 0.40, 0.94, 0.005, -3.0, -3, fin=0.06, fout=0.08, fx=ooh),
        L(623449, 0.50, 0.94, 0.010, -2.0, -2, fin=0.12, fout=0.08, fx='lowpass=f=1600,equalizer=f=500:t=q:w=1:g=3'),
        L(623449, 0.50, 0.94, 0.030, -5.0, -6, fin=0.15, fout=0.08, fx='lowpass=f=1400'),
    ], post="asetnsamples=n=64,volume='0.16+0.84*pow(min(1,t/0.85),1.6)':eval=frame")  # a swell (+16 dB) into the top of the rise

    # --- two barked HOO!s: each a pile of real single shouts (HA!, HUH!, Whoo!) and group shouts (Men Shouting Hey,
    # Hey men together, Crowd Chanting HEY), each at a couple of pitches, their voiced onsets lined up within ~30 ms
    # of the beat. Bark 2 uses other pitches and offsets and sits a touch higher, as a chant's last beat does.
    def bark(t, up, seed):
        o = [0.000, 0.012, 0.021, 0.006, 0.028, 0.016, 0.009, 0.019, 0.003, 0.025][seed % 2:] * 2
        b = 'highpass=f=110,' + DARK
        return [
            L(623441, 0.315, 0.21, t - 0.006 + o[0], -2.0 + up, 0, fout=0.07, keep=False, fx=b),   # HA!
            L(623441, 0.315, 0.21, t + o[1], +1.0 + up, -3, fout=0.07, keep=False, fx=b),
            L(85897, 0.025, 0.21, t + o[2], -3.0 + up, -2, fout=0.08, keep=False, fx=b),           # HUH!
            L(85897, 0.025, 0.21, t + o[3], -0.5 + up, -5, fout=0.08, keep=False, fx=b),
            L(161340, 0.04, 0.20, t + o[4], -2.5 + up, -4, fout=0.08, keep=False, fx=b),           # Whoo!
            L(57204, 0.08, 0.22, t - 0.004 + o[5], -1.5 + up, -6, fout=0.09, keep=False, fx=b),     # men: HEY
            L(527740, 0.07, 0.21, t + o[6], -2.0 + up, -3, fout=0.09, keep=False, fx=b),           # men together: HEY
            L(416507, 0.00, 0.21, t + o[7], -1.0 + up, -5, fout=0.09, keep=False, fx=b),           # crowd: HEY
        ]
    barks = layer(bark(BARK1, 0.0, 0) + bark(BARK2, 0.7, 1))

    # --- spears on bronze shields on each bark: Shield Bash Impact, shield guard, the bludgeon hit off Shield Breaking,
    # three Iron Hits, each slightly re-pitched (bronze rings lower than steel) and a few ms apart so it reads as a
    # rank of men, and a real foot stamp an octave down under it.
    def clang(t, v):
        s = [0.0, 0.007, 0.013, 0.004, 0.019, 0.010, 0.016][v:] + [0.0, 0.007, 0.013, 0.004, 0.019, 0.010, 0.016][:v]
        return [
            L(319590, 0.115, 0.32, t - 0.002 + s[0], -1.5, 0, fin=0.001, fout=0.14),
            L(370203, 0.000, 0.30, t + s[1], -3.0, -3, fin=0.001, fout=0.14),
            L(492237, 0.585, 0.32, t + s[2], -2.0, -4, fin=0.002, fout=0.14),
            L(371353, 0.000, 0.32, t + s[3], -4.0, -5, fin=0.001, fout=0.16),
            L(371353, 1.190, 0.32, t + s[4], -2.0, -7, fin=0.001, fout=0.16),
            L(371353, 1.790, 0.32, t + s[5], -5.0, -7, fin=0.001, fout=0.16),
            L(20185, 0.000, 0.18, t - 0.004, -12.0 if v else -11.0, 1, fin=0.001, fout=0.12, keep=False, fx='lowpass=f=1500'),
        ]
    clangs = layer(clang(BARK1, 0) + clang(BARK2, 3), post='highpass=f=50')

    mix = mixw([(rise, -9.0), (barks, 0.0), (clangs, -3.0)])
    return reverb(mix, rt60=0.5, wet_db=-10.0, seed=11)


# =============================== the Kratos Peel's Spartan Rage: a bestial RAAAGH! and a burst of fire ===============
def rage():
    # --- the roar: "grito ira", a man's full-throat rage scream (juliandmc4, CC0), doubled two and five semitones
    # down; a second man's "Studio roar" (AugustSandberg, CC0) three down under it; and a little of a Monster Roar
    # (mitchanary, CC BY 4.0) for growl and weight in the low end.
    roar = layer([
        L(443653, 0.00, 1.95, 0.000, -2.0, 0, fin=0.01, fout=0.5, fx='highpass=f=80'),
        L(443653, 0.00, 1.95, 0.019, -5.0, -3, fin=0.01, fout=0.5, fx='highpass=f=60,lowpass=f=5000'),
        L(265554, 0.04, 1.90, 0.035, -3.0, -6, fin=0.02, fout=0.5, fx='highpass=f=60'),
        L(505124, 0.20, 1.60, 0.060, -3.0, -11, fin=0.08, fout=0.5, fx='lowpass=f=2500'),
    ], post='equalizer=f=160:t=q:w=1:g=2,equalizer=f=2800:t=q:w=1.5:g=2')

    # --- the rage catching fire as the roar opens up: Fire Burst Flash (Za-Games, CC0) for the ignition crack,
    # Fireball (NearTheAtmoshphere, CC0) for the rushing body, the opening of GregorQuendel's Fire Impacts Complex 04
    # (CC BY 4.0) for depth, and a real foot stomp two octaves down as the thud under the flare.
    T = 0.22
    fire = layer([
        L(539972, 0.00, 0.76, T, 0.0, 0, fin=0.002, fout=0.3),
        L(683179, 0.00, 1.55, T + 0.01, -2.0, -4, fin=0.01, fout=0.6),
        L(421881, 0.00, 1.30, T + 0.02, -3.0, -8, fin=0.005, fout=0.6),
        L(20185, 0.00, 0.45, T - 0.005, -19.0, -4, fin=0.002, fout=0.25, keep=False, fx='lowpass=f=600'),
    ], post='highpass=f=45')
    mix = mixw([(roar, 0.0), (fire, -2.0)])
    return reverb(mix, rt60=0.6, wet_db=-14.0, seed=23)


RECIPES = {
    'spartanchant': ('sfx_hero_spartanchant', chant, 2.25, -10.3, 0.3),
    'spartanrage': ('sfx_hero_spartanrage', rage, 1.9, -10.3, 0.45),
}

if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    SRC = os.path.abspath(args.pop(0))
    OUT = os.path.join(ROOT, 'public', 'audio')
    if args and args[0] not in RECIPES and (os.sep in args[0] or os.path.isdir(args[0])):
        OUT = os.path.abspath(args.pop(0))
    bad = [a for a in args if a not in RECIPES]
    if bad:
        sys.exit('unknown sound(s) %s; known: %s (an OUT_DIR must exist or contain a /)' % (' '.join(bad), ' '.join(RECIPES)))
    os.makedirs(OUT, exist_ok=True)
    TMP = tempfile.mkdtemp(prefix='real-sfx-')
    try:
        for nm in args or list(RECIPES):
            key, fn, dur, level, fade = RECIPES[nm]
            master(fn(), key, dur, level, fade)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
