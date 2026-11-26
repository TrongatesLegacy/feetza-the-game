#!/usr/bin/env python3
"""Build Feetza sounds from REAL recordings (Freesound, CC0 / CC-BY), with ffmpeg doing all the audio work.

  python3 -I scripts/real-sfx/build.py SRC_DIR [OUT_DIR] [name ...]

SRC_DIR holds the Freesound HQ previews, named <id>-<slug>.ogg as scripts/sfx-fetch/freesound.mjs saves them.
Fetch the whole set with:

  node scripts/sfx-fetch/freesound.mjs get 870650 870651 623449 623441 85897 57204 527740 416507 161340 \\
       319590 370203 492237 371353 20185 443653 265554 505124 539972 683179 421881 --out SRC_DIR

and, for the audio pass's batch 1 (docs/audio-audit.md):

  node scripts/sfx-fetch/freesound.mjs get 685111 116779 392624 714257 332602 208111 234782 520071 250703 \\
       651293 349459 651292 326304 467301 199325 326301 861820 861819 861821 588570 251611 79678 79672 415510 \\
       476011 320345 149190 819668 763026 615047 744100 577768 593623 826196 381853 721601 397054 495117 \\
       719129 350917 128969 125744 719638 475131 485245 82115 683400 434627 540788 472478 --out SRC_DIR

(it also uses 20185 and 371353 from the first set). A few batch-1 recipes keep a layer of the synthesized file they
replace, read from git at OLD_REV, so they need the repo's history (a shallow clone won't do).

OUT_DIR defaults to public/audio. Names (default: all): spartanchant spartanrage, then the batch-1 names in RECIPES
(service sweephop ... tailboing). Each sound is cut, pitched,
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


# The synthesized sounds some recipes keep a layer of (L('old:<key>', ...)): each file as it was before the real
# recordings replaced it, read from git at this commit, so a rebuild never layers a real sound over itself.
OLD_REV = '7c1a840'


def src(fid):
    if isinstance(fid, str) and fid.startswith('old:'):
        key = fid[4:]
        out = os.path.join(TMP, 'old-%s.mp3' % key)
        if not os.path.exists(out):
            blob = subprocess.run(['git', '-C', ROOT, 'show', '%s:public/audio/%s.mp3' % (OLD_REV, key)], capture_output=True, check=True).stdout
            open(out, 'wb').write(blob)
        return out
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


# =============================== Audio pass, batch 1: the sounds heard most (docs/audio-audit.md, P1) ===============
# Each replaces a synthesized file under the same name, on the same beats as the old one (its onsets measured from
# the old file), and keeps the old file's TRIM entry: its level (RECIPES) lands within about 2 dB of the old file on
# both the 50 ms RMS peak and the momentary loudness. 'old:<key>' layers keep a part of the old synth where it did
# something a recording can't (a sub under a footstep, ice tinkles over a gust).

# --- Act 1 · Trattoria Nonna: the Head Waiter rings for service (the same desk bell struck twice) ---
def service():
    b = 'highpass=f=300'
    return layer([
        L(685111, 0.803, 0.95, 0.000, 0.0, 0, fin=0.001, fout=0.3, fx=b),      # a desk bell, struck
        L(685111, 0.803, 0.80, 0.150, 0.0, -1.5, fin=0.001, fout=0.3, fx=b),   # and again
        L(116779, 0.300, 0.80, 0.152, 0.0, -9, fin=0.001, fout=0.3, fx=b),     # a second bell's shimmer on the second
    ])


# --- Act 1 · Rooftop: the Chimney Sweep pops out of a chimney (a cork and a puff of soot) ---
def sweephop():
    return layer([
        L(392624, 0.135, 0.30, 0.000, -2.0, 0, fin=0.001, fout=0.12),            # champagne cork, a little lower
        L(714257, 0.000, 0.30, 0.015, 0.0, -5, fin=0.002, fout=0.12),            # puff of smoke
    ])


# --- ... and his soot column: a pillow poof and a smoke bomb, with a thump under them ---
def sweepsoot():
    return layer([
        L(332602, 0.080, 0.90, 0.000, -3.0, 0, fin=0.002, fout=0.4, fx='lowpass=f=6000'),   # smoke bomb, darker
        L(208111, 0.320, 0.60, 0.005, -2.0, -2, fin=0.003, fout=0.3),                       # pillow poof
        L(20185, 0.000, 0.35, 0.000, -12.0, -6, fin=0.001, fout=0.2, keep=False, fx='lowpass=f=500'),  # thump
    ])


# --- Act 1 · Iron Heel: the steam warning hiss (rising) and the steam burst ---
def heelhiss():
    return layer([
        L(234782, 0.02, 1.30, 0.000, 0.0, 0, fin=0.08, fout=0.1),               # a steam release
        L(520071, 0.45, 1.30, 0.000, 0.0, -8, fin=0.3, fout=0.1, fx='highpass=f=400'),  # a steam trap, behind
    ], post="asetnsamples=n=64,volume='0.35+0.65*min(1,t/1.0)':eval=frame")  # rising, as the old one did


def heelsteam():
    return layer([
        L(250703, 0.225, 0.48, 0.000, -1.0, 0, fin=0.002, fout=0.25),           # a jet of steam
        L(520071, 0.62, 0.90, 0.010, -1.0, -3, fin=0.01, fout=0.5),             # a steam trap blowing off
        L(371353, 1.812, 0.40, 0.000, -9.0, -10, fin=0.001, fout=0.25, fx='lowpass=f=3000'),  # the valve's clank
    ])


# --- Act 2 · Beach: Sandcastle Sam's shovel, his walls going up, and his sand pour ---
def shovel():
    return layer([
        L(651293, 0.000, 0.49, 0.000, -1.0, 0, fin=0.002, fout=0.12),           # a hand shovel into wet sand
        L(349459, 0.270, 0.40, 0.040, 0.0, -6, fin=0.01, fout=0.15),            # a deeper scrape under it
    ])


def sandwalls():
    return layer([
        L(651292, 0.000, 0.37, 0.000, -2.0, 0, fin=0.002, fout=0.15),           # the shovel slaps the sand in
        L(20185, 0.000, 0.40, 0.000, -6.0, -6, fin=0.001, fout=0.2, keep=False, fx='lowpass=f=900'),  # packed thump
        L(326304, 1.400, 1.00, 0.020, 0.0, 9, fin=0.03, fout=0.5, fx='lowpass=f=9000'),  # sand streaming down the walls
        L(467301, 1.700, 0.90, 0.060, 0.0, 14, fin=0.05, fout=0.45, fx='lowpass=f=9000'),  # and sliding off the shovel
    ])


def sandpour():
    return layer([
        L(199325, 0.300, 1.29, 0.000, 0.0, 0, fin=0.12, fout=0.2),              # sand poured onto slate
        L(326301, 0.600, 1.29, 0.000, 0.0, -2, fin=0.2, fout=0.25),             # and a longer fall
    ], post='lowpass=f=10000')


# --- Act 2 · King Honk: the bulb-horn wind-up (three squeezes, rising), the honk, the slide whistles ---
def honkwind():
    return layer([
        L(861820, 0.000, 0.20, 0.000, -1.0, 0, fin=0.003, fout=0.06),           # a rubber squeaker, squeezed
        L(861819, 0.150, 0.20, 0.320, 1.0, 0, fin=0.003, fout=0.06),            # again, higher
        L(861821, 0.085, 0.20, 0.640, 3.0, 1, fin=0.003, fout=0.06),            # and again, higher still
    ], post='highpass=f=200')


def honk():
    return layer([
        L(588570, 0.020, 0.62, 0.000, -2.0, 0, fin=0.004, fout=0.12),           # a clown horn held down
        L(251611, 0.120, 0.55, 0.000, -2.0, -5, fin=0.002, fout=0.2),           # a second horn on its attack
        L(588570, 0.020, 0.62, 0.012, -14.0, -8, fin=0.004, fout=0.12, fx='lowpass=f=900'),  # far lower under it: a king's horn
    ])


def leap():
    return layer([L(79678, 0.000, 0.48, 0.000, 0.0, 0, fin=0.004, fout=0.06)])  # slide whistle, up


def decoydrop():
    return layer([
        L(79672, 0.000, 0.46, 0.000, 0.0, 0, fin=0.004, fout=0.08),             # slide whistle, down
        L(208111, 0.320, 0.30, 0.380, -5.0, -3, fin=0.003, fout=0.15),          # landing on something soft
    ])


# --- Act 2 · Diner: the Short-Order Shoe's order bell, and the rush hour (three dings over the ticket printer) ---
def orderbell():
    return layer([L(415510, 0.462, 0.96, 0.030, 0.0, 0, fin=0.002, fout=0.25)])  # a shop counter bell


def rush():
    bell = [L(415510, 0.462, 0.70, t, s, d, fin=0.002, fout=0.25) for t, s, d in ((0.0, 0, 0), (0.12, 0.0, -0.5), (0.24, 0.4, 0.5))]
    return layer(bell + [L(476011, 1.880, 0.72, 0.010, 0.0, -2, fin=0.02, fout=0.2, fx='highpass=f=500')])  # receipt printer


# --- Act 2 · T-Rex Toes: the roar, the snack-time growl, the deep breath in, and a baby dino's squeak ---
# Built as film dinosaurs are: a big designed roar (999999990, CC0) for the body, a real tiger's roar under it, and
# a real elephant's trumpet in the top end for the scream; the growl is a real black bear's, pitched down.
def roar():
    return layer([
        L(320345, 2.940, 1.45, 0.000, -2.0, 0, fin=0.03, fout=0.35),            # the beast's roar
        L(149190, 5.880, 0.62, 0.120, -5.0, -9, fin=0.06, fout=0.25, fx='lowpass=f=2500'),  # a tiger's, lower
        L(819668, 0.020, 0.66, 0.050, -3.0, -10, fin=0.05, fout=0.25, fx='highpass=f=500'),  # an elephant's trumpet
        L('old:sfx_trex_roar', 0.0, 1.44, 0.0, 0.0, -6, fin=0.01, fout=0.3, fx='lowpass=f=160'),  # the old sub, under
    ])


def growl():
    return layer([
        L(763026, 2.760, 1.23, 0.000, -3.0, 0, fin=0.1, fout=0.25),             # a black bear's growl, lower
        L(763026, 2.760, 1.23, 0.015, -8.0, -6, fin=0.1, fout=0.25, fx='lowpass=f=1200'),  # and an octave-ish under
        L(320345, 0.170, 0.60, 0.550, -4.0, -10, fin=0.1, fout=0.3),            # the beast's breath through it
    ])


def breath():
    return layer([
        L(615047, 0.040, 1.02, 0.000, -6.0, 0, fin=0.08, fout=0.06),            # a deep breath in, a big chest
        L(615047, 0.040, 1.02, 0.010, -11.0, -4, fin=0.08, fout=0.06, fx='lowpass=f=1500'),
        L(320345, 0.200, 0.55, 0.420, -3.0, -8, fin=0.15, fout=0.1),            # the beast's breathing
    ])


def dinosqueak():
    return layer([
        L(744100, 0.205, 0.30, 0.000, -4.0, 0, fin=0.003, fout=0.06),           # a baby robin's two chirps, a bigger chick
        L(577768, 0.020, 0.16, 0.000, -5.0, -6, fin=0.003, fout=0.05),          # a lovebird under the first
    ], post='highpass=f=600')


# --- Act 3 · Ice Skate Ivy: the triple skate swish into an ice-spray stop; the snow cloud gust ---
def axel():
    return layer([
        L(593623, 0.400, 0.18, 0.000, 1.0, 0, fin=0.01, fout=0.06),             # three blade strokes, each a little
        L(593623, 2.200, 0.18, 0.210, 2.0, 0, fin=0.01, fout=0.06),             # brighter than the last
        L(593623, 4.880, 0.18, 0.420, 3.0, 1, fin=0.01, fout=0.06),
        L(826196, 4.150, 0.36, 0.600, 0.0, 2, fin=0.02, fout=0.2),              # a hockey stop: the ice spray
    ])


def snowgust():
    return layer([
        L(381853, 0.450, 1.22, 0.000, 0.0, 0, fin=0.1, fout=0.3),               # a real gust of wind
        L('old:sfx_iceskate_snow', 0.0, 1.22, 0.0, 0.0, -4, fin=0.01, fout=0.2, fx='highpass=f=3500'),  # the old ice tinkles
    ])


# --- Act 1 · Bigfoot: the big step, and the second Bigfoot arriving (two steps and a roar) ---
def bigstep():
    return layer([
        L(721601, 0.690, 0.80, 0.000, -2.0, 0, fin=0.002, fout=0.3),            # a giant's footstep
        L(20185, 0.000, 0.50, 0.000, -7.0, -4, fin=0.001, fout=0.25, keep=False, fx='lowpass=f=1200'),  # a stomp, lower
        L('old:sfx_bigfoot_bigstep', 0.0, 0.8, 0.0, 0.0, -5, fin=0.002, fout=0.25, fx='lowpass=f=140'),  # the old sub
    ])


def rampage():
    return layer([
        L(721601, 0.690, 0.40, 0.000, -1.0, 0, fin=0.002, fout=0.2),            # step
        L(721601, 0.690, 0.40, 0.280, -3.0, 0, fin=0.002, fout=0.2),            # step
        L(397054, 0.140, 0.95, 0.300, -3.0, -3, fin=0.03, fout=0.3),            # an alpha gorilla's roar, lower
        L(763026, 3.000, 0.95, 0.320, -4.0, -8, fin=0.05, fout=0.3),            # a bear's growl under it
    ])


# --- thrown props (heard whenever a peel or topping throws): splat, rubber duck, bowling ball, rope, heave ---
def hitsplat():
    return layer([
        L(495117, 0.010, 0.25, 0.000, 0.0, 0, fin=0.001, fout=0.1, fx='lowpass=f=6000'),  # a wet cloth slapped into water
        L(719129, 0.030, 0.25, 0.004, 0.0, -5, fin=0.001, fout=0.1, fx='lowpass=f=6000'),  # a soaked towel against a wall
    ])


def hitsqueak():
    return layer([
        L(350917, 0.090, 0.24, 0.000, 0.0, 0, fin=0.003, fout=0.06),            # a rubber duck, squeezed
        L(208111, 0.330, 0.15, 0.000, 0.0, -10, fin=0.002, fout=0.08),          # its soft bump
    ])


def rollrumble():
    return layer([
        L(128969, 0.300, 0.65, 0.000, 0.0, 0, fin=0.03, fout=0.15),             # a bowling ball down the alley
        L(125744, 0.300, 0.65, 0.000, -2.0, -5, fin=0.03, fout=0.15),
    ])


def tossrope():
    return layer([L(719638, 1.250, 0.44, 0.000, 0.0, 0, fin=0.01, fout=0.08, fx='highpass=f=80')])  # a lasso: one last swing round, and the throw


def tossheavy():
    return layer([
        L(475131, 0.000, 0.32, 0.000, -1.0, 0, fin=0.005, fout=0.1),            # a super-heavy swoosh
        L(485245, 0.010, 0.30, 0.010, -2.0, -4, fin=0.005, fout=0.1),           # a heavy swing
    ])


# --- peel smack tails (on every smack with that peel): the balloon pop, the gull, the counter bell, the royal
# honk, the pogo boing ---
def tailpop():
    return layer([L(82115, 0.070, 0.10, 0.000, 0.0, 0, fin=0.001, fout=0.04)])  # a balloon bursting


def tailsquawk():
    return layer([L(683400, 0.110, 0.36, 0.000, 0.0, 0, fin=0.005, fout=0.1, fx='highpass=f=400')])  # a seagull's call


def tailbell():
    return layer([L(434627, 0.000, 0.60, 0.000, 0.0, 0, fin=0.001, fout=0.2)])  # a small reception bell


def kinghonk():
    return layer([
        L(588570, 0.020, 0.24, 0.000, -2.0, 0, fin=0.003, fout=0.04),           # the clown horn, twice: a fourth up
        L(588570, 0.020, 0.30, 0.260, 3.0, 0, fin=0.003, fout=0.1),             # for the king
    ])


def tailboing():
    return layer([
        L(540788, 0.000, 0.40, 0.000, 0.0, 0, fin=0.002, fout=0.12),            # a jaw harp's boing
        L(472478, 0.000, 0.40, 0.000, 0.0, -8, fin=0.001, fout=0.15, fx='lowpass=f=3000'),  # a real spring under it
    ])


RECIPES = {
    'spartanchant': ('sfx_hero_spartanchant', chant, 2.25, -10.3, 0.3),
    'spartanrage': ('sfx_hero_spartanrage', rage, 1.9, -10.3, 0.45),
    # batch 1. Level: halfway between the old file's 50 ms RMS peak and the level that matches its loudest 400 ms of
    # momentary loudness (EBU R128), so a recording that's denser or brighter than the synth doesn't come out louder.
    'service': ('sfx_headwaiter_service', service, 0.97, -12.9, 0.3),
    'sweephop': ('sfx_sweep_hop', sweephop, 0.30, -13.6, 0.1),
    'sweepsoot': ('sfx_sweep_soot', sweepsoot, 0.90, -12.8, 0.3),
    'heelhiss': ('sfx_ironheel_hiss', heelhiss, 1.29, -12.6, 0.08),
    'heelsteam': ('sfx_ironheel_steam', heelsteam, 0.90, -11.2, 0.35),
    'shovel': ('sfx_sandcastle_shovel', shovel, 0.49, -12.1, 0.1),
    'sandwalls': ('sfx_sandcastle_walls', sandwalls, 1.00, -9.8, 0.35),
    'sandpour': ('sfx_sandcastle_pour', sandpour, 1.29, -12.5, 0.25),
    'honkwind': ('sfx_clownking_honkwind', honkwind, 0.84, -11.0, 0.05),
    'honk': ('sfx_clownking_honk', honk, 0.69, -8.6, 0.12),
    'leap': ('sfx_clownking_leap', leap, 0.48, -9.8, 0.05),
    'decoydrop': ('sfx_clownking_decoydrop', decoydrop, 0.54, -11.7, 0.1),
    'orderbell': ('sfx_shortorder_bell', orderbell, 0.96, -11.3, 0.25),
    'rush': ('sfx_shortorder_rush', rush, 0.74, -10.7, 0.2),
    'roar': ('sfx_trex_roar', roar, 1.44, -9.1, 0.3),
    'growl': ('sfx_trex_growl', growl, 1.23, -11.6, 0.2),
    'breath': ('sfx_trex_breath', breath, 1.02, -11.4, 0.06),
    'dinosqueak': ('sfx_trex_dinosqueak', dinosqueak, 0.30, -12.8, 0.05),
    'axel': ('sfx_iceskate_axel', axel, 0.96, -11.6, 0.2),
    'snowgust': ('sfx_iceskate_snow', snowgust, 1.22, -12.4, 0.3),
    'bigstep': ('sfx_bigfoot_bigstep', bigstep, 0.80, -11.7, 0.25),
    'rampage': ('sfx_bigfoot_rampage', rampage, 1.24, -13.2, 0.25),
    'hitsplat': ('sfx_hitsplat', hitsplat, 0.25, -14.8, 0.08),
    'hitsqueak': ('sfx_hitsqueak', hitsqueak, 0.24, -12.6, 0.05),
    'rollrumble': ('sfx_rollrumble', rollrumble, 0.65, -13.4, 0.15),
    'tossrope': ('sfx_tossrope', tossrope, 0.44, -13.3, 0.08),
    'tossheavy': ('sfx_tossheavy', tossheavy, 0.32, -12.8, 0.08),
    'tailpop': ('sfx_smack_tail_pop', tailpop, 0.10, -14.1, 0.03),
    'tailsquawk': ('sfx_smack_tail_squawk', tailsquawk, 0.36, -13.4, 0.08),
    'tailbell': ('sfx_smack_tail_bell', tailbell, 0.60, -14.2, 0.15),
    'kinghonk': ('sfx_smack_tail_kinghonk', kinghonk, 0.56, -11.4, 0.08),
    'tailboing': ('sfx_smack_tail_boing', tailboing, 0.40, -13.3, 0.1),
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
