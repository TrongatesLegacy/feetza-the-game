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

(it also uses 20185 and 371353 from the first set), and for batch 2:

  node scripts/sfx-fetch/freesound.mjs get 94162 346373 684459 433829 426208 637533 655040 423778 403915 539819 \\
       719766 649390 330585 651753 760672 578490 29986 741365 804810 442773 867457 553954 847049 539822 529295 \\
       568036 379329 431742 340664 514162 735907 162674 162668 445993 457449 383783 80595 196720 329519 505113 \\
       672776 805168 534856 316682 160797 143129 241258 789609 584168 869002 263115 222521 199803 66951 164483 \\
       477528 177495 --out SRC_DIR

(it also uses 593623, 826196, 763026 and 721601 from batch 1 and 20185 from the first set). Some batch-1 and batch-2
recipes keep a layer of the synthesized file they replace, read from git at OLD_REV, so they need the repo's history
(a shallow clone won't do).

OUT_DIR defaults to public/audio. Names (default: all): spartanchant spartanrage, then the batch-1 names in RECIPES
(service sweephop ... tailboing), then batch 2's (traytoss pie ... snap). Each sound is cut, pitched,
layered and placed by the recipe below (the Spartan sounds are also given a short convolution room), then levelled to a 50 ms RMS peak (the same measure
as the TRIM table in src/systems/audio.ts), limited under -1.5 dBFS (a recipe may set a lower limit, for a bright
transient that MP3 encoding would push past it), faded, and saved as 44.1 kHz mono 96 kbps
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
OLD_REV = '7c1a840a061796e1fb680e67fb7b8fe72363b37e'


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


def master(p, name, dur, level, fade, comp='acompressor=threshold=-20dB:ratio=2.5:attack=6:release=90:knee=4', limit=0.84):
    """level a mix to a 50 ms RMS peak of <level> dB (before TRIM), limited under -1.5 dBFS, cut to <dur> with a
    <fade> s fade-out, trailing silence trimmed, saved as MP3. (Leading silence is left alone: the recipes start
    on their first sound, and the beats are placed in absolute time.)"""
    body = fx(p, 'areverse,silenceremove=start_periods=1:start_threshold=-62dB,areverse,highpass=f=40,%s,atrim=duration=%.3f' % (comp, dur))
    end = len(read(body)) / SR  # fade over the end of what's left after the silent tail is gone
    pre = fx(body, 'afade=t=out:st=%.3f:d=%.3f' % (max(0, end - fade), min(fade, end)))
    g = level - rms50(read(pre))
    out = os.path.join(OUT, name + '.mp3')
    for _ in range(8):  # level the encoded file itself: MP3 framing moves the 50 ms grid a little
        lim = fx(pre, 'volume=%.2fdB,alimiter=limit=%.2f:attack=1.5:release=60:level=0:latency=1,afade=t=in:d=0.003' % (g, limit))
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
        L(721601, 0.690, 0.80, 0.000, -2.0, 0, fin=0.002, fout=0.3, fx='lowpass=f=1500'),  # a giant's footstep
        L(20185, 0.000, 0.50, 0.000, -7.0, -4, fin=0.001, fout=0.25, keep=False, fx='lowpass=f=1200'),  # a stomp, lower
        L('old:sfx_bigfoot_bigstep', 0.0, 0.8, 0.0, 0.0, -5, fin=0.002, fout=0.25, fx='lowpass=f=140'),  # the old sub
    ])


def rampage():
    return layer([
        L(721601, 0.690, 0.40, 0.000, -1.0, 0, fin=0.002, fout=0.2, fx='lowpass=f=1000'),  # step: its thud, not its branches
        L(721601, 0.690, 0.40, 0.280, -3.0, 0, fin=0.002, fout=0.2, fx='lowpass=f=1000'),  # step
        L(397054, 0.140, 0.95, 0.300, -3.0, -9, fin=0.03, fout=0.3),            # an alpha gorilla's roar, lower
        L(763026, 3.000, 0.95, 0.320, -4.0, -14, fin=0.05, fout=0.3),           # a bear's growl under it
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


# =============================== Audio pass, batch 2: the last P1 layers, then Acts 4–7 (docs/audio-audit.md) =====
# As batch 1: each replaces (or layers under) a synthesized file under the same name, on the old file's beats, and its
# level (RECIPES) sits halfway between the old file's 50 ms RMS peak and the level matching its momentary loudness.

# --- the Head Waiter's tray, thrown spinning: a thin metal disc spinning, lower, under the old whirr ---
def traytoss():
    return layer([
        L('old:sfx_headwaiter_traytoss', 0.0, 0.67, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(94162, 1.000, 0.67, 0.000, -3.0, 3, fin=0.01, fout=0.08, fx='highpass=f=250'),  # a metal disc spinning
    ])


# --- King Honk's wobbly pie: a real throw and a squelch of cream over the old wobble ---
def pie():
    return layer([
        L('old:sfx_clownking_pie', 0.0, 0.55, 0.0, 0.0, -1, fin=0.002, fout=0.08),
        L(346373, 0.080, 0.25, 0.020, -2.0, -2, fin=0.005, fout=0.08),           # a stick whipped through the air
        L(684459, 0.700, 0.32, 0.180, 0.0, 19, fin=0.01, fout=0.1),             # something thrown
        L(433829, 0.250, 0.40, 0.100, -3.0, 12, fin=0.03, fout=0.12, fx='lowpass=f=5000'),  # the cream wobbling
    ])


# --- the Cosmic Croc's meteor: a flaming torch whooshing, slowed and lowered into a roar, under the old whistle ---
def meteor():
    return layer([
        L('old:sfx_cosmiccroc_meteor', 0.0, 1.40, 0.0, 0.0, 0, fin=0.002, fout=0.08),
        L(426208, 0.300, 0.82, 0.280, -5.0, -11, fin=0.15, fout=0.2, keep=False, fx='lowpass=f=6000'),  # the burn
        L(637533, 0.000, 0.60, 0.800, -4.0, 1, fin=0.1, fout=0.2),            # flames bursting as it comes in
    ])


# --- the thrown props' rubbery bonk: a beach ball and a rubber ball bouncing, under the old bonk ---
def hitbonk():
    return layer([
        L('old:sfx_hitbonk', 0.0, 0.28, 0.0, 0.0, 0, fin=0.001, fout=0.05),
        L(655040, 0.420, 0.22, 0.000, -2.0, -8, fin=0.001, fout=0.08, fx='lowpass=f=3500'),           # a beach ball on wood
        L(423778, 0.080, 0.20, 0.002, 0.0, 1, fin=0.001, fout=0.08),           # a big rubber ball
    ])


# --- Act 4 · Dough Boy rising: real pizza dough kneaded, and bubbles, lower, for the yeast ---
def doughrise():
    return layer([
        L(403915, 12.300, 0.68, 0.000, -2.0, 20, fin=0.01, fout=0.08),           # pizza dough, kneaded
        L(403915, 9.330, 0.20, 0.050, -2.0, 24, fin=0.005, fout=0.08),
        L(403915, 12.960, 0.12, 0.560, -2.0, 20, fin=0.005, fout=0.06),
        L(539819, 1.250, 0.68, 0.000, -4.0, -2, fin=0.05, fout=0.1),            # bubbles, lower
    ])


# --- Nonna's Slipper: a wooden rolling pin rolled on a board, a second pass under it ---
def nonnapin():
    return layer([
        L(719766, 2.500, 1.60, 0.000, -3.0, 0, fin=0.02, fout=0.2, fx='lowpass=f=4000'),             # a rolling pin on a board
        L(719766, 5.600, 1.30, 0.250, -5.0, -5, fin=0.05, fout=0.2, fx='lowpass=f=4000'),            # and again, lower
        L('old:sfx_nonna_pin', 0.0, 1.60, 0.0, 0.0, 5, fin=0.01, fout=0.2, fx='lowpass=f=250'),  # the old rumble's low end
    ])


# --- the Pigeon King: a real pigeon's coo-roo, and the same lower for a king's chest ---
def coo():
    return layer([
        L(649390, 1.520, 0.61, 0.000, 0.0, 0, fin=0.01, fout=0.06),             # a male pigeon's territorial coo
        L(649390, 1.520, 0.61, 0.008, -5.0, -8, fin=0.01, fout=0.06),
    ])


# --- the Gargoyle's stony wing swoop: real wingbeats, lower, under the old swoop ---
def gargswoop():
    return layer([
        L('old:sfx_gargoyle_swoop', 0.0, 0.74, 0.0, 0.0, -1, fin=0.002, fout=0.08),
        L(330585, 2.320, 0.74, 0.000, -4.0, -9, fin=0.02, fout=0.2),            # a swan's beating wings, lower
        L(651753, 1.900, 0.70, 0.030, -3.0, 2, fin=0.05, fout=0.2),           # a large bird's flutter
    ])


# --- the Gargoyle turning to stone: heavy stone grinding and a slab dragged, settling with a knock ---
def gargstone():
    return layer([
        L(760672, 3.000, 1.00, 0.000, -2.0, 0, fin=0.01, fout=0.12),            # heavy stone grinding
        L(578490, 5.000, 1.00, 0.000, -3.0, 9, fin=0.02, fout=0.15),           # a stone slab sliding
        L(29986, 0.300, 0.30, 0.880, -3.0, -3, fin=0.003, fout=0.15),           # stone on stone: it settles
    ])


# --- the Gargoyle's storm: a chorus of crows, a hawk and a bat, pitched up for mini-gargoyles ---
def gargstorm():
    return layer([
        L(741365, 0.080, 0.74, 0.000, 4.0, 0, fin=0.01, fout=0.1),              # hooded crows cawing in panic
        L(741365, 1.050, 0.58, 0.220, 6.0, -2, fin=0.01, fout=0.1),
        L(741365, 2.770, 0.55, 0.420, 3.0, -2, fin=0.01, fout=0.12),
        L(804810, 0.040, 0.95, 0.040, 3.0, -13, fin=0.02, fout=0.15),            # a hawk's screech
    ])


# --- Act 5 · Kraken Toes: a big splash; a pizza dragged under (big glugs, a sink vortex, bubbles) ---
def krakensplash():
    return layer([
        L(442773, 0.000, 0.58, 0.000, -1.0, 0, fin=0.002, fout=0.15),           # a big water splash
        L(867457, 0.020, 0.56, 0.010, -2.0, 0, fin=0.002, fout=0.15),
    ])


def krakendrag():
    return layer([
        L(553954, 0.100, 1.00, 0.000, -6.0, 0, fin=0.005, fout=0.12),           # a bottle glugging, far lower
        L(847049, 2.000, 1.00, 0.000, -3.0, 0, fin=0.05, fout=0.15),           # water vortexing down a sink
        L(539822, 4.680, 0.90, 0.080, -4.0, 7, fin=0.03, fout=0.15),           # bubbles
    ])


# --- Milkshake Max's slurp: a straw slurped hard, a coffee slurp under it ---
def slurp():
    return layer([
        L(529295, 0.600, 0.65, 0.000, 0.0, 0, fin=0.01, fout=0.08),             # a straw slurp
        L(568036, 0.100, 0.65, 0.000, 0.0, -8, fin=0.02, fout=0.08),
    ])


# --- the Queen of the Rink: pizzas gliding on the ice; her speed-dash into a hockey stop ---
def rinkroll():
    return layer([
        L(379329, 2.000, 1.08, 0.000, 0.0, 0, fin=0.06, fout=0.2),              # skating
        L(593623, 0.300, 1.08, 0.000, 1.0, -4, fin=0.06, fout=0.2),             # skates on ice
    ])


def rinkdash():
    return layer([
        L(593623, 2.150, 0.26, 0.000, 2.0, 0, fin=0.01, fout=0.06),             # a hard stroke
        L(826196, 4.100, 0.50, 0.230, 0.0, 15, fin=0.01, fout=0.25),             # a hockey stop: the ice spray
    ])


# --- Act 6 · the Lumberjack: a two-stroke chainsaw revving; the spinning axe ---
def chainsaw():
    return layer([
        L(431742, 4.000, 1.25, 0.000, 0.0, 0, fin=0.02, fout=0.1),              # a chainsaw, running hard
        L(340664, 0.300, 1.20, 0.020, 0.0, -6, fin=0.05, fout=0.1),             # revving high
    ])


def axe():
    # a stick swung like an axe, six times round as it spins, each a little different
    sw = [L(514162, 0.180, 0.11, t, s, d, fin=0.005, fout=0.05) for t, s, d in
          ((0.000, 0.0, 0), (0.080, 1.0, -1), (0.160, 0.0, 0), (0.240, 1.0, -1), (0.320, 0.0, -1), (0.400, -1.0, -2))]
    return layer(sw + [L(735907, 0.020, 0.34, 0.100, -2.0, -8, fin=0.01, fout=0.1)])  # a rope swung, under it


# --- the Yeti's avalanche: real stone avalanches, lower, swelling ---
def avalanche():
    return layer([
        L(162674, 1.600, 1.92, 0.000, -4.0, 0, fin=0.1, fout=0.3),              # a stone avalanche, lower
        L(162668, 1.500, 1.92, 0.000, -7.0, -3, fin=0.1, fout=0.3),             # another, lower still
        L('old:sfx_yeti_avalanche', 0.0, 1.92, 0.0, 0.0, 0, fin=0.05, fout=0.3, fx='lowpass=f=300'),  # the old rumble's low end
    ], post="lowpass=f=4000,asetnsamples=n=64,volume='0.4+0.6*min(1,t/1.2)':eval=frame")


# --- the Zombie Loafer: a groan, a coughing fit, and the gurgle and groan of a pizza turning ---
def groan():
    return layer([
        L(445993, 0.070, 1.24, 0.000, -1.0, 0, fin=0.02, fout=0.2),             # a zombie's moan
        L(457449, 0.020, 1.20, 0.020, -4.0, -7, fin=0.05, fout=0.2),            # a man's long groan, lower
    ])


def cough():
    c = 'acompressor=threshold=-34dB:ratio=6:attack=1:release=40:makeup=4'  # held up: a rasping fit, not three ticks
    return layer([
        L(383783, 2.290, 0.18, 0.000, -2.0, 0, fin=0.003, fout=0.06, fx=c),     # a man coughing, three times
        L(383783, 2.685, 0.19, 0.200, -2.0, 0, fin=0.003, fout=0.06, fx=c),
        L(383783, 3.020, 0.20, 0.420, -2.0, 0, fin=0.003, fout=0.08, fx=c),
    ])


def sick():
    return layer([
        L(80595, 0.070, 0.30, 0.000, -3.0, 0, fin=0.003, fout=0.08),            # a drain gurgling, lower
        L(196720, 0.230, 0.57, 0.190, -2.0, 4, fin=0.02, fout=0.12),            # a zombie's groan
    ])


# --- Phantom King: a real ghost's moan under the old echoes ---
def phantomecho():
    return layer([
        L('old:sfx_phantomking_echo', 0.0, 1.05, 0.0, 0.0, 0, fin=0.002, fout=0.1),
        L(329519, 0.300, 1.00, 0.020, 2.0, -9, fin=0.1, fout=0.3, fx='highpass=f=150'),  # a ghost's moan
    ])


# --- Act 7 · the weather and the villain feet: thunder, a jetpack, a fuse and a bomb, the henchmen's whistle ---
def thunder():
    return layer([
        L(505113, 0.760, 3.00, 0.000, 0.0, 0, fin=0.005, fout=0.6),             # a close clap of thunder
        L(672776, 0.300, 3.00, 0.200, 0.0, -5, fin=0.1, fout=0.6),              # and its roll
    ])


def jetpack():
    return layer([
        L(805168, 1.250, 1.30, 0.000, 2.0, 0, fin=0.08, fout=0.2),              # a jet flying by, a little higher
        L(534856, 3.000, 1.30, 0.000, 3.0, -19, fin=0.2, fout=0.3),              # a jet engine's roar
    ])


def bombfuse():
    return layer([L(316682, 10.000, 0.90, 0.000, 0.0, 0, fin=0.02, fout=0.05)])  # a sparkler fuse fizzing


def bombboom():
    return layer([
        L('old:sfx_bombboom', 0.0, 1.20, 0.0, 0.0, -1, fin=0.001, fout=0.15),
        L(160797, 0.000, 1.20, 0.000, -2.0, -8, fin=0.001, fout=0.4),           # dynamite going off
        L(143129, 0.640, 0.60, 0.005, 0.0, -16, fin=0.001, fout=0.25),          # a gas flare-up's crack
    ])


def gang():
    return layer([
        L(241258, 0.860, 0.28, 0.000, 0.0, 0, fin=0.01, fout=0.05),             # a whistle: whee...
        L(241258, 1.240, 0.38, 0.270, 0.0, 0, fin=0.01, fout=0.08),             # ...whoo
        L(789609, 0.560, 0.16, 0.520, -2.0, -2, fin=0.003, fout=0.06),          # footsteps
        L(789609, 1.520, 0.14, 0.640, -2.0, -3, fin=0.003, fout=0.06),
        L(789609, 0.560, 0.14, 0.760, -2.5, -5, fin=0.003, fout=0.06),
    ])


# --- Lex Lugtoe's cash register: an old register's clatter and bing ---
def cash():
    return layer([L(584168, 2.150, 0.90, 0.000, 0.0, 0, fin=0.002, fout=0.25)])  # an old cash register's bing


# --- Doomstomp: his roar, his stomp, the bone quake, the knock-out bell, getting up, and dazed ---
def doomroar():
    return layer([
        L(869002, 0.880, 1.27, 0.000, -4.0, 0, fin=0.03, fout=0.25),            # lions roaring, lower
        L(263115, 1.030, 1.14, 0.080, -5.0, 3, fin=0.05, fout=0.25),           # a tiger's roar, lower
        L(763026, 2.760, 1.20, 0.040, -4.0, 5, fin=0.1, fout=0.25),            # a black bear's growl
    ])


def doomstep():
    return layer([
        L(721601, 0.690, 0.64, 0.000, -3.0, -3, fin=0.002, fout=0.25, fx='lowpass=f=1500'),  # a giant's footstep
        L(20185, 0.000, 0.45, 0.000, -8.0, -8, fin=0.001, fout=0.2, keep=False, fx='lowpass=f=1000'),  # a stamp, lower
        L('old:sfx_doomstomp_stomp', 0.0, 0.64, 0.0, 0.0, 0, fin=0.002, fout=0.2, fx='lowpass=f=160'),  # the old sub
    ])


def quake():
    return layer([
        L('old:sfx_doomstomp_quake', 0.0, 1.39, 0.0, 0.0, 0, fin=0.002, fout=0.15),
        L(222521, 2.000, 1.39, 0.000, -2.0, -10, fin=0.05, fout=0.25),           # earth cracking open
        L(199803, 2.000, 1.39, 0.000, 0.0, 19, fin=0.1, fout=0.25),             # a window shaking in a quake
    ])


def ko():
    # the bell is damped (a hand on it) so its ring doesn't outweigh the thud: the old file's loudness, on both measures
    damp = "treble=g=-4:f=3500,asetnsamples=n=64,volume='exp(-%.1f*t)':eval=frame"
    return layer([
        L(66951, 0.030, 0.28, 0.000, 0.0, -3, fin=0.001, fout=0.03, fx=damp % 5),       # a boxing bell: ding...
        L(66951, 0.555, 1.35, 0.330, 0.0, -3, fin=0.001, fout=0.3, fx=damp % 2.5),      # ...ding
        L(20185, 0.000, 0.14, 0.000, -10.0, -2, fin=0.001, fout=0.25, keep=False, fx='lowpass=f=350'),  # he hits the deck
        L('old:sfx_doomstomp_ko', 0.0, 1.55, 0.0, 0.0, 6, fin=0.002, fout=0.4, fx='lowpass=f=200'),  # the old file's sub
    ])


def doomrise():
    return layer([
        L('old:sfx_doomstomp_rise', 0.0, 1.28, 0.0, 0.0, 0, fin=0.002, fout=0.1),
        L(763026, 2.760, 1.28, 0.000, -5.0, 3, fin=0.1, fout=0.2),             # a black bear's growl, lower
        L(869002, 3.900, 1.20, 0.080, -6.0, -13, fin=0.2, fout=0.2),             # a lion, lower
    ], post="asetnsamples=n=64,volume='0.45+0.55*min(1,t/1.1)':eval=frame")    # swelling, as he gets up


def dazed():
    # a real bird's song cut into its chirps, five of them circling round his head
    ch = [(2.190, 2.0, 8), (2.500, 3.0, 3), (2.790, 1.0, 3), (3.110, 3.0, -3), (3.400, 2.0, 0)]
    return layer([L(164483, s, 0.23, 0.24 * i, p, d, fin=0.005, fout=0.05) for i, (s, p, d) in enumerate(ch)], post='highpass=f=1200')


# --- Thanfoot's snap: real finger snaps at the front of the old dust swell ---
def snap():
    return layer([
        L('old:sfx_thanfoot_snap', 0.0, 2.03, 0.0, 0.0, 0, fin=0.001, fout=0.3),
        L(477528, 0.000, 0.25, 0.000, -2.0, 14, fin=0.001, fout=0.1),            # a finger snap
        L(177495, 0.000, 0.25, 0.002, -3.0, 9, fin=0.001, fout=0.1),            # and another, lower
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
    'rampage': ('sfx_bigfoot_rampage', rampage, 1.24, -12.5, 0.25),
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
    # batch 2 (the same rule for the level)
    'traytoss': ('sfx_headwaiter_traytoss', traytoss, 0.67, -12.0, 0.06),
    'pie': ('sfx_clownking_pie', pie, 0.55, -12.9, 0.08),
    'meteor': ('sfx_cosmiccroc_meteor', meteor, 1.40, -12.9, 0.1),
    'hitbonk': ('sfx_hitbonk', hitbonk, 0.28, -13.2, 0.06),
    'doughrise': ('sfx_doughboy_rise', doughrise, 0.68, -13.0, 0.08),
    'nonnapin': ('sfx_nonna_pin', nonnapin, 1.60, -14.2, 0.2),
    'coo': ('sfx_pigeonking_coo', coo, 0.61, -11.8, 0.06),
    'gargswoop': ('sfx_gargoyle_swoop', gargswoop, 0.74, -12.9, 0.15),
    'gargstone': ('sfx_gargoyle_stone', gargstone, 1.10, -10.8, 0.12),
    'gargstorm': ('sfx_gargoyle_storm', gargstorm, 1.00, -11.0, 0.12),
    'krakensplash': ('sfx_kraken_splash', krakensplash, 0.58, -12.9, 0.15),
    'krakendrag': ('sfx_kraken_drag', krakendrag, 1.00, -12.4, 0.12),
    'slurp': ('sfx_milkshake_slurp', slurp, 0.65, -11.5, 0.08),
    'rinkroll': ('sfx_rinkqueen_roll', rinkroll, 1.08, -12.7, 0.2),
    'rinkdash': ('sfx_rinkqueen_dash', rinkdash, 0.75, -12.2, 0.2),
    'chainsaw': ('sfx_lumberjack_chainsaw', chainsaw, 1.25, -13.2, 0.1),
    'axe': ('sfx_lumberjack_axe', axe, 0.53, -10.9, 0.08),
    'avalanche': ('sfx_yeti_avalanche', avalanche, 1.92, -12.2, 0.3),
    'groan': ('sfx_poltergeist_groan', groan, 1.24, -9.6, 0.2),
    'cough': ('sfx_poltergeist_cough', cough, 0.62, -12.1, 0.08),
    'sick': ('sfx_poltergeist_sick', sick, 0.78, -12.7, 0.12),
    'phantomecho': ('sfx_phantomking_echo', phantomecho, 1.05, -12.3, 0.2),
    'thunder': ('sfx_thunder', thunder, 3.00, -12.8, 0.6),
    'jetpack': ('sfx_jetpack', jetpack, 1.30, -12.4, 0.2),
    # (a sixth value is the limiter's ceiling: the fuse's fizz and the register's bing peak past -0.8 dBFS once encoded)
    'bombfuse': ('sfx_bombfuse', bombfuse, 0.90, -14.1, 0.05, 0.70),
    'bombboom': ('sfx_bombboom', bombboom, 1.20, -11.7, 0.3),
    'gang': ('sfx_gang', gang, 0.87, -12.1, 0.08),
    'cash': ('sfx_lexlugtoe_cash', cash, 0.90, -12.0, 0.25, 0.70),
    'doomroar': ('sfx_doomstomp_roar', doomroar, 1.27, -15.9, 0.25),
    'doomstep': ('sfx_doomstomp_stomp', doomstep, 0.64, -11.4, 0.2),
    'quake': ('sfx_doomstomp_quake', quake, 1.39, -12.5, 0.25),
    'ko': ('sfx_doomstomp_ko', ko, 1.55, -11.2, 0.5),
    'doomrise': ('sfx_doomstomp_rise', doomrise, 1.28, -14.8, 0.1),
    'dazed': ('sfx_doomstomp_dazed', dazed, 1.18, -12.9, 0.05),
    'snap': ('sfx_thanfoot_snap', snap, 2.03, -10.5, 0.3),
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
            key, fn, dur, level, fade = RECIPES[nm][:5]
            master(fn(), key, dur, level, fade, limit=RECIPES[nm][5] if len(RECIPES[nm]) > 5 else 0.84)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
