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
       719766 649390 330585 651753 760672 578490 29986 741365 774252 442773 867457 553954 847049 539822 529295 \\
       568036 379329 431742 340664 514162 162674 162668 445993 457449 383783 80595 196720 329519 505113 \\
       672776 805168 534856 316682 160797 143129 241258 789609 584168 869002 263115 222521 199803 66951 164483 \\
       477528 177495 --out SRC_DIR

(it also uses 593623, 826196, 763026 and 721601 from batch 1 and 20185 from the first set), and for batch 3:

  node scripts/sfx-fetch/freesound.mjs get 52603 73678 79873 110816 146960 146963 156414 191883 238743 242413 \\
       244926 262633 262635 275584 347149 376799 378334 391919 403908 454092 462870 475479 475480 522921 531755 \\
       571296 581124 583348 610789 610794 611669 625500 688203 705058 706977 719107 737896 752093 829847 829986 \\
       838106 853723 855898 855914 868738 869003 --out SRC_DIR

(it also uses 20185, 539972 and 637533 from the earlier sets), and for batch 4:

  node scripts/sfx-fetch/freesound.mjs get 38244 74471 79240 81458 93100 153277 181252 186316 188767 189782 201159 \\
       235597 271370 334969 337845 349225 368817 378366 382616 384916 392180 394180 396013 398486 406197 412017 \\
       412750 413203 452901 510735 522298 534094 557647 558396 558578 592379 594961 764221 770032 809044 827424 \\
       835833 842313 853153 856766 867997 --out SRC_DIR

(it also uses 20185, 73678, 191883, 234782, 244926, 262633, 262635, 263115, 376799, 381853, 392624, 433829, 442773,
475131, 495117, 505113, 539972, 553954, 719638, 763026, 838106 and 855898 from the earlier sets), and for batch 5:

  node scripts/sfx-fetch/freesound.mjs get 34175 34646 178658 180818 200321 257152 321952 336425 347036 352198 371094 \\
       376800 384914 386105 386111 400503 438861 440035 449915 453301 463032 479998 480020 480805 490556 534956 \\
       539177 567249 567250 578491 611671 680135 683013 695376 703247 703248 706231 720829 733599 753310 765844 \\
       784152 816237 871034 --out SRC_DIR

(it also uses 20185, 29986, 38244, 57204, 93100, 149190, 162674, 188767, 234782, 235597, 244926, 263115, 326304, 334969,
337845, 347149, 384916, 391919, 392180, 394180, 416507, 442773, 457449, 475131, 475480, 505113, 527740, 531755, 534094,
539972, 571296, 578490, 611669, 705058, 760672, 763026, 764221, 819668, 829847, 853153, 867549, 869002 and 869003 from
the earlier sets), and for batch 6:

  node scripts/sfx-fetch/freesound.mjs get 19841 30154 82123 82124 108641 131933 146968 163280 175409 178615 180480 \\
       221544 235165 244976 261296 276600 319565 361771 362330 372515 383181 386432 406555 422110 427573 427574 433823 \\
       433836 451068 484267 498842 509881 515619 527499 530959 536727 539163 547206 547446 558856 575836 587886 590147 \\
       615667 617440 618541 637123 652260 661242 682078 682079 712594 726312 734599 764275 792463 800073 811042 811043 \\
       811445 830466 850718 862443 --out SRC_DIR

(it also uses 20185, 26349, 38244, 81458, 93100, 146960, 146963, 160797, 178658, 188767, 208111, 234782, 244926, 263115,
337845, 346373, 349225, 352198, 371094, 381853, 391919, 392180, 392624, 396013, 406197, 413203, 433829, 454092, 475131,
479998, 495117, 495118, 505113, 520071, 529295, 531755, 553954, 568036, 581124, 637533, 655040, 680135, 695376, 703247,
703248, 719129, 753310, 763026, 765844, 788212, 816237, 827424, 829847, 853153, 869002 and 869003 from the earlier sets;
batch 6's previews were saved from each sound's Freesound page, the same HQ ogg files the helper downloads), and batch 7
fetched nothing new (Freesound's API had no requests left that day): it uses only sounds the earlier sets fetched,

  node scripts/sfx-fetch/freesound.mjs get 20185 30158 38244 153277 164483 178615 180818 186316 188767 191883 208111 \\
       234782 235597 244926 262633 262635 271370 276600 319590 321952 330585 337845 368817 376799 382616 386105 386111 \\
       386125 392180 396013 413203 438861 440035 449915 454092 457449 475131 479998 480805 484267 485245 505113 510735 \\
       539972 571296 577768 590147 594961 623449 643766 651753 672776 684459 693938 744100 760672 764221 765844 784152 \\
       827424 838106 842313 850718 853153 867997 871034 --out SRC_DIR

(30158, 178615, 276600, 484267, 590147 and 850718 of them from batch 6's saved previews). Some recipes in
every batch keep a layer of the synthesized file they replace, read from git at OLD_REV, so they need the repo's
history (a shallow clone won't do).

OUT_DIR defaults to public/audio. Names (default: all): spartanchant spartanrage, then the batch-1 names in RECIPES
(service sweephop ... tailboing), then batch 2's (traytoss pie ... snap), then
batch 3's (fenrirhowl ... gulp) and its two ambience loops (jotunheim bifrost), then batch 4's (solepropenter ...
unbounddouse, the hero and god smack tails hbatpeel ... hamazonqueen, three Endgame variants' tails
hincrediblebulkendgame ... hwasabiwaspendgame) and its loop (firstpizzeria), then batch 5's (the Kratos Peel's
Tartarus, tkenter ... zeusdeath, and Leonidas's Hot Gates, trumpet ... herohotgates) and its loop (hotgates), then batch 6's
(Batpeel's Goth-Ham, bunionenter ... darkfalls, the comics villains, redsoleenter ... cheetoedeath, and the hero variants,
ghostsparta ... amazon) and its loop (gotham), then batch 7's (the god peels' charged moves, herozeus ... verse) and the
Kratos Peel's fire loop (rage, LOOPS: a 2 s mono loop the game plays on repeat, made by loop_master()). Each sound is
cut, pitched, layered and placed by the recipe below (the Spartan, Skald and Siren sounds, and batch 5's Spartan roar,
King Leonidas's Hot Gates war cry and Kronos's gulp, are also given a short convolution room, and Xerxes's laugh a hall),
then levelled to a 50 ms RMS peak (the same measure
as the TRIM table in src/systems/audio.ts), limited under -1.5 dBFS (a recipe may set a lower limit, for a bright
transient that MP3 encoding would push past it, and its own compressor, LIGHT, for a hit the usual one would flatten),
faded, and saved as 44.1 kHz mono 96 kbps
MP3. The ambience loops are 50 s stereo beds instead: their take runs 5 s past the loop, and that tail is crossfaded
(equal power) into the head, then the loop is levelled to -16.5 LUFS like the other beds and saved as 96 kbps stereo
MP3 (see amb_loop). Every source used is credited in public/audio/CREDITS.md and public/audio/credits.json.

Only the Python standard library and ffmpeg are needed. Pitch shifts keep a layer's length (asetrate + atempo),
unless keep=False, which lets a bark run a little shorter or longer like a different man's voice would; tempo() speeds a
layer up without changing its pitch (a music box cranked faster, a slide whistle's fall).
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
        L(423778, 0.080, 0.20, 0.002, 0.0, 6, fin=0.001, fout=0.08),           # a big rubber ball
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
    # pushed back and forth: a surge on each roll (and the old rumble was as punchy, on both loudness measures)
    ROLL = "lowpass=f=3000,asetnsamples=n=64,volume='0.12+0.88*pow(abs(sin(3.14159*t*2.5)),4)':eval=frame"
    return layer([
        L(719766, 2.500, 1.60, 0.000, -3.0, 5, fin=0.02, fout=0.2, fx=ROLL),    # a rolling pin on a board
        L(719766, 5.600, 1.30, 0.250, -5.0, 0, fin=0.05, fout=0.2, fx=ROLL),    # and again, lower
        L('old:sfx_nonna_pin', 0.0, 1.60, 0.0, 0.0, 1, fin=0.01, fout=0.2, fx='lowpass=f=250'),  # the old rumble's low end
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
        L(651753, 1.900, 0.70, 0.030, -3.0, 2, fin=0.05, fout=0.2),           # satin cloth flapped like big wings (foley)
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
        L(774252, 0.040, 0.70, 0.100, 2.0, 16, fin=0.01, fout=0.15),             # a red-tailed hawk's cry
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
        L(340664, 0.300, 1.20, 0.020, 0.0, 0, fin=0.05, fout=0.1),             # revving high
    ])


def axe():
    # a stick swung like an axe, six times round as it spins, each a little different
    sw = [L(514162, 0.180, 0.11, t, s, d, fin=0.005, fout=0.05) for t, s, d in
          ((0.000, 0.0, 0), (0.080, 1.0, -1), (0.160, 0.0, 0), (0.240, 1.0, -1), (0.320, 0.0, -1), (0.400, -1.0, -2))]
    return layer(sw)


# --- the Yeti's avalanche: real stone avalanches, lower, swelling ---
def avalanche():
    return layer([
        L(162674, 1.600, 1.92, 0.000, -4.0, 6, fin=0.1, fout=0.3),              # a stone avalanche, lower
        L(162668, 1.500, 1.92, 0.000, -7.0, 4, fin=0.1, fout=0.3),             # another, lower still
        L('old:sfx_yeti_avalanche', 0.0, 1.92, 0.0, 0.0, -6, fin=0.05, fout=0.3, fx='lowpass=f=300'),  # the old rumble's low end
    ], post="lowpass=f=2500,asetnsamples=n=64,volume='0.4+0.6*min(1,t/1.2)':eval=frame")


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
        L(143129, 0.640, 0.60, 0.005, 0.0, -10, fin=0.001, fout=0.25),          # a gas flare-up's crack
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
        # (batch 6: the earth cracking open is now a rock smashed three times and rock crumbling, both real recordings, where
        # batch 2 used a designed earthquake crack, a composite of other uploads, one since deleted, its licence unverifiable)
        L(765844, 0.020, 0.30, 0.000, -5.0, 14, fin=0.002, fout=0.15, fx=STONE),  # a rock smashed, lower: the bone cracks
        L(765844, 1.020, 0.30, 0.450, -6.0, 12, fin=0.002, fout=0.15, fx=STONE),
        L(765844, 1.890, 0.30, 0.900, -5.0, 11, fin=0.002, fout=0.15, fx=STONE),
        L(391919, 0.000, 1.39, 0.000, -4.0, 14, fin=0.02, fout=0.25),           # rock crumbling, lower: the table splitting
        L(199803, 2.000, 1.39, 0.000, 0.0, 24, fin=0.1, fout=0.25),             # a window shaking in a quake
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
    # the old growl kept whole; the real ones swell up under it as he gets up
    real = layer([
        L(763026, 2.760, 1.28, 0.000, -5.0, 3, fin=0.1, fout=0.2),             # a black bear's growl, lower
        L(869002, 3.900, 1.20, 0.080, -6.0, -13, fin=0.2, fout=0.2),             # a lion, lower
    ], post="asetnsamples=n=64,volume='0.45+0.55*min(1,t/1.1)':eval=frame")
    old = layer([L('old:sfx_doomstomp_rise', 0.0, 1.28, 0.0, 0.0, 0, fin=0.002, fout=0.1)])
    return mixw([(old, 0.0), (real, 0.0)])


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



# =============================== Audio pass, batch 3: Acts 8 and 9 (docs/audio-audit.md) =============================
# As batches 1 and 2: each replaces (or layers under) a synthesized file under the same name, on the old file's beats,
# its level (RECIPES) halfway between the old file's 50 ms RMS peak and the level matching its momentary loudness.
# The two Act 8 ambience loops are built by amb_loop() below instead: 50 s stereo loops levelled as the old ones were.
def swell(t_peak, d, lo=0.0):
    """a post envelope: from <lo> up to full at <t_peak> s, then down to 0 at <d> s."""
    return ("asetnsamples=n=64,volume='if(lt(t,%.3f),%.3f+%.3f*t/%.3f,max(0,1-(t-%.3f)/%.3f))':eval=frame"
            % (t_peak, lo, 1 - lo, t_peak, t_peak, d - t_peak))


# --- Act 8 · Fenrir's Paw: a real wolf's howl, lower for a giant wolf, and his whimpering death howl ---
def fenrirhowl():
    return layer([
        L(378334, 0.300, 2.33, 0.000, -3.0, 0, fin=0.15, fout=0.45),             # a howl from a recording of howling wolves, lower
        L(378334, 0.300, 2.33, 0.012, -15.0, -6, fin=0.2, fout=0.45, fx='lowpass=f=900'),  # an octave under: a giant's chest
    ])


def fenrirdeath():
    return layer([
        L(752093, 0.600, 0.50, 0.000, -4.0, 0, fin=0.02, fout=0.1),             # a dog whimpering, lower
        L(378334, 4.200, 2.10, 0.330, -4.0, 0, fin=0.15, fout=0.5),             # a wolf's howl falling away
        L(378334, 4.200, 2.10, 0.345, -16.0, -7, fin=0.2, fout=0.5, fx='lowpass=f=800'),
    ])


# --- the Wolf-Pup Paws: a litter of pups yipping as it arrives ---
def wolfpupyip():
    return layer([
        L(242413, 0.055, 0.16, 0.000, 0.0, 0, fin=0.003, fout=0.05),            # a small dog's yips
        L(242413, 0.365, 0.15, 0.170, 1.0, -2, fin=0.003, fout=0.05),
        L(110816, 1.420, 0.18, 0.360, 1.0, 10, fin=0.003, fout=0.06),           # a puppy's yelp
        L(242413, 0.535, 0.10, 0.550, 2.0, 12, fin=0.003, fout=0.04),
    ], post='highpass=f=300')


# --- Thrym the Frost King: a blizzard gust; ice creeping to the next pizza ---
def thrymblizzard():
    return layer([
        L(454092, 142.50, 1.48, 0.000, 3.0, 0, fin=0.05, fout=0.2, fx='highpass=f=300,treble=g=6:f=3000'),  # a mountain gale
        L(156414, 24.000, 1.48, 0.000, 2.0, 0, fin=0.05, fout=0.2, fx='highpass=f=200'),  # wind blowing into cactus spines on a mountain top
    ], post=swell(0.66, 1.62, 0.05))


def thrymspread():
    return layer([
        L(838106, 0.400, 1.00, 0.000, 0.0, 0, fin=0.02, fout=0.1),              # ice crackling under pressure
        L(262633, 0.300, 1.00, 0.000, -2.0, 4, fin=0.01, fout=0.1),            # ice cracking as it melts, lower
    ], post='highpass=f=500,' + swell(0.6, 1.0, 0.25))


# --- the Frost Giant Toes' frost creep: real ice crackling under the old synthesized shimmer ---
def frostchill():
    return layer([
        L('old:sfx_frostchill', 0.0, 0.90, 0.0, 0.0, 0, fin=0.002, fout=0.08),
        L(838106, 1.400, 0.90, 0.000, 0.0, 6, fin=0.01, fout=0.15, fx='highpass=f=600'),  # ice crackling
        L(262635, 0.120, 0.40, 0.000, 0.0, 6, fin=0.002, fout=0.15),           # and a crack
    ])


# --- Jörmungandr: the sea surging up (entrance), the head rising out of the water, the serpent's hiss ---
def jormenter():
    return layer([
        L(376799, 19.100, 2.24, 0.000, -3.0, 2, fin=0.3, fout=0.5),             # a big wave crashing on rocks, lower
        L(705058, 6.300, 2.24, 0.000, -2.0, 4, fin=0.2, fout=0.5),             # the sea surging under water
        L(869003, 2.550, 1.70, 0.450, -10.0, -14, fin=0.3, fout=0.5, fx='lowpass=f=1500'),  # a lion's roar, far lower
    ])


def jormsurface():
    return layer([
        L(705058, 6.300, 1.09, 0.000, 0.0, 3, fin=0.15, fout=0.15),             # the sea surging up
        L(376799, 0.300, 1.09, 0.000, 0.0, -3, fin=0.3, fout=0.2),              # a wave breaking
        L(583348, 0.000, 0.55, 0.550, -3.0, -2, fin=0.002, fout=0.2),           # water falling back: a rock's splash, lower
    ])


def jormhiss():
    return layer([
        L(706977, 1.200, 0.90, 0.000, -2.0, 8, fin=0.1, fout=0.15, fx='highpass=f=1200'),  # a real snake hissing, lower
        L(146963, 0.300, 0.90, 0.000, -4.0, -4, fin=0.05, fout=0.15, fx='highpass=f=800'),  # a cat's hiss, lower
    ])


# --- Surtr: fire running along the bridge; the sword raised (a real flame swell under the old riser); his roar ---
def surtrfuse():
    return layer([
        L(244926, 0.300, 1.50, 0.000, 0.0, 0, fin=0.12, fout=0.2),              # diesel thrown on a fire
        L(637533, 0.000, 0.75, 0.100, -2.0, 6, fin=0.01, fout=0.2),            # a gas flame bursting
        L(637533, 0.050, 0.70, 0.750, -4.0, 4, fin=0.01, fout=0.2),
    ], post='acompressor=threshold=-30dB:ratio=4:attack=10:release=150:makeup=6')  # a steady run of fire


def surtrraise():
    return layer([
        L('old:sfx_surtr_raise', 0.0, 1.65, 0.0, 0.0, 0, fin=0.002, fout=0.08),
        L(244926, 0.300, 1.65, 0.000, -3.0, 1, fin=0.6, fout=0.08, fx=swell(1.5, 1.65, 0.0)),  # a fire swelling up
    ])


def surtrroar():
    return layer([
        L(869003, 9.450, 1.40, 0.000, -5.0, 0, fin=0.04, fout=0.3),             # a lion roaring, lower
        L(869003, 0.500, 1.30, 0.030, -9.0, -4, fin=0.06, fout=0.3),            # another, lower still
        L(244926, 0.300, 1.30, 0.050, -2.0, -5, fin=0.15, fout=0.3),           # and fire
    ])


# --- the Skald Slippers: an iron-age lyre and a man singing "hey", cut into his saga phrase, in a hall ---
LYRE = {'E3': 14.632, 'F#3': 13.840, 'G#3': 13.105, 'A3': 12.372, 'B3': 11.659, 'E4': 10.330, 'F#4': 9.620,
        'G#4': 8.900, 'A4': 8.186}  # the lyre's plucks (Hedmarking's iron-age lyre, a scale tuned about 30 cents flat)


LIFT = {'E3': 17.5, 'F#3': 18.1, 'A3': 16.5, 'E4': 15.3, 'F#4': 8.0, 'A4': 7.6}  # each pluck to the same loudness, the strums level with the voice


def pluck(n, at, dur=1.2, db=0.0):
    return L(191883, LYRE[n] - 0.010, dur, at, 0.0, db + LIFT[n], fin=0.002, fout=0.3)


def skaldsong():
    lyre = [pluck('E3', 0.000, 1.0, -2), pluck('A3', 0.035, 1.0), pluck('E4', 0.070, 1.0, -1), pluck('A4', 0.105, 1.0, -2),
            pluck('F#3', 0.950, 1.2, -2), pluck('A3', 0.990, 1.2, -1), pluck('F#4', 1.030, 1.2, -2)]
    v = 'highpass=f=120,lowpass=f=7000'
    voice = [
        L(403908, 0.640, 0.42, 0.120, 3.0, 9, fin=0.03, fout=0.04, fx=v),     # HEY (its own scoop up, onto E)
        L(403908, 3.600, 0.38, 0.560, 0.4, -4, fin=0.03, fout=0.04, fx=v),    # EH (F#)
        L(403908, 4.300, 0.85, 0.960, -1.6, -6, fin=0.03, fout=0.3, fx=v),    # EY (E, falling off at the end)
    ]
    return reverb(mixw([(layer(lyre), 0.0), (layer(voice), -2.0)]), rt60=0.7, wet_db=-12.0, seed=31)


def skaldrally():
    run = [pluck('E3', 0.000, 0.9, -3), pluck('A3', 0.080, 0.9, -2), pluck('E4', 0.160, 0.9, -1), pluck('A4', 0.240, 1.0)]
    shout = [L(403908, 4.350, 0.48, 0.340, 1.0, -6, fin=0.012, fout=0.15, fx='highpass=f=120,lowpass=f=7000')]  # HEY!
    return reverb(mixw([(layer(run), 0.0), (layer(shout), 0.0)]), rt60=0.6, wet_db=-13.0, seed=37)


# --- Muspel Fire-Feet: flames burst up off the pizza it stomped ---
def muspelscorch():
    return layer([
        L(855898, 0.000, 0.90, 0.000, -2.0, 0, fin=0.002, fout=0.35),           # a fireball going up, lower
        L(539972, 0.000, 0.60, 0.010, -3.0, -4, fin=0.002, fout=0.25),          # a burst of gas flame
        L(637533, 0.050, 0.80, 0.060, -2.0, 2, fin=0.01, fout=0.3),            # the flames fluttering
    ])


# --- Act 9 · the Minotaur: a real bull's bellow (lower); snorts and a hoof scraping stone; hoofbeats; maze walls ---
def bellow():
    return layer([
        L(610794, 0.120, 1.54, 0.000, -3.0, 0, fin=0.04, fout=0.35),            # a bull bellowing, lower
        L(610789, 0.150, 1.30, 0.040, -7.0, -5, fin=0.06, fout=0.35),           # a second bull, lower still
        L(475480, 0.030, 0.50, 1.150, -5.0, -6, fin=0.005, fout=0.15),          # and a snort to end it
    ])


def mintsnort():
    return layer([
        L(475480, 0.030, 0.30, 0.000, -4.0, 0, fin=0.004, fout=0.08),           # a horse's snort, lower
        L(475479, 0.010, 0.32, 0.300, -5.0, 5, fin=0.004, fout=0.08),           # and another
        L(347149, 0.100, 0.35, 0.620, -5.0, -10, fin=0.01, fout=0.12),           # a hoof scraping stone (granite on granite)
        L(571296, 3.155, 0.12, 0.620, -6.0, 12, fin=0.002, fout=0.05),          # hooves clattering, lower
        L(571296, 3.918, 0.12, 0.820, -7.0, 14, fin=0.002, fout=0.05),
    ])


def mintcharge():
    clacks = (2.137, 2.925, 3.155, 3.419, 3.918, 4.427, 4.946, 5.200, 5.455)  # the hooves' strikes in the recording
    hooves = [L(571296, c, 0.12, t, -7.0, 14 + i * 0.4, fin=0.002, fout=0.05, fx='lowpass=f=4000')
              for i, (c, t) in enumerate(zip(clacks, (0.0, 0.13, 0.20, 0.33, 0.40, 0.53, 0.60, 0.73, 0.80)))]
    return layer([L('old:sfx_minotaur_charge', 0.0, 1.40, 0.0, 0.0, 0, fin=0.002, fout=0.1)] + hooves)


def mintwalls():
    return layer([
        L(52603, 3.000, 1.30, 0.000, -4.0, 6, fin=0.05, fout=0.15),             # a concrete block dragged, lower
        L(347149, 0.050, 0.90, 0.150, -7.0, -6, fin=0.05, fout=0.2),            # granite grinding on granite, lower
        L(20185, 0.000, 0.30, 1.000, -12.0, -4, fin=0.002, fout=0.2, keep=False, fx='lowpass=f=600'),  # settling: a stamp, far lower
    ])


# --- Medusa: a real snake's hiss under the old glow; a pizza turning to stone; her snakes hissing ---
def medusaglow():
    return layer([
        L('old:sfx_medusa_glow', 0.0, 1.19, 0.0, 0.0, 0, fin=0.002, fout=0.08),
        L(706977, 4.000, 1.19, 0.000, 0.0, 15, fin=0.4, fout=0.15, fx='highpass=f=1500'),  # a snake hissing, rising
    ])


def petrify():
    return layer([
        L(52603, 5.500, 1.10, 0.000, -2.0, 8, fin=0.02, fout=0.2),              # a concrete block grinding
        L(391919, 0.000, 0.60, 0.100, 0.0, 12, fin=0.005, fout=0.2),             # rock crumbling: the grit
        L(347149, 0.100, 0.40, 0.820, -4.0, -4, fin=0.005, fout=0.15),          # granite scraping as it sets
    ])


def medusahiss():
    return layer([
        L(706977, 3.000, 0.72, 0.000, 0.0, 6, fin=0.04, fout=0.12, fx='highpass=f=1200'),  # a snake hissing
        L(146960, 1.330, 0.60, 0.150, 2.0, 2, fin=0.03, fout=0.12, fx='highpass=f=800'),  # a cat's hiss, higher
        L(855914, 0.100, 0.40, 0.350, 0.0, -4, fin=0.02, fout=0.1),             # a rattlesnake's rattle
    ])


# --- Cerberus: three heads barking; three growling; fire breath; frost (a real ice crack under the old blast); howls ---
def cerbbark():
    return layer([
        L(522921, 0.100, 0.24, 0.000, -4.0, 8, fin=0.003, fout=0.08),           # a large dog barking, lower
        L(853723, 0.110, 0.24, 0.240, -2.0, -1, fin=0.003, fout=0.08),          # a second dog
        L(522921, 2.110, 0.26, 0.460, -6.0, 3, fin=0.003, fout=0.08),           # the first, lower still
        L(625500, 0.300, 0.91, 0.180, -3.0, -8, fin=0.1, fout=0.25),            # a growl under them
    ])


def cerbgrowl():
    return layer([
        L(829986, 0.060, 0.89, 0.000, -2.0, 12, fin=0.1, fout=0.15),             # a dog's low growl
        L(625500, 0.100, 1.09, 0.000, 0.0, -3, fin=0.15, fout=0.15),            # another dog's
        L(829986, 0.060, 0.89, 0.180, -7.0, 11, fin=0.1, fout=0.15),            # the first, far lower
    ])


def cerbfire():
    return layer([
        L(244926, 0.150, 1.00, 0.000, 0.0, 0, fin=0.03, fout=0.35),             # diesel flaring up on a fire
        L(539972, 0.000, 0.60, 0.000, -2.0, 1, fin=0.002, fout=0.25),          # a burst of gas flame
        L(829986, 0.060, 0.55, 0.080, -4.0, 14, fin=0.02, fout=0.15),         # a snarl behind it
    ], post='acompressor=threshold=-30dB:ratio=4:attack=10:release=150:makeup=6')  # a held breath of fire


def cerbice():
    return layer([
        L('old:sfx_cerberus_ice', 0.0, 0.80, 0.0, 0.0, 0, fin=0.002, fout=0.08),
        L(262635, 0.120, 0.55, 0.000, -2.0, 12, fin=0.002, fout=0.2),             # ice cracking
    ])


def cerbhowl():
    return layer([
        L(110816, 1.900, 0.25, 0.000, -4.0, 12, fin=0.003, fout=0.06),           # a pup's yelp, lower
        L(378334, 0.300, 1.50, 0.250, -1.0, 6, fin=0.12, fout=0.3),              # a wolf's howl
        L(378334, 3.700, 1.43, 0.320, 1.0, -3, fin=0.15, fout=0.3),              # a second, higher
    ])


# --- Hades and the Titans: a great bell tolls; a Titan rises (real chains under the old rumble); plates slide; a flare ---
def hadestoll():
    return layer([
        L(73678, 0.000, 2.30, 0.000, -5.0, 0, fin=0.002, fout=0.5),             # a very large bell, lower
        L(73678, 0.000, 2.30, 0.008, -12.0, -8, fin=0.002, fout=0.5, fx='lowpass=f=1200'),  # and its hum, deeper
    ])


def hadesrise():
    return layer([
        L('old:sfx_hades_rise', 0.0, 1.70, 0.0, 0.0, 0, fin=0.002, fout=0.1),
        L(611669, 0.700, 0.75, 0.880, -3.0, -4, fin=0.005, fout=0.2),             # heavy chains rattling, lower
    ])


def hadesslide():
    return layer([
        L(275584, 1.000, 0.95, 0.000, -2.0, 0, fin=0.04, fout=0.15),             # a plate sliding over a table, lower
        L(275584, 0.560, 0.85, 0.080, 1.0, -4, fin=0.04, fout=0.15),             # and another
    ], post='acompressor=threshold=-32dB:ratio=4:attack=5:release=120:makeup=8')  # held on: plates scraping along


def hadesflare():
    return layer([
        L('old:sfx_hades_flare', 0.0, 1.11, 0.0, 0.0, 0, fin=0.002, fout=0.08),
        L(855898, 0.000, 0.55, 0.550, -3.0, -4, fin=0.002, fout=0.25),            # a fireball, lower, as the flare lands
    ])


# --- the Act 9 feet: the Sirens' song, a Harpy's screech and wings, Charybdis's whirlpool and gulp ---
def sirensong():
    v = 'highpass=f=200'
    return reverb(layer([
        L(462870, 0.050, 1.29, 0.000, 3.0, 0, fin=0.06, fout=0.25, fx=v),       # a woman singing a wordless phrase
        L(462870, 0.050, 1.29, 0.030, 7.0, -9, fin=0.08, fout=0.25, fx=v),      # and a third above: two sirens
    ]), rt60=0.9, wet_db=-9.0, seed=41)


def harpy():
    return layer([
        L(688203, 1.340, 0.45, 0.000, 2.0, 0, fin=0.005, fout=0.12),             # a peacock's call, higher
        L(868738, 0.350, 0.40, 0.020, 0.0, -6, fin=0.005, fout=0.12),            # a red kite's territorial call
        L(719107, 1.100, 0.70, 0.100, 0.0, 4, fin=0.02, fout=0.15),              # a duck flapping its wings
    ])


def whirlpool():
    return layer([
        L(79873, 0.500, 1.67, 0.000, -6.0, 6, fin=0.3, fout=0.4),               # rain rushing down a storm drain, far lower
        L(705058, 6.400, 1.67, 0.000, -3.0, -2, fin=0.2, fout=0.4),             # the sea surging under water
    ])


def gulp():
    return layer([
        L(531755, 0.120, 0.40, 0.000, -8.0, 0, fin=0.004, fout=0.1, keep=False),  # a hard swallow, far lower
        L(829847, 0.240, 0.40, 0.020, -5.0, 2, fin=0.004, fout=0.1),            # a gulp
        L(705058, 1.250, 0.66, 0.120, 0.0, 3, fin=0.02, fout=0.25),            # water churning
    ])


# --- the Act 8 ambience loops: real recordings, 50 s, stereo, levelled to -16.5 LUFS as the old beds ---
LOOP, XF = 50.0, 5.0


def Ls(fid, start, dur, at, semis=0.0, db=0.0, fin=0.5, fout=0.5, fx=''):
    """a stereo layer for a loop (as L(), padded to the loop's length plus its crossfade)."""
    return dict(fid=fid, start=start, dur=dur, at=at, semis=semis, db=db, fin=fin, fout=fout, keep=True, fx=fx)


def layer2(layers, post=''):
    args, fc = [], []
    for i, l in enumerate(layers):
        args += ['-i', src(l['fid'])]
        c = chain(l).replace('channel_layouts=mono', 'channel_layouts=stereo').replace('whole_dur=%.1f' % PAD, 'whole_dur=%.1f' % (LOOP + XF))
        c = c.replace('adelay=%d' % round(l['at'] * 1000), 'adelay=%d:all=1' % round(l['at'] * 1000))
        fc.append('[%d:a]%s[l%d]' % (i, c, i))
    fc.append('%samix=inputs=%d:normalize=0:dropout_transition=0%s[o]' % (''.join('[l%d]' % i for i in range(len(layers))), len(layers), (',' + post) if post else ''))
    out = tmp()
    ff(args + ['-filter_complex', ';'.join(fc), '-map', '[o]', '-ac', '2', '-c:a', 'pcm_f32le', out])
    return out


def read2(p, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return array.array('f', raw)


def wrap(p):
    """the loop: LOOP s from XF s on, its last XF s crossfaded (equal power) into the first XF s of the take, so the end
    runs on into the start."""
    x = read2(p)
    n, X = int(LOOP * SR), int(XF * SR)
    out = array.array('f', x[2 * X:2 * (X + n)])
    for i in range(X):
        k = i / X
        g_in, g_out = math.sin(k * math.pi / 2), math.cos(k * math.pi / 2)
        j = n - X + i
        for c in (0, 1):
            out[2 * j + c] = out[2 * j + c] * g_out + x[2 * i + c] * g_in
    return out


def lufs_i(p):
    e = subprocess.run(['ffmpeg', '-nostats', '-v', 'info', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float([ln for ln in e.splitlines() if ln.strip().startswith('I:')][-1].split()[1])


def amb_loop(name, loop, target=-16.5, limit=0.75):
    """level a stereo loop (float samples) to <target> LUFS integrated, limited under -2.5 dBFS (its ice cracks overshoot
    once encoded; a loop may set a lower <limit>), and save it as a 96 kbps stereo MP3: three copies end to end go through the filters and the middle
    one is kept, so no filter edge touches the seam."""
    raw = tmp('f32')
    open(raw, 'wb').write(loop.tobytes())
    one = tmp()
    ff(['-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-c:a', 'pcm_f32le', one])
    g = target - lufs_i(one)
    open(raw, 'wb').write(loop.tobytes() * 3)
    nb = len(loop) * 4
    out = os.path.join(OUT, name + '.mp3')
    for _ in range(3):  # the limiter takes back a little: measure the encoded file and correct
        p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-af',
                            'volume=%.2fdB,alimiter=limit=%.2f:level=false' % (g, limit), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', out],
                       input=p[nb:2 * nb], check=True)
        got = lufs_i(out)
        if abs(got - target) < 0.1:
            break
        g += target - got
    print('%s: %.2f s, %.1f LUFS' % (out, len(read2(out)) / 2 / SR, got))


def jotunheim():
    # glacier wind: a heavy mountain gale in the Swiss Alps for the body, wind blowing into cactus spines on a mountain
    # top for the howl; a frozen lake's ice cracking and booming under it, lower, for the giants' ice groaning, and
    # ice crackling under pressure, now and then
    creaks = [Ls(838106, 0.40, 2.0, t, s, d, fin=0.1, fout=0.4, fx='highpass=f=500') for t, s, d in
              ((6.0, -3.0, 5), (17.5, -5.0, 3), (29.0, -2.0, 5), (41.5, -4.0, 4), (52.0, -3.0, 3))]
    return layer2([
        Ls(454092, 100.0, LOOP + XF, 0.0, 0.0, 13, fin=0.01, fout=0.01),
        Ls(156414, 30.0, LOOP + XF, 0.0, 0.0, 11, fin=0.01, fout=0.01),
        Ls(737896, 2.0, LOOP + XF, 0.0, -5.0, -12, fin=0.01, fout=0.01, fx='lowpass=f=2500'),
    ] + creaks, post='acompressor=threshold=-26dB:ratio=2.5:attack=30:release=400:knee=6')  # the gusts held in, as the old bed


def bifrost():
    # the old bed kept whole (its shimmer, thin wind, thunder and fire); real thin high wind and two real distant
    # thunders over it, the thunders where the old ones roll (the take starts XF s before the loop: 14.5 and 36 s in it
    # land at 9.5 and 31 s)
    real = layer2([
        Ls(454092, 30.0, LOOP + XF, 0.0, 3.0, 19, fin=0.01, fout=0.01, fx='highpass=f=900'),
        Ls(581124, 0.0, 8.0, 14.5, -2.0, 11, fin=0.05, fout=2.0, fx='lowpass=f=900'),
        Ls(238743, 9.5, 9.0, 36.0, -2.0, 13, fin=0.3, fout=3.0, fx='lowpass=f=900'),
    ])
    loop = wrap(real)
    old = read2(src('old:ambience_bifrost'))
    return array.array('f', (a + b for a, b in zip(old, loop)))


# =============================== Audio pass, batch 4: Act 10, then the hero and god smack tails ====================
# As batches 1–3: each replaces (or layers with) a synthesized file under the same name, on the old file's beats, and
# its level (RECIPES) sits halfway between the old file's 50 ms RMS peak and the level matching its momentary loudness.

# --- Act 10 · the Sole Proprietor: his entrance (a real gong and a pour of coins with the old gong and brass), his
# "hmm-hm", his cash register, the clock, and the shift-over bell and steam whistle ---
PEAKS = 'acompressor=threshold=-24dB:ratio=6:attack=0.5:release=40:knee=3'  # a fast compressor: the clicks and cracks held in


def solepropenter():
    return layer([
        L('old:sfx_soleprop_enter', 0.0, 2.30, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(853153, 0.040, 2.30, 0.000, -1.0, 0, fin=0.002, fout=0.6),            # a big stainless gong, felt mallet
        L(334969, 0.550, 1.40, 0.250, 0.0, 3, fin=0.01, fout=0.4),              # coins poured onto wood
    ])


def solepropvoice():
    h = 'highpass=f=60,lowpass=f=1800'
    return layer([
        L(368817, 0.080, 0.46, 0.000, -3.0, 0, fin=0.05, fout=0.08, fx=h),      # a man's hum, lower: "hmm"
        L(368817, 2.280, 0.32, 0.480, -6.5, 0, fin=0.03, fout=0.1, fx=h),       # "hm", lower still
    ])


def solepropcash():
    return layer([
        L(201159, 0.420, 0.91, 0.000, 0.0, 0, fin=0.002, fout=0.3),             # a turn-of-the-century register: handle, bell
        L(334969, 0.550, 0.40, 0.140, 0.0, 1, fin=0.005, fout=0.2),             # coins into the drawer
    ])


def solepropclock():
    return layer([
        L(534094, 0.025, 0.10, 0.000, 0.0, 0, fin=0.0005, fout=0.04),           # a wall clock's tick
        L(412750, 0.040, 0.10, 0.000, 0.0, -4, fin=0.0005, fout=0.04),          # an old clock's, under it
    ])


def solepropbell():
    w = 'highpass=f=250'
    return layer([
        L(189782, 0.440, 1.30, 0.000, 0.0, 0, fin=0.002, fout=0.4, fx='lowpass=f=6000'),  # a factory bell ringing, its glare off
        L(74471, 0.050, 1.10, 0.350, 7.0, -7, fin=0.06, fout=0.25, fx=w),       # a tugboat's steam whistle, higher
        L(74471, 0.050, 1.10, 0.350, 11.0, -11, fin=0.06, fout=0.25, fx=w),     # and a third over it: a chime whistle
    ])


# --- the Ghost of Feet Future rewinds: a cassette deck's rewind, the tape speeding up, from click to click ---
def rewind():
    whirr = [L(452901, 2.0 + 0.4 * k, 0.28, 0.06 + 0.21 * k, 2.0 * k, 26, fin=0.07, fout=0.07) for k in range(4)]
    return layer([
        L(452901, 0.300, 0.10, 0.000, 0.0, 3, fin=0.001, fout=0.04),            # the rewind key goes down
    ] + whirr + [
        L(452901, 11.840, 0.12, 0.860, 0.0, -6, fin=0.001, fout=0.05),          # and clicks off
    ], post=PEAKS)


# --- Sole Proprietor Unbound: his entrance (a heavy metal door slammed, lower, and a crowd singing "ah" in a low
# D minor chord, with the old boom and choir), the gauntlet wind-up, frost, fire and the flame smacked out ---
def unboundenter():
    c = 'lowpass=f=2400'
    return layer([
        L('old:sfx_soleunbound_enter', 0.0, 2.96, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(406197, 0.280, 2.40, 0.000, -5.0, 0, fin=0.002, fout=0.8, fx='lowpass=f=3000'),  # a big heavy metal door slammed, lower
        L(764221, 2.400, 2.91, 0.050, -3.0, 8, fin=0.25, fout=0.9, fx=c),      # a crowd singing "ah": D
        L(764221, 3.400, 2.90, 0.060, 0.0, 6, fin=0.25, fout=0.9, fx=c),        # F
        L(764221, 4.400, 2.89, 0.070, 4.0, 4, fin=0.25, fout=0.9, fx=c),        # A
        L(764221, 2.900, 2.91, 0.050, -15.0, 8, fin=0.25, fout=0.9, fx=c),     # and the D an octave under
    ])


def unboundfist():
    return layer([
        L('old:sfx_soleunbound_fist', 0.0, 0.74, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(475131, 0.000, 0.45, 0.370, -5.0, 4, fin=0.01, fout=0.15, keep=False),  # a super-heavy swoosh, lower, slower
    ])


def unboundfrost():
    return layer([
        L(262635, 0.120, 0.45, 0.000, 0.0, 0, fin=0.002, fout=0.2),             # ice cracking
        L(838106, 0.400, 0.65, 0.020, 0.0, 4, fin=0.01, fout=0.2, fx='highpass=f=1500'),  # ice crackling under pressure
        L(262633, 0.300, 0.45, 0.220, 1.0, 8, fin=0.002, fout=0.2),             # and cracking again
    ], post='highpass=f=250,lowpass=f=12000,' + PEAKS)  # (its sharpest edges off, so they don't overshoot once encoded)


def unboundfire():
    return layer([
        L(244926, 0.150, 1.00, 0.000, -2.0, 0, fin=0.06, fout=0.35),            # diesel thrown on a fire, lower
        L(539972, 0.000, 0.60, 0.050, -3.0, 0, fin=0.002, fout=0.25),           # a burst of gas flame
        L(855898, 0.000, 0.90, 0.090, -4.0, -2, fin=0.01, fout=0.35),           # a fiery explosion, lower
    ])


def unbounddouse():
    return layer([
        L(20185, 0.070, 0.07, 0.000, -3.0, 0, fin=0.001, fout=0.04, fx='lowpass=f=1500'),  # the flame smacked out: a stomp on plywood
        L(495117, 0.010, 0.20, 0.000, -3.0, 0, fin=0.001, fout=0.1, fx='lowpass=f=3000'),  # and a washcloth slapped into water
        L(235597, 0.660, 0.70, 0.010, 0.0, 2, fin=0.002, fout=0.45),            # water sizzling on a hot stove
        L(234782, 0.550, 0.70, 0.020, 0.0, -16, fin=0.01, fout=0.5, fx='highpass=f=2000'),  # and a steam release
    ])


# --- the hero and god smack tails (heard on every smack with that peel): short, on the smack, tight in the attack.
# Replaced from real recordings, or ('old:' first) the old synthesized tail kept whole with a real layer under it ---
DECAY = "asetnsamples=n=64,volume='exp(-%d*t)':eval=frame"  # a layer damped as it rings: exp(-k t), about 8.7k dB a second


def hbatpeel():
    return layer([
        L(349225, 0.130, 0.32, 0.000, 0.0, 0, fin=0.003, fout=0.08),            # an umbrella flapped like bat wings (foley)
        L(153277, 0.440, 0.30, 0.000, -3.0, -4, fin=0.003, fout=0.08),          # a pigeon's wingbeats, lower, under it
    ])


def hwonderwedge():
    return layer([
        L('old:sfx_smack_hero_wonderwedge', 0.0, 0.47, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(719638, 1.250, 0.40, 0.000, 0.0, 2, fin=0.01, fout=0.08, fx='highpass=f=80'),  # a lasso swung round
    ])


def haquatoe():
    return layer([
        L('old:sfx_smack_hero_aquatoe', 0.0, 0.53, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(442773, 0.060, 0.35, 0.000, 0.0, -4, fin=0.002, fout=0.15),           # a big splash
    ])


def hincrediblebulk():
    return layer([
        L(763026, 2.760, 0.40, 0.000, -5.0, 0, fin=0.01, fout=0.12),            # a black bear's growl, lower
        L(263115, 1.030, 0.40, 0.000, -7.0, -4, fin=0.01, fout=0.12),           # a tiger's roar, lower still
    ])


def hhawkeyetalian():
    return layer([
        L(384916, 0.085, 0.25, 0.000, 0.0, 0, fin=0.001, fout=0.12),            # a bow released
        L(394180, 0.040, 0.45, 0.020, 0.0, 18, fin=0.01, fout=0.15),            # the arrow flying off
    ])


def hdeadpeel():
    k = 'highpass=f=150'
    return layer([
        L(392624, 0.135, 0.08, 0.000, -2.0, 0, fin=0.001, fout=0.04),           # a champagne cork popping
        L(809044, 0.040, 0.15, 0.060, 7.0, 3, fin=0.01, fout=0.03, fx=k),       # a kazoo's "you lose": wah-
        L(809044, 0.410, 0.22, 0.160, 7.0, 3, fin=0.01, fout=0.08, fx=k),       # -wah
    ])


def hshazamozza():
    return layer([
        L('old:sfx_smack_hero_shazamozza', 0.0, 0.29, 0.0, 0.0, 0, fin=0.002, fout=0.05),
        L(188767, 0.200, 0.29, 0.000, 0.0, -2, fin=0.001, fout=0.1),            # a real thunder crack
    ])


def hcattoewoman():
    return layer([
        L(93100, 0.100, 0.25, 0.000, 0.0, 0, fin=0.003, fout=0.1),              # a whip cracked
        L(412017, 0.300, 0.30, 0.160, 2.0, 6, fin=0.02, fout=0.1),              # a cat's meow
    ])


def hgreenpepperarrow():
    return layer([
        L(384916, 0.085, 0.20, 0.000, 0.0, 0, fin=0.001, fout=0.1),             # a bow released
        L(81458, 0.060, 0.33, 0.120, 0.0, 0, fin=0.002, fout=0.12),             # a spring door stop: the boxing glove
    ])


def hhawkcrust():
    return layer([L(770032, 0.160, 0.32, 0.000, 0.0, 0, fin=0.005, fout=0.1, fx='highpass=f=500')])  # a red-shouldered hawk's cry


def hswampthincrust():
    return layer([
        L(557647, 0.130, 0.40, 0.000, -3.0, 0, fin=0.003, fout=0.1),            # water bubbling through wet coffee grounds
        L(558578, 0.160, 0.38, 0.020, -6.0, -3, fin=0.003, fout=0.1),           # more of it, lower
    ])


def hwasabiwasp():
    return layer([
        L(398486, 0.100, 0.30, 0.000, 0.0, 0, fin=0.01, fout=0.06),             # a wasp's wings buzzing
        L(856766, 1.000, 0.30, 0.000, 0.0, 14, fin=0.01, fout=0.06),            # another wasp, at a window
    ], post='acompressor=threshold=-30dB:ratio=4:attack=5:release=60:makeup=6')  # held level, as a buzz is


def hicecreamman():
    return layer([
        L('old:sfx_smack_hero_icecreamman', 0.0, 0.60, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(262635, 0.120, 0.30, 0.000, 0.0, 6, fin=0.002, fout=0.12),            # real ice cracking
    ])


def hzeus():
    return layer([
        L(188767, 0.180, 0.55, 0.000, 0.0, 0, fin=0.002, fout=0.2),             # thunder cracking
        L(38244, 1.260, 0.45, 0.000, -2.0, -4, fin=0.002, fout=0.2),            # and a second crack
    ])


def hhera():
    return layer([
        L(413203, 2.050, 0.17, 0.000, 2.0, 5, fin=0.005, fout=0.04),            # a trumpet's two notes: a fourth up
        L(413203, 2.280, 0.32, 0.130, 2.0, 0, fin=0.01, fout=0.1),
    ])


def hposeidon():
    return layer([
        L(442773, 0.060, 0.40, 0.000, -2.0, 0, fin=0.002, fout=0.15),           # a big splash, lower
        L(376799, 0.900, 0.45, 0.000, 0.0, 6, fin=0.01, fout=0.15),             # a wave crashing on rocks
        L(337845, 0.150, 0.40, 0.050, 5.0, 4, fin=0.001, fout=0.15),            # a metal shed door struck, ringing: the trident
    ])


def hdemeter():
    return layer([
        L('old:sfx_smack_hero_demeter', 0.0, 0.54, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(396013, 0.000, 0.54, 0.000, 0.0, 20, fin=0.02, fout=0.15),           # grass rustling
    ])


def hathena():
    return layer([
        L(337845, 0.150, 0.50, 0.000, 0.0, 0, fin=0.001, fout=0.15),            # a metal shed door struck, ringing: her shield
        L(558396, 0.690, 0.16, 0.080, 0.0, 0, fin=0.01, fout=0.05),             # an owl hooting
        L(558396, 1.020, 0.24, 0.260, 0.0, -5, fin=0.01, fout=0.08),
    ])


def lyre(n, at, dur=0.55, db=0.0, semis=7.0):
    """one of the iron-age lyre's plucks (LYRE, LIFT: the Skald's), <semis> higher."""
    return L(191883, LYRE[n] - 0.010, dur, at, semis, db + LIFT[n], fin=0.002, fout=0.2)


def hapollo():
    return layer([lyre('E3', 0.000, db=-2), lyre('A3', 0.040), lyre('E4', 0.080, db=-1), lyre('A4', 0.120, db=-2)])  # a lyre strummed


def hartemis():
    return layer([
        L('old:sfx_smack_hero_artemis', 0.0, 0.50, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(384916, 0.085, 0.20, 0.000, 0.0, 0, fin=0.001, fout=0.1),             # a bow released
    ])


def haphrodite():
    return layer([L(594961, 0.500, 0.49, 0.000, 12.0, 0, fin=0.005, fout=0.15)])  # a harp glissando, an octave up


def hhermes():
    return layer([
        L(153277, 0.440, 0.30, 0.000, 3.0, -7, fin=0.003, fout=0.08),           # a pigeon's wingbeats, higher
        L(475131, 0.020, 0.25, 0.000, 5.0, 6, fin=0.005, fout=0.08),            # a swoosh, higher
    ])


def hdionysus():
    return layer([
        L(835833, 0.465, 0.40, 0.000, 0.0, 0, fin=0.001, fout=0.15),            # two wine glasses clinking
        L(553954, 0.090, 0.30, 0.100, 0.0, -4, fin=0.003, fout=0.1),            # a bottle glugging
    ])


def hhestia():
    return layer([
        L(382616, 10.130, 0.45, 0.000, 0.0, 12, fin=0.003, fout=0.15),          # a fire crackling in a fireplace
        L(271370, 0.020, 0.45, 0.000, -6.0, 8, fin=0.002, fout=0.15),           # a singing bowl struck, lower
    ])


def hodin():
    return layer([
        L('old:sfx_smack_hero_odin', 0.0, 0.55, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(827424, 0.030, 0.30, 0.050, -2.0, 0, fin=0.005, fout=0.1),            # a raven's caw, a little lower
    ])


def hfrigg():
    return layer([
        L('old:sfx_smack_hero_frigg', 0.0, 0.40, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(378366, 0.500, 0.40, 0.000, 0.0, 15, fin=0.02, fout=0.1),             # a bicycle wheel spinning
    ])


def hfreya():
    return layer([L(867997, 0.060, 0.30, 0.000, 0.0, 0, fin=0.005, fout=0.08, fx='highpass=f=400')])  # a gyrfalcon's call


def hfreyr():
    return layer([
        L(842313, 0.020, 0.30, 0.000, -3.0, 0, fin=0.005, fout=0.1),            # a pig's growling grunt, lower: the boar
        L(510735, 0.280, 0.35, 0.120, 0.0, 11, fin=0.002, fout=0.15),           # a coin dropped on a table
    ])


def htyr():
    return layer([L(853153, 0.040, 0.55, 0.000, 3.0, 0, fin=0.002, fout=0.2, fx='lowpass=f=1000,' + DECAY % 6)])  # a big gong struck, dark, damped


def hheimdall():
    return layer([
        L(392180, 0.050, 0.44, 0.000, -7.0, 0, fin=0.01, fout=0.08),            # a battle horn blown, lower
        L(392180, 0.050, 0.44, 0.010, -12.0, -6, fin=0.01, fout=0.08),          # and lower still under it
    ])


def hnjord():
    return layer([
        L(381853, 0.620, 0.44, 0.000, 0.0, 28, fin=0.04, fout=0.15),            # a gust of wind
        L(376799, 0.850, 0.36, 0.080, 0.0, 8, fin=0.01, fout=0.15),             # a wave crashing on rocks
    ])


def hskadi():
    return layer([
        L(592379, 0.550, 0.30, 0.000, 0.0, 0, fin=0.03, fout=0.08),             # skis passing on snow
        L(262635, 0.120, 0.20, 0.150, 0.0, 6, fin=0.002, fout=0.08),            # ice cracking
    ])


def hidun():
    return layer([
        L('old:sfx_smack_hero_idun', 0.0, 0.50, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(79240, 1.770, 0.20, 0.000, 0.0, 3, fin=0.002, fout=0.08),             # a bite into an apple
    ])


def hbragi():
    return layer([lyre('E3', 0.000, db=-3), lyre('A3', 0.050, db=-2), lyre('E4', 0.100, db=-1), lyre('F#4', 0.150, db=-1),
                  lyre('A4', 0.200)])  # a rising run on the lyre


def hdarkkneader():
    return layer([
        L('old:sfx_smack_hero_darkkneader', 0.0, 0.50, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(73678, 0.020, 0.50, 0.000, 12.0, -8, fin=0.002, fout=0.15, fx=DECAY % 6),  # a toll bell, an octave up, damped
    ])


def hodinascended():
    return layer([
        L('old:sfx_smack_hero_odinascended', 0.0, 0.60, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(853153, 0.040, 0.60, 0.000, 2.0, -3, fin=0.002, fout=0.2, fx='lowpass=f=2500'),  # a big gong struck
    ])


def hzeusunbound():
    return layer([
        L(188767, 0.180, 0.74, 0.000, -2.0, 0, fin=0.002, fout=0.25),           # thunder cracking, lower
        L(505113, 0.760, 0.70, 0.040, 0.0, 0, fin=0.005, fout=0.25),            # a close clap of thunder rolling
    ])


def hsymbiotepan():
    return layer([
        L('old:sfx_smack_hero_symbiotepan', 0.0, 0.45, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(433829, 0.380, 0.40, 0.050, 0.0, 17, fin=0.005, fout=0.1),            # a rubber stress ball squished: the slime
    ])


def hamazonqueen():
    return layer([
        L('old:sfx_smack_hero_amazonqueen', 0.0, 0.49, 0.0, 0.0, 0, fin=0.002, fout=0.06),
        L(719638, 1.250, 0.44, 0.000, 0.0, 2, fin=0.01, fout=0.08, fx='highpass=f=80'),  # a lasso swung round
    ])


# --- the Endgame variants whose hero's tail is now real: that tail, and the old synthesized portal ring on top, at
# 0.12 s, its level against the tail as it was in the old file (scripts/smack-sfx/build.py: its hero's tail and portal()) ---
def portal_ring():
    """the Endgame portal ring, rendered by scripts/smack-sfx/build.py's portal() in a fresh process (its noise comes
    from a seeded generator, so it is the same every run), padded to PAD s."""
    out = os.path.join(TMP, 'portal.wav')
    if not os.path.exists(out):
        raw = out[:-4] + '.f32'
        code = ('import array, importlib.util, sys; sys.path.insert(0, %r); '
                's = importlib.util.spec_from_file_location("smackbuild", %r); m = importlib.util.module_from_spec(s); '
                's.loader.exec_module(m); open(%r, "wb").write(array.array("f", m.portal()).tobytes())') % (
            os.path.join(ROOT, 'scripts', 'boss-sfx'), os.path.join(ROOT, 'scripts', 'smack-sfx', 'build.py'), raw)
        subprocess.run([sys.executable, '-I', '-c', code], check=True, env=dict(os.environ, KENNEY=os.environ.get('KENNEY', '/none')))
        ff(['-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw, '-af', 'adelay=120,apad=whole_dur=%.1f' % PAD, '-c:a', 'pcm_f32le', out])
    return out


def endgame(base, rel_db):
    """<base>'s recipe with the portal ring <rel_db> dB from it on the 50 ms RMS peak, as in the old file."""
    b, p = base(), portal_ring()
    return mixw([(b, 0.0), (p, rms50(read(b)) + rel_db - rms50(read(p)))])


def hincrediblebulkendgame():
    return endgame(hincrediblebulk, -2.3)


def hhawkeyetalianendgame():
    return endgame(hhawkeyetalian, -2.6)


def hwasabiwaspendgame():
    return endgame(hwasabiwasp, 5.5)


# --- Act 10 · the First Pizzeria: crickets at night, a pine-wood bonfire crackling, a fire in a fireplace, and a
# gentle breeze; 50 s crossfaded loop ---
def firstpizzeria():
    return layer2([
        Ls(522298, 20.0, LOOP + XF, 0.0, 0.0, 6, fin=0.01, fout=0.01),          # crickets at night, in a garden
        Ls(186316, 10.0, LOOP + XF, 0.0, 0.0, 14, fin=0.01, fout=0.01),         # a pine-wood bonfire at night
        Ls(382616, 10.0, LOOP + XF, 0.0, 0.0, 6, fin=0.01, fout=0.01, fx='lowpass=f=9000'),  # a fireplace's crackle
        Ls(181252, 20.0, LOOP + XF, 0.0, 0.0, -2, fin=0.01, fout=0.01, fx='lowpass=f=2500'),  # a gentle breeze
    ], post='lowpass=f=13000,acompressor=threshold=-32dB:ratio=3:attack=1:release=80:knee=4')  # the crackle's sharpest edges off (so they don't overshoot once encoded) and its pops held in


# =============================== Audio pass, batch 5: the nemesis stages of Kratos in Tartarus and Leonidas's Hot Gates
# As batches 1–4: each replaces (or layers with) a synthesized file under the same name, on the old file's beats, and
# its level (RECIPES) sits halfway between the old file's 50 ms RMS peak and the level matching its momentary loudness.
# The two stages share one kit each, so the same recordings recur across related moves: for Kronos, heavy stone
# (grinding, cracking, falling), chains and big cats' roars; for the Persians and Spartans, horses, bows, horns,
# bronze and men's shouts.
STONE = 'lowpass=f=6000'  # stone's glassy top off, so a pitched-down crash reads as rock, not tiles
REV = 'areverse,asetpts=N/SR/TB'  # a layer played backwards (its timestamps restarted, so a post envelope sees the right t)
T0 = 'asetpts=N/SR/TB,'  # a post envelope's clock restarted on the mix, so its t counts from the first sample
DAMP = "asetnsamples=n=64,volume='max(exp(-%d*t),%.2f)':eval=frame"  # a hit damped fast, down to a floor it then rings on at


# --- the Kratos Peel in Tartarus · Kronos, the Titan King ---
def tkenter():
    return layer([
        L('old:sfx_titanking_enter', 0.0, 2.38, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(703247, 0.020, 2.40, 0.000, -5.0, -7, fin=0.002, fout=0.4, fx='lowpass=f=1800'),  # a crash of tiles, stone and metal, lower
        L(611669, 3.450, 1.60, 0.120, -3.0, -2, fin=0.05, fout=0.5, fx='lowpass=f=3000'),  # heavy chains rattling, lower
    ])


def tkroar():
    return layer([
        L(869002, 0.780, 1.25, 0.000, -7.0, 0, fin=0.03, fout=0.3, keep=False),  # lions roaring, far lower and slower
        L(263115, 1.550, 1.90, 0.050, -6.0, 2, fin=0.06, fout=0.4),           # a tiger's roar, lower: the second voice
        L(763026, 2.600, 1.90, 0.000, -6.0, 6, fin=0.1, fout=0.4, fx='lowpass=f=1200'),  # a bear's growl, lower: the rumble
    ])


def tkflip():
    return layer([
        L(760672, 0.600, 1.40, 0.000, 0.0, 2, fin=0.2, fout=0.4, fx='highpass=f=250'),  # heavy stone grinding
        L(475131, 0.000, 0.60, 0.450, -4.0, -10, fin=0.05, fout=0.25, keep=False),  # a super-heavy swoosh, lower: it turns over
        L(706231, 0.400, 0.90, 0.550, 0.0, 10, fin=0.03, fout=0.3),            # an hourglass just flipped, its sand running
    ], post=T0 + swell(0.82, 1.40, 0.2) + ',acompressor=threshold=-28dB:ratio=3:attack=20:release=200:knee=6')


def tktick():
    return layer([
        L('old:sfx_titanking_tick', 0.0, 0.39, 0.0, 0.0, 0, fin=0.001, fout=0.05),
        L(534094, 0.020, 0.30, 0.000, -9.0, 8, fin=0.0005, fout=0.12),          # a wall clock's tick, far lower
    ])


def tkshatter():
    return layer([
        L(336425, 0.000, 1.50, 0.000, -3.0, 0, fin=0.001, fout=0.5),            # glass shattering and tinkling as it falls, lower
        L(371094, 0.190, 1.20, 0.000, -5.0, -2, fin=0.001, fout=0.4),           # a large glass bottle shattering, lower
        L(326304, 0.500, 1.30, 0.150, 0.0, 10, fin=0.1, fout=0.5),             # gravel pouring, edited to sound like sand
    ])


def tkchomp():
    return layer([
        L(539177, 0.020, 0.70, 0.000, -9.0, 9, fin=0.001, fout=0.25, fx=DAMP % (14, 0.35)),  # a stone hitting a big stone, far lower: the jaw
        L(703248, 0.020, 0.70, 0.000, -6.0, 10, fin=0.001, fout=0.3, fx='lowpass=f=1500,' + DAMP % (10, 0.25)),  # a crash of tiles, stone and metal, lower
        L(20185, 0.040, 0.60, 0.000, -10.0, -1, fin=0.001, fout=0.3, fx='lowpass=f=300'),  # a massed stomp on plywood, far lower: the weight
        L(816237, 0.020, 0.30, 0.020, -3.0, 9, fin=0.001, fout=0.1),            # a bite of crispy toast, lower: the crust
    ], post='volume=-15dB,lowpass=f=1500')  # (under the master's compressor, so the bite stays sharp)


def tkchew():
    return layer([
        L(760672, 2.850, 0.54, 0.000, -3.0, 0, fin=0.06, fout=0.15),            # stone grinding, lower
        L(753310, 0.030, 0.35, 0.120, -2.0, -2, fin=0.002, fout=0.1),           # a corn chip bitten, a little lower
        L(816237, 0.020, 0.30, 0.260, -4.0, -2, fin=0.002, fout=0.1),           # and a crunch of toast
    ])


def tkjawhit():
    return layer([
        L(539177, 0.020, 0.54, 0.000, -5.0, 0, fin=0.001, fout=0.25, fx=DAMP % (14, 0.2)),  # a stone hitting a big stone, lower: the clack
        L(29986, 0.350, 0.30, 0.230, -3.0, -4, fin=0.002, fout=0.1, fx=DAMP % (14, 0.2)),  # stone dragged on stone: it grinds back
    ], post='lowpass=f=1500')


def tkfreed():
    return layer([
        L('old:sfx_titanking_freed', 0.0, 0.80, 0.0, 0.0, 0, fin=0.001, fout=0.1),
        L(765844, 5.090, 0.40, 0.000, -2.0, 11, fin=0.001, fout=0.2),           # a rock smashed, a little lower: the crack
    ])


def tkchain():
    return layer([
        L(611669, 0.750, 0.40, 0.000, 0.0, -16, fin=0.2, fout=0.08),            # heavy chains rattling
        L(453301, 0.140, 1.00, 0.270, -3.0, 12, fin=0.002, fout=0.4, fx=DAMP % (6, 0.15)),  # thick chains dropped, lower: they crash down
        L(20185, 0.040, 0.60, 0.290, -9.0, -12, fin=0.002, fout=0.3, fx='lowpass=f=600'),  # a massed stomp on plywood, far lower: the slam
    ], post='lowpass=f=4000')


def tkchainbreak():
    links = [L(733599, s, 0.32, t, -2.0, d, fin=0.002, fout=0.12) for s, t, d in
             ((1.300, 0.110, -2), (2.290, 0.350, 0), (3.360, 0.630, 0), (4.230, 0.900, -3))]
    return layer([
        L(386111, 0.000, 0.40, 0.000, -2.0, 0, fin=0.0005, fout=0.2),           # a hammer on steel on an anvil: the snap
    ] + links + [                                                              # chain links dropped, scattering
        L(871034, 0.000, 0.60, 0.200, 0.0, -2, fin=0.002, fout=0.2),            # and a small chain dropped
    ], post=PEAKS)


def tkdeath():
    return layer([
        L(703247, 0.020, 1.95, 0.430, -5.0, 0, fin=0.01, fout=0.8, fx='lowpass=f=1800'),   # a crash of tiles, stone and metal, lower
        L(162674, 1.200, 2.38, 0.000, -3.0, -1, fin=0.5, fout=0.6),            # a stone avalanche, lower
        L(567249, 0.000, 1.90, 0.480, -2.0, -5, fin=0.01, fout=0.6, fx='lowpass=f=2500'),           # bricks, stones and rocks falling and rolling
        L(453301, 0.140, 1.00, 0.700, -4.0, 2, fin=0.002, fout=0.4),            # thick chains falling, lower
    ], post=T0 + "lowpass=f=2800,asetnsamples=n=64,volume='if(lt(t,0.62),1,max(0.5,1-(t-0.62)*0.9))':eval=frame")  # the crash, then it settles


def tkstrain():
    return layer([
        L(680135, 2.700, 0.60, 0.100, -7.0, 0, fin=0.05, fout=0.3, keep=False),  # a man grunting with effort, far lower, slower
        L(680135, 0.750, 0.40, 0.000, -9.0, -10, fin=0.1, fout=0.2, keep=False),  # and a lower one before it
        L(611671, 3.250, 1.45, 0.000, -5.0, 0, fin=0.35, fout=0.3, fx='lowpass=f=4000'),  # heavy chains dragged, lower: taut
        L(611671, 4.850, 0.60, 0.900, -6.0, -2, fin=0.1, fout=0.3, fx='lowpass=f=4000'),
    ])


def tkweakhit():
    return layer([
        L(386105, 0.000, 0.44, 0.000, 0.0, 0, fin=0.0005, fout=0.15, fx='lowpass=f=2000,' + DAMP % (9, 0.25)),  # an anvil hammered on its back
        L(235597, 0.660, 0.44, 0.010, 0.0, -3, fin=0.002, fout=0.15, fx=DAMP % (8, 0.25)),  # water sizzling on a hot stove
    ], post=PEAKS)


def tkweakbreak():
    return layer([
        L(386111, 0.000, 0.80, 0.000, -2.0, 0, fin=0.0005, fout=0.4),           # a hammer on steel on an anvil: the crack
        L(93100, 0.000, 0.40, 0.050, 0.0, -2, fin=0.001, fout=0.15),            # a whip cracked: the chain whips away
        L(475131, 0.000, 0.60, 0.100, 0.0, -4, fin=0.02, fout=0.25),            # a super-heavy swoosh
        L(733599, 1.300, 0.50, 0.850, 0.0, -2, fin=0.002, fout=0.25),           # links dropped, rattling down
        L(234782, 0.550, 0.50, 0.880, 0.0, -14, fin=0.02, fout=0.3, fx='highpass=f=2000'),  # and a steam hiss
    ], post=PEAKS)


def tkrip():
    return layer([
        L(765844, 5.090, 0.40, 0.000, -4.0, 16, fin=0.001, fout=0.2),           # a rock smashed, lower: the wall cracks
        L(765844, 1.030, 0.25, 0.300, -6.0, 14, fin=0.001, fout=0.1),           # and again, lower still
        L(765844, 2.880, 0.25, 0.650, -5.0, 14, fin=0.001, fout=0.1),           # and again
        L(869003, 9.400, 1.00, 0.100, -8.0, 0, fin=0.03, fout=0.3, keep=False),  # a lion's roar, far lower and slower
        L(611669, 3.450, 1.50, 0.050, -2.0, -2, fin=0.03, fout=0.4),           # heavy chains rattling, lower
    ])


def tkscrape():
    return layer([
        L(611671, 3.250, 0.90, 0.000, -2.0, 0, fin=0.05, fout=0.2),             # heavy chains dragged, lower
        L(611671, 4.850, 0.80, 0.750, -3.0, 0, fin=0.1, fout=0.2),              # and dragged on
        L(611671, 6.700, 0.80, 1.450, -2.0, 0, fin=0.1, fout=0.3),
        L(720829, 0.650, 1.00, 0.100, -3.0, -4, fin=0.05, fout=0.3),            # a circular saw blade scraped on concrete, lower
        L(720829, 0.650, 1.00, 1.050, -5.0, -6, fin=0.05, fout=0.3),            # and again, lower still
        L(760672, 3.900, 2.30, 0.000, -3.0, -6, fin=0.2, fout=0.4),            # heavy stone grinding: the grit
    ])


def tkunchained():
    return layer([
        L('old:sfx_titanking_unchained', 0.0, 2.60, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(869002, 6.300, 1.55, 0.050, -8.0, 0, fin=0.05, fout=1.0, keep=False),  # lions roaring, far lower and slower
        L(149190, 5.400, 1.55, 0.450, -6.0, -4, fin=0.05, fout=0.9),           # a tiger's roar, lower
        L(611669, 3.450, 1.60, 0.000, -2.0, -2, fin=0.03, fout=0.5),           # heavy chains rattling, lower
    ])


def tkswing():
    return layer([
        L(475131, 0.000, 0.61, 0.120, -9.0, -5, fin=0.15, fout=0.3, keep=False),  # a super-heavy swoosh, far lower and slower
        L(475131, 0.000, 0.61, 0.440, -7.0, 0, fin=0.05, fout=0.3, keep=False),  # and again as it comes down
        L(611669, 0.750, 0.55, 0.080, -2.0, -9, fin=0.1, fout=0.2),            # heavy chains rattling
        L(611669, 2.000, 0.40, 0.780, -2.0, -6, fin=0.03, fout=0.2),
    ])


def tkbladehit():
    return layer([
        L(180818, 0.170, 0.48, 0.000, -2.0, 0, fin=0.001, fout=0.2, fx=DAMP % (6, 0.18)),  # real swords clashing, a little lower
        L(386105, 0.000, 0.48, 0.000, -3.0, -4, fin=0.0005, fout=0.2, fx=DAMP % (6, 0.18)),  # an anvil's ring, lower
    ], post='lowpass=f=4000,' + PEAKS)


def tkcrumble():
    return layer([
        L(162674, 1.200, 1.98, 0.000, -4.0, 0, fin=0.03, fout=0.5),            # a stone avalanche, lower: the deep rumble
        L(765844, 1.030, 0.25, 0.300, -4.0, 8, fin=0.001, fout=0.1, fx='lowpass=f=2000'),  # a rock smashed, lower: stones cracking
        L(765844, 2.880, 0.25, 0.900, -5.0, 8, fin=0.001, fout=0.1, fx='lowpass=f=2000'),
        L(765844, 3.970, 0.25, 1.400, -3.0, 6, fin=0.001, fout=0.1, fx='lowpass=f=2000'),
        L(34175, 0.450, 1.60, 0.350, 0.0, -2, fin=0.05, fout=0.5),             # gravel poured out on stairs
    ], post='volume=-12dB,lowpass=f=3000')  # (under the master's compressor, so the cracks stay sharp)


def tkrockcrack():
    return layer([
        L(765844, 5.090, 0.40, 0.000, -3.0, 16, fin=0.001, fout=0.2, fx='lowpass=f=2500'),  # a rock smashed, lower: the boulder cracks
        L(578490, 4.500, 0.65, 0.080, -3.0, 9, fin=0.05, fout=0.2, fx=DAMP % (6, 0.2)),           # a heavy stone door grinding, lower
        L(391919, 0.000, 0.80, 0.150, 0.0, 8, fin=0.01, fout=0.3),             # rock crumbling: a trickle of grit
    ], post='volume=-14dB')  # (under the master's compressor, so the crack stays sharp)


def tkrockfall():
    return layer([
        L(475131, 0.000, 0.61, 0.250, -7.0, 0, fin=0.02, fout=0.02, keep=False, fx=REV),  # a super-heavy swoosh, far lower, backwards: it falls towards you
        L(567250, 0.000, 1.40, 0.000, 0.0, -4, fin=0.1, fout=0.3),             # rocks dropped, tumbling
    ], post=T0 + swell(1.08, 1.40, 0.12))


def tkrocksmash():
    return layer([
        L(703248, 0.020, 0.88, 0.000, -3.0, 0, fin=0.001, fout=0.35, fx=STONE),  # a crash of tiles, stone and metal, lower
        L(539177, 0.020, 0.60, 0.000, -6.0, 0, fin=0.001, fout=0.25),           # a stone hitting a big stone, lower
        L(567249, 0.000, 0.80, 0.080, 0.0, -6, fin=0.01, fout=0.3),            # bricks, stones and rocks scattering
    ], post='lowpass=f=5000')


def tkrockland():
    return layer([
        L(20185, 0.040, 0.66, 0.000, -8.0, 0, fin=0.002, fout=0.3, fx='lowpass=f=1500'),  # a massed stomp on plywood, far lower: the thud
        L(703247, 0.020, 0.92, 0.000, -7.0, -3, fin=0.002, fout=0.4, fx=STONE),  # a crash of tiles, stone and metal, far lower
        L(816237, 0.020, 0.30, 0.010, -5.0, -4, fin=0.001, fout=0.1),           # crispy toast crunched, lower: the crust
    ])


def tkpierce():
    return layer([
        L('old:sfx_titanking_pierce', 0.0, 0.90, 0.0, 0.0, 0, fin=0.001, fout=0.1),
        L(371094, 0.190, 0.90, 0.000, -2.0, 0, fin=0.001, fout=0.3),            # a large glass bottle shattering, a little lower
    ])


def tkrise():
    return layer([
        L(578490, 3.300, 1.69, 0.000, -4.0, 0, fin=0.1, fout=0.4),             # a heavy stone door opening, lower
        L(763026, 2.600, 1.69, 0.000, -6.0, -3, fin=0.2, fout=0.4, fx='lowpass=f=900'),  # a bear's growl, lower
        L(162674, 0.600, 1.69, 0.000, -5.0, -6, fin=0.3, fout=0.4),            # a stone avalanche, far off: the rumble
    ], post='lowpass=f=1400')  # from behind the table


def tkheadchew():
    return layer([
        L(760672, 3.850, 0.48, 0.000, -4.0, 0, fin=0.03, fout=0.15),            # stone grinding, lower
        L(753310, 0.030, 0.35, 0.020, -2.0, -2, fin=0.002, fout=0.1),           # a corn chip bitten
        L(816237, 0.020, 0.30, 0.200, -3.0, -2, fin=0.002, fout=0.1),           # and a crunch of toast
    ])


def tksink():
    return layer([
        L(578491, 3.900, 0.75, 0.000, -4.0, 3, fin=0.01, fout=0.2),            # a heavy stone door grinding, lower
        L(578491, 5.200, 0.85, 0.500, -7.0, -4, fin=0.15, fout=0.4),            # and lower still as it sinks
        L(162674, 0.600, 1.35, 0.000, -6.0, -6, fin=0.2, fout=0.5),            # a stone avalanche, far off: the rumble
    ], post='lowpass=f=1800')  # behind the table


def tkgulp():
    g = layer([
        L(531755, 0.110, 0.45, 0.000, -10.0, 0, fin=0.004, fout=0.12, keep=False),  # a hard swallow, far lower and slower
        L(829847, 0.240, 0.40, 0.040, -8.0, -2, fin=0.004, fout=0.12, keep=False),  # a gulp, far lower
    ])
    return reverb(fx(g, DECAY % 3), rt60=0.6, wet_db=-10.0, seed=11)  # in a cavern


# --- Tartarus · Zeus, and the gods he calls on ---
def zeusenter():
    return layer([
        L('old:sfx_zeus_enter', 0.0, 1.83, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(188767, 0.100, 1.80, 0.000, -2.0, 0, fin=0.002, fout=0.6),            # a real crack of thunder, a little lower
    ])


def zeusthunder():
    return layer([
        L(505113, 0.720, 2.40, 0.000, -2.0, 0, fin=0.005, fout=0.8),            # a close clap of thunder rolling, a little lower
        L(38244, 0.600, 2.40, 0.150, -3.0, -3, fin=0.05, fout=0.8),            # and a second roll under it
    ])


def zeusbolt():
    return layer([
        L('old:sfx_zeus_bolt', 0.0, 1.20, 0.0, 0.0, 0, fin=0.001, fout=0.2),
        L(188767, 0.150, 1.10, 0.000, 0.0, 0, fin=0.001, fout=0.5),             # a real crack of thunder
    ])


def zeushurl():
    return layer([
        L('old:sfx_zeus_hurl', 0.0, 0.90, 0.0, 0.0, 0, fin=0.001, fout=0.1),
        L(475131, 0.000, 0.61, 0.050, 0.0, 0, fin=0.01, fout=0.25),             # a super-heavy swoosh
    ])


def zeusposeidon():
    return layer([
        L('old:sfx_zeus_poseidon', 0.0, 1.80, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(705058, 6.300, 1.80, 0.000, 0.0, 4, fin=0.3, fout=0.3),              # the sea surging under water
        L(376800, 7.000, 1.80, 0.000, 0.0, -2, fin=0.6, fout=0.3),             # a large wave rising onto rocks
    ])


def zeuswave():
    return layer([
        L(376800, 7.850, 1.75, 0.000, -2.0, -14, fin=0.005, fout=0.3),          # large waves crashing into large rocks, lower
        L(442773, 0.350, 1.20, 0.000, -3.0, -17, fin=0.005, fout=0.5),          # a big water splash, lower
    ], post=T0 + DAMP % (5, 0.22) + ',equalizer=f=800:t=o:w=2:g=-10')


def zeustrident():
    return layer([
        L(337845, 0.150, 0.42, 0.000, 0.0, 0, fin=0.0005, fout=0.2),            # a metal shed door struck, ringing: the trident
        L(442773, 0.400, 0.42, 0.020, 0.0, -2, fin=0.005, fout=0.2),            # and a splash
    ], post=PEAKS)


def zeusares():
    return layer([
        L(392180, 0.050, 1.29, 0.000, -12.0, 0, fin=0.03, fout=0.3),           # a battle horn blown, an octave lower
        L(479998, 0.300, 1.29, 0.020, -17.0, -1, fin=0.06, fout=0.3),          # a note blown on a cow horn (or a conch), far lower
    ])


def zeuswarcry():
    return layer([
        L(480805, 5.200, 1.09, 0.000, -2.0, 0, fin=0.03, fout=0.25),            # a small group of men shouting, a little lower
        L(57204, 0.050, 1.00, 0.020, -3.0, -4, fin=0.01, fout=0.3),             # men shouting "hey", lower
        L(527740, 0.000, 0.60, 0.250, -2.0, -4, fin=0.01, fout=0.2),            # men shouting "hey" together, lower
        L(416507, 0.000, 1.09, 0.050, -3.0, -4, fin=0.01, fout=0.3),            # two men shouting "hey" over and over, lower
        L(449915, 1.700, 1.09, 0.000, 0.0, -4, fin=0.03, fout=0.3),             # a crowd roaring
    ], post='acompressor=threshold=-24dB:ratio=4:attack=5:release=60:knee=4')


def zeuscrown():
    return layer([
        L('old:sfx_zeus_crown', 0.0, 0.90, 0.0, 0.0, 0, fin=0.001, fout=0.1),
        L(371094, 0.190, 0.90, 0.000, 2.0, -2, fin=0.001, fout=0.3),            # a glass bottle shattering, a little higher
        L(334969, 0.550, 0.85, 0.020, 0.0, 8, fin=0.005, fout=0.3),             # coins poured onto wood: the gold
    ])


def zeusdeath():
    return layer([
        L(38244, 0.780, 2.79, 0.000, -3.0, 0, fin=0.01, fout=1.0),             # thunder rolling away, lower
        L(765844, 5.090, 0.40, 0.020, -1.0, 12, fin=0.001, fout=0.2),           # a rock smashed: the marble cracks
        L(765844, 1.030, 0.25, 0.500, -2.0, 10, fin=0.001, fout=0.1),           # and again
        L(764221, 2.400, 1.30, 0.100, -3.0, 10, fin=0.15, fout=0.04, fx='lowpass=f=2400'),  # a crowd singing "ah", lower, cut short
    ])


# --- Leonidas's Hot Gates · the Persians and the Spartans ---
def trumpet():
    return layer([
        L(819668, 0.000, 0.80, 0.000, 0.0, 0, fin=0.01, fout=0.2),              # an elephant trumpeting (a zoo field recording)
    ])


def spartanroar():
    return reverb(layer([
        L(695376, 0.000, 0.79, 0.000, -2.0, 0, fin=0.01, fout=0.15),            # a man's battle cry, a little lower
        L(440035, 0.650, 0.79, 0.000, -3.0, -3, fin=0.01, fout=0.2),           # a warrior's "yeah!", lower
    ]), rt60=0.4, wet_db=-12.0, seed=5)


def bronzeshield():
    return layer([
        L(784152, 0.000, 0.50, 0.000, -5.0, 0, fin=0.0005, fout=0.2, fx=DAMP % (6, 0.1)),  # a thick metal plate struck, lower: bronze
        L(337845, 0.150, 0.50, 0.000, -3.0, -4, fin=0.0005, fout=0.2, fx=DAMP % (6, 0.1)),  # a metal shed door struck, lower
    ], post=PEAKS)


def immortalfall():
    return layer([
        L(244926, 0.150, 0.69, 0.000, -3.0, 0, fin=0.005, fout=0.3),            # diesel thrown on a fire, lower
        L(539972, 0.000, 0.60, 0.000, -5.0, -2, fin=0.002, fout=0.25),          # a burst of gas flame, lower
        L(20185, 0.050, 0.30, 0.050, -5.0, -6, fin=0.002, fout=0.15, fx='lowpass=f=1500'),  # a massed stomp on plywood, lower: he falls
    ])


def bowdraw():
    return layer([
        L(490556, 0.050, 0.55, 0.000, 0.0, 0, fin=0.02, fout=0.06),             # a bow being drawn
    ])


def arrowloose():
    return layer([
        L(384916, 0.085, 0.30, 0.000, 0.0, 0, fin=0.001, fout=0.12),            # a bow released
        L(394180, 0.040, 0.39, 0.020, 0.0, 14, fin=0.01, fout=0.15),            # an arrow loosed, flying off
    ])


def arrowthunk():
    return layer([
        L(534956, 0.090, 0.36, 0.000, 0.0, 0, fin=0.001, fout=0.2),             # an arrow from a longbow into a wooden shed
        L(384914, 0.050, 0.30, 0.000, 0.0, -2, fin=0.001, fout=0.12),           # an arrow hitting its target
    ], post=PEAKS)


def gallop():
    return layer([
        L(321952, 0.850, 1.18, 0.000, 0.0, 0, fin=0.01, fout=0.1),              # a horse galloping full speed
    ])


def neigh():
    return layer([
        L(347036, 1.380, 0.85, 0.000, 0.0, 0, fin=0.02, fout=0.3),              # a horse whinnying
    ])


def chariotrev():
    spin = [L(480020, 2.0 + 0.6 * k, 0.40, 0.18 * k, -4.0 + 2.5 * k, 0, fin=0.08, fout=0.12) for k in range(5)]
    return layer(spin + [                                                       # wooden wheels rolling, faster and faster
        L(480020, 5.200, 0.42, 0.740, 6.0, 0, fin=0.06, fout=0.15),
    ], post=T0 + swell(0.80, 1.14, 0.2) + ',lowpass=f=1500')


def chariotroll():
    return layer([
        L(480020, 2.000, 1.68, 0.000, -3.0, 0, fin=0.1, fout=0.3),              # wooden wheels rolling over a gritty road, lower
        L(480020, 4.200, 1.68, 0.000, -8.0, -4, fin=0.1, fout=0.3),             # again, far lower: the rumble
    ], post='lowpass=f=1500')


def chariotchip():
    return layer([
        L(816237, 0.020, 0.22, 0.000, 0.0, 0, fin=0.001, fout=0.08, fx=DAMP % (14, 0.1)),  # crispy toast bitten: the crust chips
        L(753310, 0.030, 0.22, 0.000, 0.0, -2, fin=0.001, fout=0.08, fx=DAMP % (14, 0.1)),  # a corn chip bitten
    ], post='lowpass=f=2800')


def hubbreak():
    return layer([
        L(352198, 0.860, 0.81, 0.000, -2.0, 0, fin=0.001, fout=0.3),            # a wooden fence panel snapped, a little lower
        L(178658, 0.500, 0.81, 0.030, 0.0, 9, fin=0.002, fout=0.3),            # a plank breaking, splinter by splinter
        L(784152, 0.000, 0.60, 0.000, -4.0, -1, fin=0.0005, fout=0.25),          # a thick metal plate struck, lower: the bronze hub
    ], post=T0 + DAMP % (4, 0.25) + ',lowpass=f=4000,' + PEAKS)


def warhorn():
    return layer([
        L(392180, 0.100, 0.66, 0.000, -12.0, 0, fin=0.03, fout=0.06),          # a battle horn blown, an octave lower
        L(392180, 0.500, 0.85, 0.600, -7.0, 0, fin=0.03, fout=0.3),            # and a fourth up
    ])


def immortalbruteenter():
    mask = 'lowpass=f=1600,equalizer=f=500:t=q:w=1:g=4'  # behind his mask: muffled, boxy
    return layer([
        L(20185, 0.040, 0.66, 0.000, -8.0, 0, fin=0.002, fout=0.3, fx='lowpass=f=1500'),  # a massed stomp on plywood, far lower: he lands
        L(703247, 0.020, 1.60, 0.000, -5.0, -3, fin=0.002, fout=0.6, fx='lowpass=f=2500'),  # a crash of tiles, stone and metal, lower
        L(611669, 3.450, 1.20, 0.080, 0.0, -4, fin=0.03, fout=0.4),            # heavy chains rattling
        L(869003, 9.400, 0.90, 0.250, -6.0, -2, fin=0.05, fout=0.3, keep=False, fx=mask),  # a lion's roar, lower, muffled
    ], post='lowpass=f=2400')


def immortalbrutehorde():
    return layer([
        L(392180, 0.100, 1.60, 0.050, -10.0, 0, fin=0.06, fout=0.4),           # a battle horn blown, lower
        L(200321, 1.000, 2.01, 0.000, 0.0, 2, fin=0.05, fout=0.4),             # boots marching in a military parade
    ])


def immortalbrutewhirl():
    sw = [L(475131, 0.000, 0.40, 0.04 + 0.27 * k, (0.0, -2.0)[k % 2], -2 if k % 2 else 0, fin=0.04, fout=0.12) for k in range(6)]
    return layer(sw + [                                                        # a super-heavy swoosh, again and again
        L(611669, 0.700, 0.60, 0.050, 0.0, -6, fin=0.05, fout=0.1),            # heavy chains rattling: the chain clinks
        L(611669, 3.500, 0.80, 0.650, 0.0, -6, fin=0.05, fout=0.1),
    ], post=T0 + swell(0.95, 1.70, 0.5))


def immortalbruteslam():
    return layer([
        L(703248, 0.020, 0.63, 0.000, -3.0, 4, fin=0.001, fout=0.3),            # a crash of tiles, stone and metal, lower
        L(20185, 0.040, 0.60, 0.000, -12.0, 5, fin=0.002, fout=0.3, fx='lowpass=f=300'),  # a massed stomp on plywood, an octave lower: the thump
        L(386111, 0.000, 0.50, 0.000, -6.0, -9, fin=0.0005, fout=0.25),          # a hammer on steel, lower: the blade
    ], post=T0 + DECAY % 5 + ',lowpass=f=1800,' + PEAKS)


def immortalbrutesnag():
    return layer([
        L(453301, 0.140, 0.60, 0.000, -2.0, 0, fin=0.002, fout=0.25),           # thick chains dropped: the clank
        L(386111, 0.000, 0.50, 0.000, -4.0, -3, fin=0.0005, fout=0.25),          # a hammer on steel, lower
        L(680135, 0.750, 0.40, 0.080, -6.0, 0, fin=0.03, fout=0.15, keep=False, fx='lowpass=f=1800'),  # a man grunting, lower, masked
    ], post=PEAKS)


def immortalbruteroar():
    mask = 'lowpass=f=1800,equalizer=f=600:t=q:w=1:g=4'
    return layer([
        L(869002, 4.900, 1.06, 0.000, -5.0, 0, fin=0.03, fout=0.3, keep=False, fx=mask),  # lions roaring, lower and slower, muffled
        L(763026, 2.700, 1.59, 0.000, -4.0, 5, fin=0.1, fout=0.4, fx=mask),   # a bear's growl, lower: the second voice
    ])


def immortalbrutedeath():
    return layer([
        L(457449, 0.050, 0.50, 0.000, -5.0, -14, fin=0.05, fout=0.1),           # a man's long groan, lower
        L(703247, 0.020, 1.66, 0.460, -4.0, 4, fin=0.001, fout=0.6, fx=DAMP % (6, 0.2)),  # a crash of tiles, stone and metal: his armour
        L(20185, 0.040, 0.60, 0.460, -10.0, 0, fin=0.001, fout=0.3, fx='lowpass=f=400'),  # a massed stomp on plywood, far lower: he hits the ground
        L(733599, 1.300, 0.50, 0.920, 0.0, 1, fin=0.002, fout=0.2),            # chains dropped, clattering
        L(733599, 2.290, 1.05, 1.300, 0.0, 1, fin=0.002, fout=0.6),
    ], post='lowpass=f=2000')


def xerxesenter():
    return layer([
        L('old:sfx_xerxes_enter', 0.0, 2.80, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(853153, 0.040, 2.80, 0.000, -3.0, 0, fin=0.002, fout=0.8),           # a big stainless gong, felt mallet, lower
        L(764221, 2.400, 2.70, 0.100, -5.0, 7, fin=0.4, fout=0.8, fx='lowpass=f=2000'),  # a crowd singing "ah", lower: the choir
    ])


def xerxeslaugh():
    ha = [L(400503, s, 0.24, t, -3.0, 0, fin=0.01, fout=0.08) for s, t in
          ((1.860, 0.000), (2.330, 0.260), (2.820, 0.520), (3.280, 0.780), (2.330, 1.040))]
    return reverb(layer(ha + [                                                 # a man's sinister laugh, cut into ha-ha-ha
        L(400503, 0.720, 0.75, 1.300, -3.0, 0, fin=0.02, fout=0.25),           # and its big HAAA, all a little lower
    ]), rt60=1.2, wet_db=-9.0, seed=13)  # in a hall


def xerxesarrows():
    bows = [L(384916, 0.085, 0.30, t, s, d, fin=0.001, fout=0.12) for t, s, d in
            ((0.00, 0, 0), (0.04, -2, -2), (0.07, 1, -3), (0.12, -1, -2), (0.16, 2, -4), (0.21, -3, -3), (0.27, 0, -4), (0.33, -2, -5))]
    # then the sky full of them: 42 arrows loosed and flying off, staggered, at other pitches, swelling to the top
    hiss = [L(394180, 0.040, 0.55, 0.25 + 0.05 * k, ((k * 7) % 9 - 4) * 0.6 + 2, 12 + 8.0 * k / 41, fin=0.05, fout=0.2) for k in range(42)]
    return layer(bows + hiss, post=T0 + 'highpass=f=600,equalizer=f=6000:t=q:w=1.5:g=8,' + swell(2.20, 2.60, 0.55) +
                 ',acompressor=threshold=-26dB:ratio=3:attack=10:release=150:knee=6')


def xerxesvolley():
    fly = [L(394180, 0.040, 0.55, t, s, 14, fin=0.03, fout=0.2) for t, s in ((0.02, 0), (0.08, -2), (0.14, 1), (0.20, -1), (0.27, 2))]
    hit = [L(f, st, 0.25, t, s, d, fin=0.001, fout=0.1) for f, st, t, s, d in
           ((534956, 0.090, 0.62, 0, 0), (384914, 0.050, 0.70, -2, -2), (534956, 0.090, 0.79, -3, -2), (384914, 0.050, 0.86, 0, -4))]
    return layer(fly + hit, post='highpass=f=300,' + PEAKS)


def xerxesrhino():
    return layer([
        L(463032, 1.000, 0.80, 0.000, -3.0, 0, fin=0.01, fout=0.1),             # agitated rhinos tussling (a zoo recording), lower
        L(867549, 1.550, 0.35, 0.020, -4.0, 16, fin=0.01, fout=0.15),           # a bison's nasal huff, lower
        L(475480, 0.050, 0.45, 0.500, -4.0, 0, fin=0.01, fout=0.15),            # a horse's snort, lower
        L(347149, 0.100, 0.70, 0.860, -3.0, -2, fin=0.01, fout=0.3),            # two pieces of granite scraped together: a hoof scrapes
    ])


def xerxescharge():
    return layer([
        L(321952, 0.850, 1.35, 0.000, -6.0, 0, fin=0.02, fout=0.1),             # a horse galloping full speed, lower: heavier
        L(571296, 4.950, 1.35, 0.000, -5.0, 9, fin=0.02, fout=0.1),            # hooves clattering, lower
        L(703247, 0.020, 0.64, 1.290, -5.0, 0, fin=0.001, fout=0.3, fx=STONE),  # a crash of tiles, stone and metal, lower
    ])


def xerxesturn():
    return layer([
        L(475480, 0.050, 0.45, 0.000, -4.0, 0, fin=0.005, fout=0.15),           # a horse's snort, lower
        L(321952, 0.850, 0.85, 0.220, -5.0, -2, fin=0.02, fout=0.5),            # a horse galloping, lower, faded out as it goes away
    ], post=T0 + "asetnsamples=n=64,volume='if(lt(t,0.25),1,max(0.08,1-(t-0.25)/0.8))':eval=frame")


def xerxeselephants():
    return layer([
        L(819668, 5.000, 0.60, 0.000, -2.0, 0, fin=0.02, fout=0.2),             # an elephant trumpeting, a little lower
        L(819668, 0.000, 0.80, 0.450, -4.0, -2, fin=0.02, fout=0.3),            # and again, lower: a second elephant
        L(34646, 0.200, 1.30, 0.300, -3.0, -4, fin=0.02, fout=0.4),            # an elephant growling, recorded in Tanzania, lower
        L(162674, 0.600, 1.77, 0.000, -5.0, -6, fin=0.2, fout=0.4),            # a stone avalanche, far off: the ground rumbles
    ])


def xerxesdeath():
    return layer([
        L(475131, 0.000, 0.45, 0.000, -6.0, -20, fin=0.05, fout=0.01, fx=REV),  # a heavy swoosh, lower, backwards: he topples
        L(703247, 0.020, 2.00, 0.460, -3.0, 0, fin=0.001, fout=0.7, fx=STONE),  # a crash of tiles, stone and metal
        L(334969, 0.550, 1.40, 0.500, 0.0, 0, fin=0.005, fout=0.5),             # coins poured onto wood: his gold
        L(453301, 0.140, 1.10, 0.550, -3.0, 1, fin=0.002, fout=0.4),           # thick chains dropped, lower
        L(853153, 0.040, 2.70, 0.470, -3.0, -2, fin=0.002, fout=1.2),           # a big gong, lower, fading
    ])


def holdline():
    wall = [L(784152, 0.000, 0.45, t, s, d, fin=0.0005, fout=0.2) for t, s, d in
            ((0.00, -5, -4), (0.07, -4, -5), (0.14, -6, -4), (0.21, -5, -5), (0.28, -4, -4), (0.35, -6, -5), (0.55, -5, 0))]
    return layer(wall + [                                                      # a thick metal plate struck, lower: a row of bronze shields
        L(337845, 0.150, 0.50, 0.550, -3.0, -2, fin=0.0005, fout=0.25),         # and a metal shed door: the wall slams down
        L(57204, 0.050, 1.00, 0.050, -3.0, 0, fin=0.01, fout=0.3),              # men shouting "hey", lower
    ], post=PEAKS)


def spear():
    return layer([
        L(475131, 0.000, 0.40, 0.050, 2.0, 0, fin=0.02, fout=0.1),              # a super-heavy swoosh, higher: the spear flies
        L(534956, 0.090, 0.20, 0.390, -2.0, 0, fin=0.001, fout=0.1),            # an arrow from a longbow into a wooden shed: the thunk
    ], post=PEAKS)


def hotgates():
    beat = [L(784152, 0.000, 0.40, t, -5.0, d, fin=0.0005, fout=0.2) for t, d in ((1.46, 0), (1.74, 0), (2.02, -2))]
    return reverb(layer([
        L(480805, 5.200, 1.45, 0.000, -2.0, 4, fin=0.03, fout=0.3),             # a small group of men shouting, a little lower
        L(449915, 1.700, 1.50, 0.000, 0.0, -4, fin=0.05, fout=0.4),             # a crowd roaring
        L(57204, 0.050, 1.00, 0.050, -3.0, -4, fin=0.01, fout=0.3),             # men shouting "hey", lower
        L(416507, 0.000, 1.30, 1.350, -2.0, -2, fin=0.01, fout=0.3),            # two men shouting "hey" over and over
    ] + beat), rt60=0.5, wet_db=-12.0, seed=9)                                 # and the shields beaten in time


# --- the Hot Gates ambience: wind moaning through the cliffs, surf on the rocks below, distant war drums from the
# army beyond the pass in two passages, and twice a far-off horn (the take starts XF s before the loop, so the drums at
# 11 and 35 s and the horns at 24 and 48 s in it land where the old bed's did, at 6, 30, 19 and 43 s) ---
LEFT, RIGHT = 'pan=stereo|c0=c0|c1=0*c0', 'pan=stereo|c0=0*c0|c1=c1'  # a mono take into one ear only


def hotgatesloop():
    drums = []
    for t0, beats, per in ((11.0, 14, 0.62), (35.0, 18, 0.58)):
        for b in range(beats):
            sw = math.sin(math.pi * (b + 0.5) / beats)
            drums.append(Ls(257152, 0.000, 1.6, t0 + b * per, -6.0 if b % 2 else -4.0,
                            round(20 * math.log10(max(0.05, sw * (1.0 if b % 4 == 0 else 0.7))), 1) - 4,
                            fin=0.002, fout=0.6, fx='lowpass=f=400,adelay=0|10'))
    horns = []
    for t0, s, d in ((24.0, -12.0, 4), (48.0, -14.0, -1)):
        for dl, g in ((0.0, 0), (0.18, -7), (0.37, -10), (0.62, -15)):  # off the cliffs and back
            horns.append(Ls(392180, 0.100, 2.6, t0 + dl, s, d + g - 8, fin=0.6, fout=1.0, fx='lowpass=f=1100,adelay=0|15'))
    return layer2([
        Ls(438861, 1.500, LOOP + XF, 0.0, 0.0, 5, fin=0.01, fout=0.01, fx=LEFT),   # howling wind, moaning gusts (the mono take
        Ls(438861, 2.400, LOOP + XF, 0.0, 0.0, 5, fin=0.01, fout=0.01, fx=RIGHT),  # a second apart in each ear)
        Ls(683013, 8.000, LOOP + XF, 0.0, 0.0, 8, fin=0.01, fout=0.01, fx='lowpass=f=3000,' + LEFT),  # stormy winds on a steep coast
        Ls(683013, 14.000, LOOP + XF, 0.0, 0.0, 8, fin=0.01, fout=0.01, fx='lowpass=f=3000,' + RIGHT),
        Ls(376800, 12.000, LOOP + XF, 0.0, 0.0, 4, fin=0.01, fout=0.01,         # large waves crashing into large rocks
           fx="asetnsamples=n=1024,volume='1-0.45*exp(-pow((t-32.3)/1.3,2))':eval=frame"),  # (its one big breaker eased back)
    ] + drums + horns, post='acompressor=threshold=-32dB:ratio=3:attack=40:release=500:knee=6')  # the big breakers held in


# =============================== Audio pass, batch 6: the rest of the nemesis stages (Goth-Ham, the comics villains, the
# hero variants) and the bone quake's crack =============================================================================
# As batches 1–5: each replaces (or layers with) a synthesized file under the same name, on the old file's beats, and
# its level (RECIPES) sits halfway between the old file's 50 ms RMS peak and the level matching its momentary loudness.
# Each stage shares one kit: for Bunion, a massed stomp, a crash of debris, crunching toast, a hand sprayer's water,
# bottle glugs, a deflating balloon and an air release; for the Jokester, two real jack-in-the-boxes, a spring door stop,
# a party popper and a party horn, a joker-like laugh and real cartoon props (a wooden slide whistle, wind-up
# chattering teeth, a sad trombone); for the comics villains, boots, a deep evil laugh, water and steam, wet foley
# (washcloths, a sponge, a rubber stress ball, tape), a wounded man's scream and real cats; the hero variants reuse the earlier
# batches' thunder, fire, horns and raven, with a woman's shout and a trumpet's fanfare note.
LIGHT = 'acompressor=threshold=-8dB:ratio=2:attack=6:release=90:knee=4'  # a lighter master compressor (RECIPES), for the
# hits that the usual one (from -20 dB) would flatten: their attacks stay sharp, as the synth's were


def tempo(r):
    return 'atempo=%.4f' % r  # a layer sped up (or slowed) without changing its pitch


# --- Batpeel's Goth-Ham Rooftops · Bunion, the venom-pumped wrestler ---
def bunionenter():
    return layer([
        L(20185, 0.040, 0.70, 0.000, -10.0, 0, fin=0.001, fout=0.3, fx='lowpass=f=400'),  # a massed stomp, far lower: he lands
        L(703247, 0.020, 1.95, 0.000, -5.0, 9, fin=0.001, fout=0.3, fx=STONE + ',' + DAMP % (12, 0.12)),  # a crash of debris, lower
        L(816237, 0.020, 0.30, 0.010, -5.0, -4, fin=0.001, fout=0.1),           # a crunch of toast, lower: the crunch
        L(661242, 0.040, 0.70, 0.280, -6.0, -8, fin=0.02, fout=0.25, keep=False, fx='lowpass=f=1800'),  # a warrior's grunt, far lower
    ])


def bunionpump():
    return layer([
        L(361771, 0.100, 1.24, 0.000, -3.0, 0, fin=0.01, fout=0.2),             # a hand sprayer pumped, water bubbling, lower
        L(234782, 0.050, 0.55, 0.700, 0.0, 3, fin=0.25, fout=0.1),              # a steam hiss rising: the pressure
    ])


def bunionsurge():
    return layer([
        L(869002, 0.800, 1.15, 0.000, -8.0, 0, fin=0.05, fout=0.35, keep=False),  # caged lions roaring, far lower and slower
        L(763026, 2.900, 1.80, 0.000, -6.0, 4, fin=0.1, fout=0.4, fx='lowpass=f=1500'),  # a black bear's growl, lower
        L(19841, 4.700, 1.80, 0.050, -5.0, 2, fin=0.2, fout=0.4),               # a pot boiling hard, lower: the venom bubbling
    ], post=T0 + swell(1.50, 1.80, 0.35))


def bunionsmash():
    return layer([
        L(20185, 0.040, 0.80, 0.000, -10.0, 2, fin=0.001, fout=0.35, fx='lowpass=f=450'),  # a massed stomp, far lower
        L(703248, 0.020, 1.30, 0.000, -5.0, 10, fin=0.001, fout=0.6, fx=STONE + ',' + DAMP % (6, 0.2)),  # a crash of debris
        L(816237, 0.020, 0.35, 0.010, -4.0, -3, fin=0.001, fout=0.12),          # crispy toast crunched: the pizza
    ], post='lowpass=f=3500')


def buniontubehit():
    return layer([
        L(655040, 13.760, 0.40, 0.000, -3.0, 0, fin=0.001, fout=0.2, fx=DAMP % (12, 0.2)),  # a beach ball's thick rubber bounce, lower
        L(386432, 0.700, 0.40, 0.030, -3.0, 6, fin=0.005, fout=0.15),           # water sloshing in a glass bottle, lower
    ])


def buniondrain():
    return layer([
        L(553954, 0.080, 0.40, 0.330, -4.0, 0, fin=0.005, fout=0.1),            # a bottle glugging, lower
        L(553954, 0.580, 0.40, 0.700, -5.0, -3, fin=0.005, fout=0.15),
        L(553954, 1.150, 0.30, 0.040, -3.0, -10, fin=0.005, fout=0.1),
        L(82124, 0.020, 1.25, 0.000, 0.0, -9, fin=0.08, fout=0.5),             # a balloon deflating: the hiss and squeal
    ])


def buniongrab():
    return layer([
        L(734599, 0.280, 0.34, 0.000, -2.0, 0, fin=0.01, fout=0.1),             # a leather biker jacket creaking
        L(680135, 2.770, 0.46, 0.110, -5.0, 0, fin=0.03, fout=0.15, keep=False, fx='lowpass=f=2500'),  # a man grunting with effort,
                                                                                # lower and slower
    ])


def bunionstrain():
    return layer([
        L(590147, 0.280, 0.34, 0.000, -2.0, 0, fin=0.01, fout=0.06),            # creaking wood, a little lower
        L(753310, 0.120, 0.22, 0.060, -3.0, -8, fin=0.003, fout=0.06),          # a corn chip cracking: the crust
    ])


def bunionbreak():
    return layer([
        L(352198, 0.860, 0.90, 0.000, -4.0, 0, fin=0.001, fout=0.35, fx=DAMP % (8, 0.2)),  # a wooden fence panel snapped, lower
        L(178658, 0.020, 1.10, 0.020, -2.0, 7, fin=0.002, fout=0.3),            # a plank breaking, splinter by splinter
        L(816237, 0.020, 0.38, 0.000, -2.0, 0, fin=0.001, fout=0.1),            # crispy toast crunched: the crust
        L(753310, 0.030, 0.38, 0.300, -3.0, 2, fin=0.002, fout=0.1),            # a corn chip bitten
    ])


def bunionsaved():
    return layer([
        L(276600, 0.170, 0.40, 0.000, -4.0, 0, fin=0.001, fout=0.15),           # a gloved hand's thud, lower: the shove
        L(475131, 0.000, 0.55, 0.030, -5.0, -3, fin=0.03, fout=0.15),          # a super-heavy swoosh, lower: he's thrown back
        L(261296, 0.520, 0.60, 0.300, -3.0, -4, fin=0.002, fout=0.3),           # a body falling to the floor
    ])


def buniondeath():
    return layer([
        L(371094, 0.190, 0.80, 0.000, -5.0, -4, fin=0.001, fout=0.3),           # a large glass bottle shattering, lower: the tubes
        L(131933, 0.330, 1.40, 0.000, -2.0, -8, fin=0.002, fout=0.5),          # compressed air released: the venom bursting out
        L(495117, 0.010, 0.40, 0.050, -3.0, 1, fin=0.001, fout=0.15),           # a wet washcloth slapped into water: the splatter
        L(82123, 0.150, 1.20, 0.250, -2.0, 3, fin=0.05, fout=0.3),            # a balloon deflating: he goes down
        L(20185, 0.040, 0.80, 1.400, -10.0, -3, fin=0.001, fout=0.4, fx='lowpass=f=450'),  # a massed stomp, far lower: the thud
        L(703248, 0.020, 1.10, 1.400, -6.0, 6, fin=0.001, fout=0.3, fx=STONE + ',' + DAMP % (8, 0.15)),  # a crash of debris, lower
    ])


# --- Batpeel's Goth-Ham Rooftops · the Jokester ---
def jokesterenter():
    return layer([
        L(811042, 0.090, 0.55, 0.000, 0.0, 0, fin=0.002, fout=0.2),             # a real jack-in-the-box popping open
        L(81458, 0.060, 1.05, 0.030, 0.0, -3, fin=0.002, fout=0.3),            # a spring door stop twanged: the BOING
        L(26349, 0.040, 0.55, 0.200, 0.0, -4, fin=0.002, fout=0.2),            # a party popper: the confetti
    ])


def jokesterlaugh():
    return layer([L(427574, 0.050, 1.18, 0.000, 1.0, 0, fin=0.01, fout=0.2)])  # a joker-like laugh, a little higher


def jokestertoss():
    return layer([
        L(346373, 0.060, 0.26, 0.010, 0.0, 0, fin=0.005, fout=0.1),             # a metal stick whipped through the air
        L(30154, 0.000, 0.60, 0.050, 0.0, -2, fin=0.003, fout=0.2),            # a small jingle bell shaken: the ribbon bells
    ])


def jokestertick():
    ticks = [L(372515, s, 0.16, 0.2 * i, 0.0, 0, fin=0.001, fout=0.08) for i, s in
             enumerate((1.080, 1.330, 1.555, 1.800, 2.025, 2.270))]
    return layer(ticks, post='highpass=f=300,' + PEAKS)                        # a kitchen timer ticking, tick, tock


def jokesterboom():
    return layer([
        L(587886, 0.000, 1.25, 0.000, 0.0, 0, fin=0.001, fout=0.5, fx=DAMP % (9, 0.2)),  # a big blast (a firecracker, pitched down)
        L(26349, 0.040, 0.55, 0.050, -2.0, -6, fin=0.002, fout=0.2),           # a party popper: the confetti
        L(484267, 0.150, 0.80, 0.350, -2.0, -9, fin=0.02, fout=0.4),            # a party horn blown, a little lower: the tail
    ])


def jokesterdefuse():
    return layer([
        L('old:sfx_jokester_defuse', 0.0, 0.66, 0.0, 0.0, 0, fin=0.002, fout=0.1),
        L(800073, 0.000, 0.27, 0.000, 0.0, 0, fin=0.001, fout=0.05),            # real scissors: snip, snip
    ])


def jokestergift():
    return layer([
        L('old:sfx_jokester_gift', 0.0, 0.95, 0.0, 0.0, 0, fin=0.002, fout=0.1),
        L(484267, 0.150, 0.55, 0.400, 0.0, -4, fin=0.02, fout=0.2),            # a real party horn blown
    ])


def jokestergas():
    return layer([
        L(208111, 0.180, 0.17, 0.000, 0.0, 0, fin=0.002, fout=0.08),            # two pillows touched together: the pfft
        L(615667, 1.400, 0.90, 0.030, 0.0, 12, fin=0.06, fout=0.4),             # gas leaking: the hiss
    ])


def jokesterclear():
    return layer([
        L(381853, 0.450, 0.90, 0.000, 0.0, 5, fin=0.08, fout=0.3),              # a short gust of wind
        L(726312, 0.050, 0.90, 0.000, 0.0, 0, fin=0.1, fout=0.3),              # wind blown across a microphone's windscreen
    ], post=T0 + 'highpass=f=450,' + swell(0.25, 0.85, 0.55) + ',acompressor=threshold=-30dB:ratio=4:attack=20:release=150:knee=6')


def jokestergiggle():
    return layer([
        L(235165, 0.060, 0.40, 0.000, 4.0, 0, fin=0.01, fout=0.08),            # a woman's giggle, higher: a little foot's
        L(235165, 0.390, 0.30, 0.130, 6.0, -3, fin=0.01, fout=0.08),           # and again, higher still: another's
        L(764275, 0.650, 0.42, 0.000, 5.0, 5, fin=0.03, fout=0.1),            # a crowd giggling, higher: the others
    ], post=PEAKS)


def jokesterjack():
    return layer([L(811043, 0.000, 2.60, 0.000, 0.0, 0, fin=0.01, fout=0.3, fx=tempo(1.53))])  # a jack-in-the-box cranked, playing
                                                                                # "Pop Goes the Weasel", sped up


def jokesterspring():
    return layer([
        L(712594, 6.020, 0.50, 0.000, 0.0, 0, fin=0.002, fout=0.15),            # an old jack-in-the-box: the jack pops out
        L(81458, 0.060, 0.80, 0.010, 0.0, 3, fin=0.002, fout=0.3),             # a spring door stop twanged: the BOING
    ])


def jokesterpie():
    return layer([
        L(475131, 0.000, 0.50, 0.040, 3.0, 0, fin=0.12, fout=0.15),             # a super-heavy swoosh, higher: the pie flies
        L(346373, 0.030, 0.30, 0.170, -2.0, -4, fin=0.01, fout=0.1),            # a stick whipped through the air
    ])


def jokestersplat():
    return layer([
        L(495117, 0.010, 0.45, 0.000, -2.0, 0, fin=0.001, fout=0.15, fx=DAMP % (20, 0.12)),  # a wet cloth slapped into water, lower
        L(719129, 0.030, 0.55, 0.010, -2.0, -2, fin=0.001, fout=0.2, fx=DAMP % (20, 0.12)),  # a soaked towel against a wall
        L(433829, 0.380, 0.84, 0.080, -3.0, 0, fin=0.01, fout=0.15),           # a rubber stress ball squished: the cream
    ])


def jokesterteeth():
    return layer([
        L(383181, 0.020, 0.53, 0.000, 0.0, 0, fin=0.005, fout=0.03),  # a wind-up chattering teeth toy
        L(383181, 0.020, 0.53, 0.53, 0.0, -1, fin=0.005, fout=0.03),
        L(383181, 0.020, 0.30, 1.06, 0.0, -2, fin=0.005, fout=0.1),
    ], post=PEAKS)


def jokesterweight():
    return layer([L(422110, 0.050, 2.40, 0.000, 0.0, 0, fin=0.03, fout=0.2, fx=tempo(1.34))],  # a wooden slide whistle falling
                 post=T0 + swell(1.60, 1.79, 0.3))


def jokesterthud():
    return layer([
        L(850718, 4.890, 0.60, 0.000, -3.0, 9, fin=0.001, fout=0.3),            # a 20 lb weight dropped on concrete, lower
        L(853153, 0.040, 1.45, 0.000, -12.0, -7, fin=0.002, fout=0.4, fx='lowpass=f=700'),  # a big gong, an octave lower: the ring
        L(20185, 0.040, 0.90, 0.000, -10.0, 0, fin=0.001, fout=0.4, fx='lowpass=f=400'),  # a massed stomp, far lower: the thud
    ])


def jokesterbang():
    return layer([
        L(392624, 0.120, 0.30, 0.000, 0.0, 0, fin=0.001, fout=0.1),             # a champagne cork popping: BANG
        L(244976, 0.000, 0.70, 0.030, 0.0, -2, fin=0.002, fout=0.3),            # cloth flapped: the flag snaps out
    ], post=PEAKS)


def jokesterwindow():
    return layer([
        L(175409, 0.220, 0.38, 0.000, 0.0, 0, fin=0.01, fout=0.06),             # a trombone's sad "wah...
        L(175409, 1.060, 0.38, 0.390, 0.0, 0, fin=0.01, fout=0.06),             # ...wah...
        L(175409, 1.980, 0.38, 0.780, 0.0, 0, fin=0.01, fout=0.06),             # ...wah...
        L(175409, 2.840, 1.05, 1.170, 0.0, 0, fin=0.02, fout=0.3),              # ...wahhh"
    ])


def jokesterdeath():
    return layer([
        L(427573, 0.520, 1.35, 0.000, 0.0, 0, fin=0.01, fout=0.15, fx="asetnsamples=n=64,volume='1-0.55*t/1.35':eval=frame"),
        # (a joker-like laugh, fading)
        L(587886, 0.000, 1.00, 1.350, 0.0, 2, fin=0.001, fout=0.5, fx=DECAY % 3),  # a big blast
        L(26349, 0.040, 0.55, 1.370, 0.0, 1, fin=0.002, fout=0.2),             # a party popper: the confetti
        L(30154, 0.000, 0.85, 1.450, 0.0, -2, fin=0.003, fout=0.3),            # a small jingle bell shaken
    ])


# --- the Dark Kneader's darkness falls ---
def darkfalls():
    return layer([
        L(160797, 0.000, 2.10, 0.000, -10.0, 0, fin=0.002, fout=0.4, fx='lowpass=f=600'),  # dynamite going off in a valley, far
        # lower: the boom, and its echo off the mountains for the tail
        L(349225, 0.080, 1.40, 0.300, -5.0, -4, fin=0.05, fout=0.4),           # an umbrella flapped like bat wings, lower
        L(475131, 0.000, 0.55, 0.150, -6.0, 3, fin=0.05, fout=0.2, keep=False),  # a super-heavy swoosh, far lower: the wing
    ])


# --- the comics villains · the Red Sole ---
def redsoleenter():
    steps = [L(558856, s, 0.22, t, -2.0, d, fin=0.002, fout=0.12) for s, t, d in
             ((0.180, 0.00, 7), (0.860, 0.24, 8), (1.540, 0.48, 7), (2.220, 0.72, 8))]  # boots stomping, a little lower
    return layer(steps + [
        L(617440, 0.090, 0.50, 0.950, -3.0, 8, fin=0.001, fout=0.2),            # a foot stomped on the floor, lower: the halt
        L(20185, 0.040, 0.60, 0.950, -10.0, -6, fin=0.001, fout=0.3, fx='lowpass=f=400'),  # a massed stomp, far lower, under it
        L(362330, 0.330, 1.40, 1.050, -2.0, -2, fin=0.02, fout=0.3),           # a deep evil laugh, a little lower
    ])


def redsolelaugh():
    return layer([L(362330, 0.580, 1.42, 0.000, -2.0, 0, fin=0.02, fout=0.25)])  # a deep evil laugh, a little lower


def redsoleturret():
    return layer([
        L(180480, 0.050, 0.80, 0.000, -2.0, 17, fin=0.01, fout=0.2),            # an office chair's hydraulic piston, lower
        L(520071, 0.380, 0.55, 0.000, 0.0, 0, fin=0.005, fout=0.25),            # a steam trap's short burst: the hiss
        L(406197, 0.290, 0.45, 0.450, -3.0, 0, fin=0.001, fout=0.2),            # a big metal door slammed, lower: the clunk
    ])


def redsolespray():
    return layer([
        L(811445, 0.200, 0.90, 0.000, 0.0, 0, fin=0.01, fout=0.25),             # a water hose's jet
        L(637123, 0.200, 0.90, 0.000, 0.0, -3, fin=0.01, fout=0.25),            # a fire hydrant flushing into the street
        L(520071, 0.330, 0.30, 0.000, 0.0, -6, fin=0.005, fout=0.15),           # a steam trap's burst: the pressure
    ])


def redsolecap():
    return layer([
        L(406555, 0.000, 0.55, 0.000, -2.0, 0, fin=0.0005, fout=0.2),           # a metal pipe struck: the clang
        L(337845, 0.150, 0.45, 0.000, -4.0, -6, fin=0.0005, fout=0.2),          # a metal shed door struck, lower
        L(234782, 0.600, 0.60, 0.030, 0.0, -4, fin=0.005, fout=0.4),            # a steam hiss, dying away
    ], post=T0 + "asetnsamples=n=64,volume='max(0.08,1-t/0.6)':eval=frame")


def redsolestomp():
    return layer([
        L(617440, 0.100, 0.55, 0.000, -4.0, 0, fin=0.001, fout=0.25),           # a foot stomped on the floor, lower
        L(558856, 0.000, 0.25, 0.000, -4.0, 1, fin=0.001, fout=0.1),             # a boot stomped: the heel
        L(20185, 0.040, 0.60, 0.000, -10.0, -2, fin=0.001, fout=0.3, fx='lowpass=f=400'),  # a massed stomp, far lower: the weight
    ])


def redsoledeath():
    whoop = [L(536727, 0.850, 0.80, t, 0.0, 6, fin=0.05, fout=0.1, fx=tempo(1.75)) for t in (0.25, 0.75, 1.25)]
    return layer([
        L('old:sfx_redsole_death', 0.0, 2.63, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(108641, 0.100, 1.25, 1.380, -3.0, -6, fin=0.001, fout=0.5),           # an explosion close by, debris flying, lower
    ] + whoop)                                                                  # a tornado siren winding up, three times


# --- the comics villains · Venomnom ---
def venomnomenter():
    return layer([
        L(495117, 0.010, 0.45, 0.000, -4.0, 0, fin=0.001, fout=0.2),            # a wet cloth slapped down, lower: the goo lands
        L(547446, 0.080, 0.45, 0.020, -3.0, 6, fin=0.005, fout=0.2),            # a sodden sponge squelched
        L(763026, 2.900, 1.80, 0.300, -6.0, 0, fin=0.1, fout=0.5, fx='lowpass=f=1800'),  # a black bear's growl, lower
        L(869003, 0.900, 1.30, 0.320, -9.0, -6, fin=0.1, fout=0.5, keep=False),  # caged lions roaring, far lower: the second voice
    ])


def venomnomgrowl():
    return layer([
        L(763026, 2.950, 1.30, 0.000, -5.0, 0, fin=0.06, fout=0.3, fx='lowpass=f=2000'),  # a black bear's growl, lower
        L(869003, 1.000, 0.95, 0.000, -8.0, -5, fin=0.06, fout=0.3, keep=False),  # caged lions, far lower: the second voice
        L(547446, 3.500, 1.20, 0.050, -4.0, -6, fin=0.05, fout=0.3),            # a sodden sponge squelched: wet
    ], post='acompressor=threshold=-24dB:ratio=3:attack=10:release=120:knee=6')


def venomnomtongue():
    return layer([
        L(475131, 0.000, 0.45, 0.000, 2.0, 0, fin=0.15, fout=0.1),              # a super-heavy swoosh, higher: the tongue lashes out
        L(346373, 0.030, 0.30, 0.120, -3.0, -4, fin=0.01, fout=0.08),           # a metal stick whipped through the air, lower
        L(93100, 0.180, 0.35, 0.240, -4.0, -6, fin=0.002, fout=0.15, fx='lowpass=f=3500'),  # a whip cracked, lower and damped
        L(495118, 0.010, 0.40, 0.300, -2.0, -3, fin=0.001, fout=0.15),          # a wet splat: the tongue lands
    ])


def venomnomsnatch():
    return layer([
        L(515619, 0.010, 0.40, 0.000, -2.0, 0, fin=0.001, fout=0.15),           # wet paper towels squished
        L(531755, 0.150, 0.40, 0.020, -5.0, 0, fin=0.005, fout=0.12, keep=False),  # a hard swallow, lower and slower
        L(829847, 0.240, 0.40, 0.400, -5.0, -6, fin=0.005, fout=0.15),          # a gulp, lower
        L(433836, 2.300, 0.60, 0.300, -4.0, 2, fin=0.01, fout=0.3),             # a rubber stress ball squished: the slime going down
    ])


def venomnomcut():
    return layer([
        L(539163, 0.150, 0.30, 0.000, -2.0, 0, fin=0.001, fout=0.1),            # a slap
        L(163280, 0.180, 0.40, 0.040, -5.0, -2, fin=0.005, fout=0.2),           # a Labrador's yelp, lower...
        L(163280, 0.180, 0.26, 0.040, -10.0, -5, fin=0.005, fout=0.2, keep=False),  # ...and far lower and slower: the double voice
        L(547206, 0.020, 0.25, 0.050, -6.0, -8, fin=0.005, fout=0.08),          # a man's pained grunt, far lower
    ])


def venomnomgoo():
    return layer([
        L(618541, 1.130, 0.95, 0.000, -6.0, 0, fin=0.03, fout=0.2),             # tape peeled off, far lower: the goo stretching
        L(792463, 0.080, 0.50, 0.150, -5.0, -4, fin=0.02, fout=0.15),           # rubber stretched, lower
        L(433836, 2.300, 0.70, 0.250, -3.0, -4, fin=0.01, fout=0.2),            # a rubber stress ball squished: the squelch
    ])


def venomnomdrain():
    return layer([
        L(529295, 0.500, 0.90, 0.000, -3.0, 0, fin=0.05, fout=0.15),            # a straw slurped, lower
        L(568036, 0.100, 0.80, 0.050, -5.0, -6, fin=0.05, fout=0.15),           # coffee slurped, lower
    ])


def venomnomshriek():
    return layer([
        L(221544, 0.380, 1.20, 0.000, 2.0, 0, fin=0.02, fout=0.25),             # a wounded man screaming, a little higher...
        L(221544, 0.380, 1.20, 0.000, -6.0, -4, fin=0.02, fout=0.25),           # ...and lower: the double voice
        L(788212, 0.250, 1.20, 0.000, 0.0, -8, fin=0.03, fout=0.25),            # an inhaled screech (a voice): the monster in it
    ], post='acompressor=threshold=-24dB:ratio=3:attack=10:release=120:knee=6')


def venomnomsplit():
    return layer([
        L(618541, 1.130, 0.50, 0.000, -4.0, 0, fin=0.02, fout=0.05),            # tape peeled off, lower: the goo stretches...
        L(618541, 2.880, 0.35, 0.420, -4.0, 2, fin=0.002, fout=0.15),           # ...and rips
        L(495117, 0.010, 0.45, 0.450, -3.0, -2, fin=0.001, fout=0.2),           # a wet cloth slapped: it tears apart
        L(433823, 3.800, 0.50, 0.500, -3.0, 0, fin=0.01, fout=0.1),             # a rubber stress ball squished
    ])


def venomnomdeath():
    return layer([
        L(221544, 0.380, 1.20, 0.000, 2.0, 0, fin=0.02, fout=0.3),              # a wounded man screaming, a little higher...
        L(221544, 0.380, 1.20, 0.000, -6.0, -4, fin=0.02, fout=0.3),            # ...and lower: the shriek
        L(862443, 0.300, 2.00, 0.800, -3.0, 0, fin=0.2, fout=0.3),              # boiling water spilling, sizzling: he melts
        L(495117, 0.010, 0.45, 1.000, -4.0, -2, fin=0.001, fout=0.2),           # a wet cloth slapped: the splatter
        L(547446, 3.500, 1.20, 1.050, -3.0, -4, fin=0.01, fout=0.4),            # a sodden sponge squelched
    ])


# --- the comics villains · the Cheetoe ---
def cheetoeenter():
    return layer([
        L(20185, 0.040, 0.50, 0.000, -8.0, -4, fin=0.001, fout=0.2, fx='lowpass=f=600'),  # a massed stomp, lower: she lands
        L(263115, 1.450, 1.20, 0.120, -2.0, 0, fin=0.03, fout=0.4),            # a tiger's roar, a little lower
    ])


def cheetoedash():
    return layer([
        L(475131, 0.000, 0.55, 0.000, 5.0, 0, fin=0.05, fout=0.12, keep=False),  # a super-heavy swoosh, higher and faster
        L(575836, 0.330, 0.30, 0.040, 2.0, -6, fin=0.03, fout=0.12),            # a fast swoosh, higher
        L(396013, 0.000, 0.40, 0.000, 0.0, 6, fin=0.02, fout=0.15),            # grass rustling: her feet
    ], post='acompressor=threshold=-26dB:ratio=4:attack=5:release=80:knee=6')


def cheetoecrouch():
    return layer([
        L(146968, 0.100, 1.10, 0.000, -9.0, 6, fin=0.05, fout=0.3),             # a cat growling, far lower
        L(869003, 1.700, 0.85, 0.000, -6.0, -6, fin=0.1, fout=0.3, keep=False, fx='lowpass=f=1200'),  # a lion's rumble, lower
    ], post='acompressor=threshold=-24dB:ratio=3:attack=10:release=120:knee=6')


def cheetoepounce():
    return layer([
        L(276600, 0.170, 0.35, 0.000, -4.0, 0, fin=0.001, fout=0.12),           # a gloved hand's thud, lower: she lands
        L(20185, 0.040, 0.45, 0.000, -8.0, -4, fin=0.001, fout=0.2, fx='lowpass=f=600'),  # a massed stomp, lower
        L(530959, 0.720, 0.50, 0.030, -4.0, 0, fin=0.01, fout=0.15),            # an angry cat's snarl, lower
    ])


def cheetoeslash():
    return layer([
        L(475131, 0.000, 0.55, 0.000, 7.0, 0, fin=0.05, fout=0.12, keep=False),  # a super-heavy swoosh, higher and faster: the swipe
        L(830466, 0.330, 0.25, 0.140, 0.0, 8, fin=0.003, fout=0.1),             # claws on wood
    ], post='acompressor=threshold=-26dB:ratio=4:attack=5:release=80:knee=6')


def cheetoescratch():
    return layer([
        L(830466, 0.750, 0.25, 0.000, 0.0, 14, fin=0.003, fout=0.08),           # clawing at wood, twice: the rake
        L(830466, 3.950, 0.25, 0.050, 0.0, 13, fin=0.003, fout=0.08),
        L(498842, 4.100, 0.38, 0.020, 0.0, 20, fin=0.003, fout=0.15),           # a cat scratching a wooden floor
    ], post='highpass=f=1200')


def cheetoehiss():
    return layer([
        L(146963, 0.400, 0.80, 0.000, -2.0, 0, fin=0.02, fout=0.25),            # a cat hissing, a little lower
        L(146960, 1.000, 0.80, 0.000, -2.0, -4, fin=0.02, fout=0.25),
    ])


def cheetoerustle():
    return layer([
        L(178615, 0.050, 0.76, 0.000, 0.0, 0, fin=0.01, fout=0.2),              # a bush shaken
        L(396013, 0.000, 0.60, 0.150, 0.0, -2, fin=0.02, fout=0.2),            # grass rustling
    ])


def cheetoeflush():
    return layer([
        L(178615, 0.050, 0.45, 0.000, 0.0, 8, fin=0.005, fout=0.15),            # a bush shaken hard: the leaves burst
        L(682079, 0.020, 0.70, 0.060, 0.0, 0, fin=0.01, fout=0.2),              # a cat yowling
    ], post='acompressor=threshold=-24dB:ratio=3:attack=10:release=120:knee=6')


def cheetoedeath():
    return layer([
        L(682078, 0.100, 0.75, 0.000, -3.0, 0, fin=0.02, fout=0.3, keep=False),  # a cat yowling, lower and slower, falling
        L(261296, 0.520, 0.62, 1.000, -3.0, 0, fin=0.002, fout=0.2),            # a body falling to the floor: she collapses
        L(178615, 0.050, 0.62, 1.000, 0.0, 6, fin=0.01, fout=0.15),             # a bush shaken: the leaves
    ])


# --- the hero variants (the upgraded hero peels on their nemesis stages) ---
def ghostsparta():
    return layer([
        L(695376, 0.200, 0.76, 0.000, -5.0, 0, fin=0.02, fout=0.15, keep=False, fx='acrusher=bits=9:mix=0.25'),  # a man's battle cry,
        L(695376, 0.200, 0.76, 0.000, -12.0, 3, fin=0.02, fout=0.15, keep=False, fx='acrusher=bits=9:mix=0.25'),  # lower and
        # slower, and far lower under it: a deeper, distorted shout
        L(244926, 0.150, 2.40, 0.050, -3.0, -4, fin=0.02, fout=0.4),            # diesel thrown on a fire, lower: the fire
        L(20185, 0.040, 0.60, 0.000, -10.0, -6, fin=0.001, fout=0.3, fx='lowpass=f=400'),  # a massed stomp, far lower: the thump
    ])


def firetrail():
    return layer([L(637533, 0.020, 0.50, 0.000, -2.0, 0, fin=0.03, fout=0.2)])  # a barbecue's flame bursting alight, lower


def heroendgame():
    stab = [L(413203, 2.270, 0.95, 0.400, s, d, fin=0.01, fout=0.4) for s, d in ((-3.0, 0), (1.0, -1), (4.0, 1))]
    return layer([L('old:sfx_hero_endgame', 0.0, 1.46, 0.0, 0.0, 0, fin=0.002, fout=0.2)] + stab)  # a real trumpet's note, three
    # times over as a G major chord: the brass stab


def unleashed():
    return layer([
        L(188767, 0.150, 1.00, 0.000, -2.0, 0, fin=0.002, fout=0.4),            # a crack of thunder, a little lower
        L(505113, 0.700, 1.90, 0.050, 0.0, 0, fin=0.05, fout=0.6),             # a close clap of thunder rolling
        L(188767, 0.150, 1.00, 0.800, -4.0, -3, fin=0.002, fout=0.4),           # another crack, lower
        L(38244, 0.000, 1.80, 0.800, -2.0, -6, fin=0.1, fout=0.6),             # thunder rolling on, a little lower
    ])


def ascended():
    caws = [L(827424, s, 0.24, t, -2.0, d, fin=0.005, fout=0.08) for s, t, d in ((1.820, 0.90, 0), (3.420, 1.18, -1), (5.150, 1.46, 0))]
    return layer([
        L(392180, 0.080, 1.40, 0.000, -12.0, 0, fin=0.06, fout=0.3),           # a battle horn blown, an octave lower
        L(479998, 0.150, 1.40, 0.000, -10.0, 0, fin=0.08, fout=0.3),           # a cow horn blown, far lower, under it
    ] + caws)                                                                  # and a raven cawing three times, a little lower


def unbound():
    return layer([
        L('old:sfx_hero_unbound', 0.0, 1.87, 0.0, 0.0, 0, fin=0.002, fout=0.3),
        L(188767, 0.150, 1.60, 0.200, -2.0, -2, fin=0.002, fout=0.5),           # a real crack of thunder, a little lower
    ])


def tendril():
    return layer([
        L(346373, 0.030, 0.30, 0.000, 0.0, 0, fin=0.01, fout=0.1),              # a metal stick whipped through the air: it lashes out
        L(618541, 2.880, 0.35, 0.200, -3.0, -2, fin=0.005, fout=0.12),          # tape peeled off, lower: it sticks
        L(433836, 2.300, 0.40, 0.200, -2.0, 0, fin=0.005, fout=0.15),           # a rubber stress ball squished: the squelch
        L(547446, 3.520, 0.40, 0.180, -2.0, -2, fin=0.01, fout=0.15),           # a sodden sponge squelched
    ], post='acompressor=threshold=-26dB:ratio=4:attack=5:release=80:knee=6')


def amazon():
    return layer([
        L('old:sfx_hero_amazon', 0.0, 1.30, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(93100, 0.180, 0.35, 0.230, 0.0, -6, fin=0.002, fout=0.15),           # a real whip crack: the golden lasso
        L(509881, 0.300, 0.90, 0.400, 0.0, -2, fin=0.01, fout=0.25),           # a woman shouting: the war cry
    ])


# --- the Goth-Ham Rooftops ambience: heavy rain on the roof, a gutter running and dripping, wind, two distant thunders and
# once a siren far across the city (the take starts XF s before the loop, so the thunders at 17.5 and 40 s and the siren
# at 27 s in it land where the old bed's did, at 12.5, 35 and 22 s; a thunder's loudest moment comes about a second in) ---
def gothamloop():
    return layer2([
        Ls(527499, 3.000, LOOP + XF, 0.0, 0.0, 4, fin=0.01, fout=0.01),          # heavy rain on a large plastic shed roof
        Ls(652260, 20.000, LOOP + XF, 0.0, 0.0, 7, fin=0.01, fout=0.01, fx='highpass=f=150'),  # rain running in a gutter
        Ls(454092, 61.000, LOOP + XF, 0.0, 0.0, 20, fin=0.01, fout=0.01, fx='lowpass=f=1500'),  # strong gusts of wind, far off
        Ls(581124, 0.300, 7.80, 17.5, -2.0, 16, fin=0.3, fout=2.5, fx='lowpass=f=1000'),  # distant thunder rolling, a little lower
        Ls(319565, 39.000, 7.00, 39.6, -2.0, 4, fin=0.3, fout=2.5, fx='lowpass=f=1000'),  # a distant thunderstorm, a little lower
        Ls(451068, 4.000, 3.60, 27.0, 0.0, 3, fin=0.8, fout=1.2, fx='lowpass=f=3500'),  # an ambulance's siren far off, echoing
    ], post='acompressor=threshold=-30dB:ratio=2.5:attack=40:release=500:knee=6')


# =============================== Audio pass, batch 7: the god peels' charged moves ===================================
# As batches 1–6: each replaces (or layers with) a synthesized file under the same name, on the old file's beats, and
# its level (RECIPES) sits halfway between the old file's 50 ms RMS peak and the level matching its momentary loudness.
# Freesound's API had no requests left for the day, so every source here is one an earlier batch fetched (and read the
# description of): thunder, a trumpet, waves, shields and metal, anvils, fire, horses, horns, real birds, a lyre, a harp,
# men's war cries, a crowd, wind, ice, rock and voices. The Kratos Peel's fire loop is made by loop_master() (LOOPS).

# --- Greek gods ---
def herozeus():
    return layer([
        L(188767, 0.170, 1.40, 0.000, -2.0, 0, fin=0.002, fout=0.5),            # a real crack of thunder, a little lower
        L(672776, 0.380, 1.55, 0.060, -3.0, -3, fin=0.08, fout=0.6),            # a clap of thunder rolling on, lower
        L(38244, 1.560, 1.05, 0.480, -2.0, -4, fin=0.002, fout=0.5),            # and a second crack, a little lower
    ], post='lowpass=f=4500')


def decree():
    return layer([
        L('old:sfx_hero_decree', 0.0, 1.23, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(413203, 2.000, 0.24, 0.000, 2.0, 14, fin=0.01, fout=0.06),            # a real trumpet's fanfare: its F, up to a G,
        L(413203, 2.250, 0.45, 0.330, 2.0, 4, fin=0.01, fout=0.15),             # then its top B flat, up to a C,
        L(413203, 0.250, 0.62, 0.360, 2.0, 14, fin=0.03, fout=0.2),             # over its low B flat, up to a C, held
    ])


def earthshaker():
    return layer([
        L('old:sfx_hero_earthshaker', 0.0, 1.61, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(784152, 0.000, 0.80, 0.000, -5.0, 1, fin=0.001, fout=0.3),            # a thick metal plate struck, lower: the trident
        L(376799, 0.450, 1.45, 0.120, -2.0, -4, fin=0.2, fout=0.5),             # large waves crashing into rocks, a little lower
    ])


def harvest():
    return layer([
        L('old:sfx_hero_harvest', 0.0, 1.16, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(178615, 0.050, 1.05, 0.000, -2.0, 25, fin=0.15, fout=0.4),            # a bush (bamboo) shaken, a little lower
        L(396013, 0.000, 0.55, 0.150, -2.0, 21, fin=0.05, fout=0.2),            # and grass rustling
    ])


def aegis():
    return layer([
        L('old:sfx_hero_aegis', 0.0, 1.44, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(319590, 0.070, 0.90, 0.000, -3.0, -9, fin=0.002, fout=0.4),           # a shield bashed, lower
        L(337845, 0.080, 1.35, 0.000, -5.0, 2, fin=0.002, fout=0.6),            # a metal shed door struck, ringing, lower
    ])


def chariot():
    return layer([
        L('old:sfx_hero_chariot', 0.0, 1.60, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(321952, 0.150, 1.60, 0.000, 0.0, 15, fin=0.02, fout=0.4, fx='highpass=f=80'),  # a horse galloping in towards the mic
        L(244926, 0.150, 1.55, 0.000, -2.0, -8, fin=0.1, fout=0.4),             # diesel thrown on a fire, a little lower
    ])


def warcry():
    return layer([
        L(392180, 0.050, 1.30, 0.000, -7.0, 6, fin=0.01, fout=0.4),             # a battle horn blown, lower,
        L(392180, 0.050, 1.30, 0.010, -12.0, 1, fin=0.01, fout=0.4),            # and lower still under it
        L(440035, 0.600, 1.05, 0.300, -2.0, -5, fin=0.02, fout=0.3),            # a man's war cry, "YEAH!", a little lower
        L(480805, 0.200, 1.05, 0.320, 0.0, 9, fin=0.02, fout=0.3),              # and a small group of men shouting
    ])


def charm():
    return layer([
        L(594961, 0.450, 1.25, 0.000, 0.0, 0, fin=0.01, fout=0.45, fx='highpass=f=250'),  # a harp glissando
        L(30158, 0.000, 0.45, 0.520, 7.0, 2, fin=0.005, fout=0.2),              # a small bell shaken, higher: the sparkle
    ])


def forge():
    return layer([
        L(850718, 0.040, 0.60, 0.000, -5.0, 20, fin=0.001, fout=0.3, fx='lowpass=f=3000'),  # a 20 lb weight dropped on concrete,
        # lower: the anvil lands
        L(386105, 0.000, 1.15, 0.120, -2.0, 0, fin=0.0005, fout=0.35, fx='lowpass=f=4000'),  # an anvil hammered on its back, ringing
        L(386111, 0.000, 0.80, 0.400, 0.0, -6, fin=0.0005, fout=0.3, fx='lowpass=f=5000'),  # and a hammer on steel on an anvil
    ])


def spark():
    return layer([
        L('old:sfx_hero_spark', 0.0, 0.35, 0.0, 0.0, 0, fin=0.002, fout=0.08),
        L(386125, 0.000, 0.14, 0.000, 2.0, -6, fin=0.0005, fout=0.08),          # a hot hit on an anvil, a little higher
    ])


def messenger():
    w = 'highpass=f=400'
    return layer([
        L(153277, 0.200, 0.85, 0.000, 2.0, 0, fin=0.02, fout=0.25, fx=w),       # a pigeon's wingbeats, a little higher
        L(651753, 1.000, 0.85, 0.020, 2.0, 18, fin=0.05, fout=0.25, fx=w),      # satin cloth flapped like big wings, higher (foley)
        L(684459, 0.750, 0.45, 0.420, 2.0, 24, fin=0.01, fout=0.15, fx='highpass=f=300'),  # and a whoosh, something thrown
    ], post='acompressor=threshold=-26dB:ratio=4:attack=5:release=80:knee=6')


def revel():
    tune = [lyre('E4', 0.40, 0.40, -2, 3.0), lyre('F#4', 0.54, 0.40, -2, 3.0), lyre('A4', 0.68, 0.40, -2, 3.0),
            lyre('F#4', 0.82, 0.40, -2, 3.0), lyre('E4', 0.96, 0.40, -2, 3.0), lyre('E4', 1.10, 0.30, -2, 0.0)]
    return layer([
        L(484267, 0.080, 0.55, 0.000, 0.0, 0, fin=0.005, fout=0.12, fx=DECAY % 4),            # a party horn blown
        L(449915, 0.800, 1.20, 0.150, 0.0, -12, fin=0.1, fout=0.4),             # a crowd cheering at a gig
    ] + tune)                                                                  # and a tune on the iron-age lyre, a little higher


def hearth():
    return layer([
        L('old:sfx_hero_hearth', 0.0, 1.50, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(382616, 9.250, 1.50, 0.000, 0.0, 10, fin=0.05, fout=0.4),             # a fire crackling in a fireplace
    ])


def underworld():
    return layer([
        L(765844, 0.020, 0.40, 0.000, -6.0, 8, fin=0.001, fout=0.2, fx=STONE),  # a rock smashed, lower: the ground cracks
        L(765844, 1.020, 0.35, 0.300, -8.0, 6, fin=0.001, fout=0.2, fx=STONE),  # and again, lower still
        L(760672, 1.000, 1.50, 0.050, -5.0, -4, fin=0.05, fout=0.5),            # heavy stone grinding, lower: it splits open
        L(457449, 0.100, 1.40, 0.100, -10.0, -2, fin=0.1, fout=0.4),            # a man's long groan, far lower
        L(643766, 0.100, 1.45, 0.150, -7.0, 1, fin=0.1, fout=0.4),              # and a monster's moan, far lower: the underworld
    ])


def spring():
    ch = [(2.190, 2.0, 0), (2.500, 3.0, -4), (2.790, 1.0, -4), (3.110, 3.0, -9), (3.400, 2.0, -6)]
    return layer([L(164483, s, 0.20, 0.13 * i, p, d, fin=0.005, fout=0.05, fx='highpass=f=1200') for i, (s, p, d) in enumerate(ch)] + [
        L(744100, 0.150, 0.32, 0.650, 0.0, -4, fin=0.005, fout=0.06),           # a baby robin's chirps
        L(577768, 0.020, 0.16, 0.800, 0.0, -6, fin=0.003, fout=0.05),           # a lovebird's chirp
        L(594961, 0.400, 0.90, 0.200, 12.0, -6, fin=0.02, fout=0.4, fx='highpass=f=500'),  # a harp's glissando, an octave up: the bloom
    ])                                                                          # (a bird's song cut into its chirps, first)


def wings():
    beats = [L(330585, s, 0.35, t, -3.0, d, fin=0.005, fout=0.12) for s, t, d in ((0.100, 0.00, -10), (1.150, 0.28, -5), (2.280, 0.56, -7), (3.380, 0.84, -8))]
    return layer([L('old:sfx_hero_wings', 0.0, 1.27, 0.0, 0.0, 0, fin=0.002, fout=0.2)] + beats)  # a swan's wings, lower


# --- the Kratos Peel ---
def spartaaa():
    return layer([
        L('old:sfx_hero_spartaaa', 0.0, 1.78, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(623449, 0.480, 1.35, 0.380, -3.0, 4, fin=0.05, fout=0.35, fx='lowpass=f=3500'),  # a kingly yell's held vowel, lower,
        L(623449, 0.480, 1.35, 0.395, -7.0, 4, fin=0.05, fout=0.35, fx='lowpass=f=2500'),  # doubled lower still: SPARTAAA
        L(480805, 0.200, 1.35, 0.400, 0.0, 12, fin=0.03, fout=0.35),            # a small group of men shouting
        L(20185, 0.000, 0.40, 0.380, -12.0, -6, fin=0.001, fout=0.2, keep=False, fx='lowpass=f=500'),  # a massed stomp, far
        # lower: the thump
    ])


def ragefire():
    return layer([
        L(244926, 0.400, 2.30, 0.000, -2.0, 0, fin=0.01, fout=0.01),            # diesel thrown on a fire, roaring, a little lower
        L(186316, 20.000, 2.30, 0.000, 0.0, 17, fin=0.01, fout=0.01),           # a pine-wood bonfire's crackle
        L(382616, 9.000, 2.30, 0.000, 0.0, 9, fin=0.01, fout=0.01),             # and a fireplace's
    ])


def flamesmack():
    return layer([
        L(276600, 0.190, 0.18, 0.000, -4.0, 3, fin=0.001, fout=0.08),           # a gloved hand's thud on a helmet, lower: the smack
        L(20185, 0.000, 0.25, 0.000, -12.0, -6, fin=0.001, fout=0.12, keep=False, fx='lowpass=f=500'),  # a massed stomp, far lower
        L(539972, 0.000, 0.40, 0.010, -2.0, -2, fin=0.002, fout=0.2, fx=DECAY % 8),  # a burst of gas flame, a little lower
    ], post=DAMP % (14, 0.18))


def ragehiss():
    return layer([
        L(234782, 0.550, 1.00, 0.000, 0.0, 0, fin=0.005, fout=0.6),             # a steam release hissing out
        L(235597, 0.640, 1.05, 0.000, 0.0, 10, fin=0.005, fout=0.5),             # water sizzling on a hot stove
        L(208111, 0.180, 0.55, 0.000, -5.0, 12, fin=0.005, fout=0.3, fx='highpass=f=300'),  # two pillows touched together, lower: the puff
    ])


def blade():
    return layer([
        L(475131, 0.030, 0.25, 0.000, 4.0, 0, fin=0.003, fout=0.08),            # a super-heavy swoosh, higher: the slash
        L(180818, 0.150, 0.22, 0.020, 0.0, -3, fin=0.001, fout=0.1, fx=DECAY % 12),  # real swords clashing: the blade's ring
        L(871034, 0.030, 0.22, 0.030, 0.0, -2, fin=0.002, fout=0.08),           # a small chain dropped: the rattle
    ])


# --- Norse gods ---
def allfather():
    return layer([
        L(392180, 0.050, 1.25, 0.000, -12.0, 0, fin=0.03, fout=0.35),          # a battle horn blown, an octave lower,
        L(479998, 0.250, 1.20, 0.020, -9.0, 0, fin=0.05, fout=0.35),            # a cow horn, far lower, over it
        L(827424, 0.030, 0.25, 0.600, -3.0, -2, fin=0.005, fout=0.08),          # a raven's caw, lower,
        L(827424, 0.340, 0.30, 0.900, -4.0, 1, fin=0.005, fout=0.1),            # and another
        L(853153, 0.040, 0.50, 1.180, -5.0, -6, fin=0.002, fout=0.25, fx='lowpass=f=800,' + DECAY % 6),  # a big gong, far lower,
        # damped: the eye opens
    ])


def thundergod():
    return layer([
        L('old:sfx_hero_thundergod', 0.0, 1.73, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(672776, 0.050, 0.55, 0.000, -3.0, -6, fin=0.3, fout=0.1),             # thunder rising, lower, as the hammer's raised
        L(188767, 0.150, 0.80, 0.450, -3.0, -4, fin=0.002, fout=0.3),           # a real crack of thunder, lower
        L(505113, 0.720, 1.20, 0.500, -2.0, -2, fin=0.02, fout=0.4),            # and a close clap rolling on
    ])


def mjolnir():
    sw = [L(485245, 0.020, 0.15, t, -3.0, d + 16, fin=0.005, fout=0.06) for t, d in
          ((0.00, -6), (0.07, -6), (0.14, -3), (0.21, -1), (0.28, 0), (0.35, 0), (0.42, -1), (0.49, -4))]
    return layer(sw + [L(475131, 0.000, 0.55, 0.050, -5.0, -7, fin=0.1, fout=0.2, keep=False)])  # a heavy swing, lower, eight
    # times as it spins past, over a super-heavy swoosh, far lower and slower


def mischief():
    syl = ((1.145, 0.120, 0), (1.285, 0.110, 0), (2.645, 0.120, 0), (2.805, 0.100, 7))  # (the last is quieter)
    giggle = [L(693938, syl[i % 4][0], syl[i % 4][1], 0.09 * i, p, d + syl[i % 4][2], fin=0.004, fout=0.03, keep=False, fx='highpass=f=180')
              for i, (p, d) in enumerate(((3, 0), (4, -1), (3, 0), (5, -1), (4, 0), (3, -2), (2, -4)))]
    giggle += [L(693938, syl[(i + 2) % 4][0], syl[(i + 2) % 4][1], 0.045 + 0.09 * i, p, d - 3 + syl[(i + 2) % 4][2], fin=0.004, fout=0.03, keep=False,
                 fx='highpass=f=180') for i, (p, d) in enumerate(((1, 0), (2, -1), (1, 0), (3, -1), (2, -1), (1, -3)))]  # doubled
    return layer(giggle + [                                                     # a man's sly laugh cut into a "heh-heh-heh", higher
        L(208111, 0.180, 0.50, 0.600, -2.0, 10, fin=0.005, fout=0.2, fx='highpass=f=500'),  # two pillows touched together: a poof,
        L(208111, 0.180, 0.45, 0.760, 1.0, 7, fin=0.005, fout=0.2, fx='highpass=f=500'),  # another
        L(208111, 0.180, 0.40, 0.900, 3.0, 4, fin=0.005, fout=0.2, fx='highpass=f=500'),  # and another
    ], post='acompressor=threshold=-28dB:ratio=5:attack=3:release=60:knee=6')


def falcon():
    return layer([
        L(867997, 0.550, 0.32, 0.000, 0.0, 0, fin=0.005, fout=0.08, fx='highpass=f=400'),  # a gyrfalcon's call,
        L(867997, 1.420, 0.30, 0.200, 0.0, -2, fin=0.005, fout=0.08, fx='highpass=f=400'),  # and again
        L(684459, 0.700, 0.45, 0.380, -2.0, 18, fin=0.05, fout=0.15),           # a whoosh as it dives
    ])


def boar():
    hooves = [L(571296, s, 0.08, 0.30 + 0.09 * i, -6.0, 20 + (6 if i == 7 else 0), fin=0.002, fout=0.04, fx='lowpass=f=4000') for i, s in
              enumerate((2.900, 3.150, 3.400, 3.650, 3.900, 4.150, 4.400, 4.650, 4.950, 5.200))]
    return layer([
        L(842313, 0.050, 0.45, 0.000, -3.0, 0, fin=0.005, fout=0.12),           # a pig's growling grunt, lower: the boar
        L(510735, 0.540, 0.85, 0.800, 0.0, 6, fin=0.002, fout=0.3),             # a coin dropped on a table
    ] + hooves)                                                                # hooves clattering, lower: the charge


def oath():
    return layer([
        L('old:sfx_hero_oath', 0.0, 1.70, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(853153, 0.040, 1.65, 0.000, -3.0, -2, fin=0.002, fout=0.6),           # a big gong struck with a felt mallet, lower
    ])


def gjallarhorn():
    mix = layer([
        L(392180, 0.050, 1.30, 0.000, -5.0, 0, fin=0.03, fout=0.35),            # a battle horn blown, lower,
        L(392180, 0.050, 1.30, 0.000, -17.0, -3, fin=0.03, fout=0.35),          # over itself far lower
    ])
    return reverb(mix, rt60=1.4, wet_db=-6.0, seed=31)  # in a long echo, as if across the sky


def radiance():
    c = 'highpass=f=100,lowpass=f=6000'
    return layer([
        L('old:sfx_hero_radiance', 0.0, 1.60, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(764221, 2.400, 1.55, 0.000, -5.0, 10, fin=0.35, fout=0.5, fx=c),       # a crowd singing "ah": C
        L(764221, 3.400, 1.55, 0.010, -1.0, 12, fin=0.35, fout=0.5, fx=c),       # E
        L(764221, 4.400, 1.55, 0.020, 2.0, 12, fin=0.35, fout=0.5, fx=c),        # G
        L(271370, 0.020, 1.40, 0.100, 12.0, 12, fin=0.002, fout=0.6),            # a singing bowl struck, an octave up: the bell
    ])


def halfdeath():
    return layer([
        L('old:sfx_hero_halfdeath', 0.0, 1.39, 0.0, 0.0, 0, fin=0.002, fout=0.2),
        L(438861, 2.000, 1.40, 0.000, -2.0, 7, fin=0.3, fout=0.5, fx='lowpass=f=2500'),  # howling wind, a little lower
    ])


def seawind():
    return layer([
        L(438861, 8.300, 1.47, 0.000, 0.0, 0, fin=0.3, fout=0.4),               # howling wind gusting
        L(454092, 142.50, 1.47, 0.000, 0.0, 5, fin=0.4, fout=0.4, fx='highpass=f=200'),  # a mountain gale
        L(590147, 0.300, 0.65, 0.500, -4.0, -9, fin=0.05, fout=0.2),            # creaking wood, lower: the rigging
    ])


def winterhunt():
    return layer([
        L(454092, 142.50, 1.30, 0.000, 3.0, 10, fin=0.05, fout=0.4, fx='highpass=f=300,treble=g=6:f=3000'),  # a mountain gale,
        # higher and brighter: the icy wind
        L(838106, 1.350, 0.90, 0.050, 0.0, 4, fin=0.01, fout=0.2, fx='highpass=f=1500'),  # ice crackling under pressure
        L(262633, 0.300, 0.80, 0.300, 2.0, 14, fin=0.01, fout=0.2),             # and ice cracking as it melts
    ])


def freeze():
    return layer([
        L(262635, 0.120, 0.30, 0.000, 0.0, 0, fin=0.001, fout=0.1),             # ice cracking
        L(838106, 1.380, 0.30, 0.010, 0.0, 0, fin=0.002, fout=0.1, fx='highpass=f=1200'),  # and crackling under pressure
    ])


def saga():
    return layer([pluck('E3', 0.000, 1.3, -2), pluck('A3', 0.040, 1.3), pluck('E4', 0.080, 1.3, -1), pluck('A4', 0.120, 1.3, -2),
                  L(368817, 1.450, 0.85, 0.250, 0.0, 7, fin=0.15, fout=0.3)])  # the iron-age lyre strummed and a man humming


def verse():
    return layer([lyre('A4', 0.000, 0.45, -1, 0.0), lyre('F#4', 0.060, 0.45, -1, 0.0), lyre('E4', 0.120, 0.45, 0, 0.0),
                  lyre('A3', 0.180, 0.40, 0, 0.0)])  # a falling run on the iron-age lyre


def loop_master(name, p, dur, level, xf=0.25, limit=0.84, comp='acompressor=threshold=-20dB:ratio=2.5:attack=6:release=90:knee=4'):
    """a mono one-shot that the game loops (the Kratos Peel's fire): <dur> s from <xf> s into the render, its last <xf> s
    crossfaded (equal power) into the first <xf> s, so its end runs on into its start; levelled to a 50 ms RMS peak of
    <level> dB as master() does, three copies end to end through the compressor and limiter and the middle one kept, so no
    filter edge touches the seam."""
    x = read(p)
    n, X = int(dur * SR), int(xf * SR)
    one = x[X:X + n]
    for i in range(X):
        k = i / X
        j = n - X + i
        one[j] = one[j] * math.cos(k * math.pi / 2) + x[i] * math.sin(k * math.pi / 2)
    raw = tmp('f32')
    open(raw, 'wb').write(array.array('f', one * 3).tobytes())
    out = os.path.join(OUT, name + '.mp3')
    g = level - rms50(one)
    for _ in range(8):
        p3 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw, '-af',
                             'highpass=f=40,%s,volume=%.2fdB,alimiter=limit=%.2f:attack=1.5:release=60:level=0:latency=1' % (comp, g, limit),
                             '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', out],
                       input=p3[n * 4:2 * n * 4], check=True)
        got = rms50(read(out))
        if abs(got - level) < 0.15:
            break
        g += 1.3 * (level - got)
    x = read(out)
    print('%s: %.2f s loop, 50 ms RMS peak %.1f dB, sample peak %.1f dBFS' % (out, len(x) / SR, rms50(x), peak(x)))


AMB = {'jotunheim': ('ambience_jotunheim', lambda: wrap(jotunheim())), 'bifrost': ('ambience_bifrost', bifrost),
       'firstpizzeria': ('ambience_firstpizzeria', lambda: wrap(firstpizzeria()), dict(limit=0.62)),
       'hotgates': ('ambience_hotgates', lambda: wrap(hotgatesloop())),
       'gotham': ('ambience_gotham', lambda: wrap(gothamloop()))}

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
    'nonnapin': ('sfx_nonna_pin', nonnapin, 1.60, -14.3, 0.2),
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
    'avalanche': ('sfx_yeti_avalanche', avalanche, 1.92, -12.6, 0.3),
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
    # batch 3 (the same rule for the level)
    'fenrirhowl': ('sfx_fenrir_howl', fenrirhowl, 2.33, -9.8, 0.45),
    'fenrirdeath': ('sfx_fenrir_death', fenrirdeath, 2.40, -10.4, 0.5),
    'wolfpupyip': ('sfx_wolfpupyip', wolfpupyip, 0.64, -11.8, 0.04),
    'thrymblizzard': ('sfx_thrym_blizzard', thrymblizzard, 1.48, -10.8, 0.2),
    'thrymspread': ('sfx_thrym_spread', thrymspread, 1.00, -12.9, 0.1),
    'frostchill': ('sfx_frostchill', frostchill, 0.90, -13.3, 0.1),
    'jormenter': ('sfx_jormungandr_enter', jormenter, 2.24, -10.6, 0.5),
    'jormsurface': ('sfx_jormungandr_surface', jormsurface, 1.09, -11.4, 0.15),
    'jormhiss': ('sfx_jormungandr_hiss', jormhiss, 0.90, -11.6, 0.1),
    'surtrfuse': ('sfx_surtr_fuse', surtrfuse, 1.50, -11.2, 0.2),
    'surtrraise': ('sfx_surtr_raise', surtrraise, 1.65, -10.6, 0.08),
    'surtrroar': ('sfx_surtr_roar', surtrroar, 1.40, -10.4, 0.3),
    'skaldsong': ('sfx_skaldsong', skaldsong, 2.17, -11.0, 0.4),
    'skaldrally': ('sfx_skaldrally', skaldrally, 1.24, -12.4, 0.35),
    'muspelscorch': ('sfx_muspelscorch', muspelscorch, 0.90, -12.3, 0.3),
    'bellow': ('sfx_minotaur_bellow', bellow, 1.54, -9.1, 0.3),
    'mintsnort': ('sfx_minotaur_snort', mintsnort, 0.97, -11.8, 0.1),
    'mintcharge': ('sfx_minotaur_charge', mintcharge, 1.40, -10.6, 0.1),
    'mintwalls': ('sfx_minotaur_walls', mintwalls, 1.30, -14.0, 0.15),
    'medusaglow': ('sfx_medusa_glow', medusaglow, 1.19, -11.5, 0.1),
    'petrify': ('sfx_medusa_petrify', petrify, 1.20, -11.3, 0.2),
    'medusahiss': ('sfx_medusa_hiss', medusahiss, 0.75, -11.9, 0.1),
    'cerbbark': ('sfx_cerberus_bark', cerbbark, 1.09, -10.7, 0.2),
    'cerbgrowl': ('sfx_cerberus_growl', cerbgrowl, 1.09, -11.3, 0.12),
    'cerbfire': ('sfx_cerberus_fire', cerbfire, 1.00, -10.1, 0.3),
    'cerbice': ('sfx_cerberus_ice', cerbice, 0.80, -11.7, 0.15),
    'cerbhowl': ('sfx_cerberus_howl', cerbhowl, 1.75, -9.2, 0.25),
    'hadestoll': ('sfx_hades_toll', hadestoll, 2.30, -10.8, 0.5),
    'hadesrise': ('sfx_hades_rise', hadesrise, 1.70, -11.0, 0.2),
    'hadesslide': ('sfx_hades_slide', hadesslide, 1.00, -11.4, 0.15),
    'hadesflare': ('sfx_hades_flare', hadesflare, 1.11, -11.8, 0.1),
    'sirensong': ('sfx_sirensong', sirensong, 1.29, -11.4, 0.25),
    'harpy': ('sfx_harpy', harpy, 0.82, -13.0, 0.15),
    'whirlpool': ('sfx_whirlpool', whirlpool, 1.67, -11.3, 0.3),
    'gulp': ('sfx_gulp', gulp, 0.80, -11.6, 0.15),
    # batch 4 (the same rule for the level)
    'solepropenter': ('sfx_soleprop_enter', solepropenter, 2.30, -11.6, 0.4),
    'solepropvoice': ('sfx_soleprop_voice', solepropvoice, 0.78, -12.0, 0.08),
    'solepropcash': ('sfx_soleprop_cash', solepropcash, 0.91, -13.1, 0.15),
    'solepropclock': ('sfx_soleprop_clock', solepropclock, 0.09, -14.4, 0.03),
    'solepropbell': ('sfx_soleprop_bell', solepropbell, 1.45, -12.6, 0.3),
    'rewind': ('sfx_ghostfuture_rewind', rewind, 0.99, -12.1, 0.1, 0.70),
    'unboundenter': ('sfx_soleunbound_enter', unboundenter, 2.96, -11.4, 0.6),
    'unboundfist': ('sfx_soleunbound_fist', unboundfist, 0.74, -11.6, 0.06),
    'unboundfrost': ('sfx_soleunbound_frost', unboundfrost, 0.69, -12.0, 0.15, 0.70),
    'unboundfire': ('sfx_soleunbound_fire', unboundfire, 1.00, -10.2, 0.2),
    'unbounddouse': ('sfx_soleunbound_douse', unbounddouse, 0.71, -13.4, 0.2),
    'hbatpeel': ('sfx_smack_hero_batpeel', hbatpeel, 0.32, -14.4, 0.06),
    'hwonderwedge': ('sfx_smack_hero_wonderwedge', hwonderwedge, 0.47, -14.7, 0.08),
    'haquatoe': ('sfx_smack_hero_aquatoe', haquatoe, 0.53, -14.0, 0.08),
    'hincrediblebulk': ('sfx_smack_hero_incrediblebulk', hincrediblebulk, 0.40, -13.4, 0.08),
    'hhawkeyetalian': ('sfx_smack_hero_hawkeyetalian', hhawkeyetalian, 0.45, -12.3, 0.08),
    'hdeadpeel': ('sfx_smack_hero_deadpeel', hdeadpeel, 0.38, -13.2, 0.06),
    'hshazamozza': ('sfx_smack_hero_shazamozza', hshazamozza, 0.29, -12.9, 0.06),
    'hcattoewoman': ('sfx_smack_hero_cattoewoman', hcattoewoman, 0.43, -13.2, 0.08),
    'hgreenpepperarrow': ('sfx_smack_hero_greenpepperarrow', hgreenpepperarrow, 0.45, -12.9, 0.08),
    'hhawkcrust': ('sfx_smack_hero_hawkcrust', hhawkcrust, 0.32, -13.1, 0.06),
    'hswampthincrust': ('sfx_smack_hero_swampthincrust', hswampthincrust, 0.40, -13.9, 0.08),
    'hwasabiwasp': ('sfx_smack_hero_wasabiwasp', hwasabiwasp, 0.30, -16.1, 0.06),
    'hicecreamman': ('sfx_smack_hero_icecreamman', hicecreamman, 0.60, -14.0, 0.08),
    'hzeus': ('sfx_smack_hero_zeus', hzeus, 0.55, -14.3, 0.08),
    'hhera': ('sfx_smack_hero_hera', hhera, 0.43, -12.8, 0.08),
    'hposeidon': ('sfx_smack_hero_poseidon', hposeidon, 0.45, -14.3, 0.08),
    'hdemeter': ('sfx_smack_hero_demeter', hdemeter, 0.54, -14.3, 0.08),
    'hathena': ('sfx_smack_hero_athena', hathena, 0.50, -13.4, 0.08),
    'hapollo': ('sfx_smack_hero_apollo', hapollo, 0.55, -13.0, 0.08),
    'hartemis': ('sfx_smack_hero_artemis', hartemis, 0.50, -13.3, 0.08),
    'haphrodite': ('sfx_smack_hero_aphrodite', haphrodite, 0.49, -13.6, 0.08),
    'hhermes': ('sfx_smack_hero_hermes', hhermes, 0.30, -12.1, 0.06),
    'hdionysus': ('sfx_smack_hero_dionysus', hdionysus, 0.40, -13.9, 0.08),
    'hhestia': ('sfx_smack_hero_hestia', hhestia, 0.45, -13.8, 0.08),
    'hodin': ('sfx_smack_hero_odin', hodin, 0.55, -14.0, 0.08),
    'hfrigg': ('sfx_smack_hero_frigg', hfrigg, 0.40, -14.5, 0.08),
    'hfreya': ('sfx_smack_hero_freya', hfreya, 0.30, -13.1, 0.06),
    'hfreyr': ('sfx_smack_hero_freyr', hfreyr, 0.47, -13.5, 0.08),
    'htyr': ('sfx_smack_hero_tyr', htyr, 0.55, -14.7, 0.08),
    'hheimdall': ('sfx_smack_hero_heimdall', hheimdall, 0.44, -12.7, 0.08),
    'hnjord': ('sfx_smack_hero_njord', hnjord, 0.44, -13.7, 0.08),
    'hskadi': ('sfx_smack_hero_skadi', hskadi, 0.34, -13.6, 0.06),
    'hidun': ('sfx_smack_hero_idun', hidun, 0.50, -14.5, 0.08),
    'hbragi': ('sfx_smack_hero_bragi', hbragi, 0.55, -13.3, 0.08),
    'hdarkkneader': ('sfx_smack_hero_darkkneader', hdarkkneader, 0.50, -14.3, 0.08),
    'hodinascended': ('sfx_smack_hero_odinascended', hodinascended, 0.60, -14.5, 0.08),
    'hzeusunbound': ('sfx_smack_hero_zeusunbound', hzeusunbound, 0.74, -13.9, 0.08),
    'hsymbiotepan': ('sfx_smack_hero_symbiotepan', hsymbiotepan, 0.45, -13.9, 0.08),
    'hamazonqueen': ('sfx_smack_hero_amazonqueen', hamazonqueen, 0.49, -13.8, 0.08),
    'hincrediblebulkendgame': ('sfx_smack_hero_incrediblebulkendgame', hincrediblebulkendgame, 0.65, -13.7, 0.08),
    'hhawkeyetalianendgame': ('sfx_smack_hero_hawkeyetalianendgame', hhawkeyetalianendgame, 0.65, -14.0, 0.08, 0.70),
    'hwasabiwaspendgame': ('sfx_smack_hero_wasabiwaspendgame', hwasabiwaspendgame, 0.65, -13.9, 0.08),
    # batch 5 (the same rule for the level)
    'tkenter': ('sfx_titanking_enter', tkenter, 2.38, -10.9, 0.40),
    'tkroar': ('sfx_titanking_roar', tkroar, 1.90, -12.3, 0.38),
    'tkflip': ('sfx_titanking_flip', tkflip, 1.40, -11.5, 0.28),
    'tktick': ('sfx_titanking_tick', tktick, 0.39, -12.9, 0.08),
    'tkshatter': ('sfx_titanking_shatter', tkshatter, 1.47, -10.7, 0.29),
    'tkchomp': ('sfx_titanking_chomp', tkchomp, 0.70, -11.8, 0.14),
    'tkchew': ('sfx_titanking_chew', tkchew, 0.54, -11.0, 0.11),
    'tkjawhit': ('sfx_titanking_jawhit', tkjawhit, 0.54, -12.5, 0.11),
    'tkfreed': ('sfx_titanking_freed', tkfreed, 0.80, -11.4, 0.16),
    'tkchain': ('sfx_titanking_chain', tkchain, 1.26, -12.9, 0.25),
    'tkchainbreak': ('sfx_titanking_chainbreak', tkchainbreak, 1.09, -12.8, 0.22),
    'tkdeath': ('sfx_titanking_death', tkdeath, 2.38, -12.1, 0.40),
    'tkstrain': ('sfx_titanking_strain', tkstrain, 1.39, -11.6, 0.28),
    'tkweakhit': ('sfx_titanking_weakhit', tkweakhit, 0.44, -13.0, 0.09),
    'tkweakbreak': ('sfx_titanking_weakbreak', tkweakbreak, 1.39, -11.4, 0.28, 0.70),
    'tkrip': ('sfx_titanking_rip', tkrip, 1.60, -11.7, 0.32),
    'tkscrape': ('sfx_titanking_scrape', tkscrape, 2.30, -10.3, 0.40, 0.70),
    'tkunchained': ('sfx_titanking_unchained', tkunchained, 2.60, -10.8, 0.40),
    'tkswing': ('sfx_titanking_swing', tkswing, 1.22, -11.2, 0.24),
    'tkbladehit': ('sfx_titanking_bladehit', tkbladehit, 0.48, -12.7, 0.10),
    'tkcrumble': ('sfx_titanking_crumble', tkcrumble, 1.98, -13.2, 0.40),
    'tkrockcrack': ('sfx_titanking_rockcrack', tkrockcrack, 0.80, -13.3, 0.16),
    'tkrockfall': ('sfx_titanking_rockfall', tkrockfall, 1.40, -12.1, 0.28),
    'tkrocksmash': ('sfx_titanking_rocksmash', tkrocksmash, 0.88, -12.0, 0.18),
    'tkrockland': ('sfx_titanking_rockland', tkrockland, 0.92, -11.3, 0.18),
    'tkpierce': ('sfx_titanking_pierce', tkpierce, 0.90, -10.4, 0.18),
    'tkrise': ('sfx_titanking_rise', tkrise, 1.69, -13.1, 0.34),
    'tkheadchew': ('sfx_titanking_headchew', tkheadchew, 0.48, -12.9, 0.10, 0.70),
    'tksink': ('sfx_titanking_sink', tksink, 1.35, -13.8, 0.27),
    'tkgulp': ('sfx_titanking_gulp', tkgulp, 1.00, -11.2, 0.20),
    'zeusenter': ('sfx_zeus_enter', zeusenter, 1.83, -10.7, 0.37),
    'zeusthunder': ('sfx_zeus_thunder', zeusthunder, 2.40, -11.7, 0.40),
    'zeusbolt': ('sfx_zeus_bolt', zeusbolt, 1.20, -10.4, 0.24),
    'zeushurl': ('sfx_zeus_hurl', zeushurl, 0.90, -12.7, 0.18),
    'zeusposeidon': ('sfx_zeus_poseidon', zeusposeidon, 1.80, -11.2, 0.36),
    'zeuswave': ('sfx_zeus_wave', zeuswave, 1.58, -10.8, 0.32),
    'zeustrident': ('sfx_zeus_trident', zeustrident, 0.42, -13.0, 0.08),
    'zeusares': ('sfx_zeus_ares', zeusares, 1.29, -11.3, 0.26),
    'zeuswarcry': ('sfx_zeus_warcry', zeuswarcry, 1.09, -12.2, 0.22),
    'zeuscrown': ('sfx_zeus_crown', zeuscrown, 0.90, -10.3, 0.18, 0.70),
    'zeusdeath': ('sfx_zeus_death', zeusdeath, 2.79, -9.5, 0.40),
    'trumpet': ('sfx_trumpet', trumpet, 0.80, -13.1, 0.16),
    'spartanroar': ('sfx_spartanroar', spartanroar, 0.79, -12.0, 0.16),
    'bronzeshield': ('sfx_bronzeshield', bronzeshield, 0.50, -13.8, 0.10),
    'immortalfall': ('sfx_immortalfall', immortalfall, 0.69, -11.8, 0.14),
    'bowdraw': ('sfx_bowdraw', bowdraw, 0.55, -12.6, 0.11),
    'arrowloose': ('sfx_arrowloose', arrowloose, 0.39, -13.0, 0.08),
    'arrowthunk': ('sfx_arrowthunk', arrowthunk, 0.30, -12.8, 0.06),
    'gallop': ('sfx_gallop', gallop, 1.18, -11.5, 0.24),
    'neigh': ('sfx_neigh', neigh, 0.85, -12.3, 0.17),
    'chariotrev': ('sfx_chariotrev', chariotrev, 1.14, -12.1, 0.23),
    'chariotroll': ('sfx_chariotroll', chariotroll, 1.68, -14.2, 0.34),
    'chariotchip': ('sfx_chariotchip', chariotchip, 0.22, -13.9, 0.05),
    'hubbreak': ('sfx_hubbreak', hubbreak, 0.81, -12.3, 0.16),
    'warhorn': ('sfx_warhorn', warhorn, 1.45, -10.5, 0.29),
    'ibenter': ('sfx_immortalbrute_enter', immortalbruteenter, 1.60, -11.7, 0.32),
    'ibhorde': ('sfx_immortalbrute_horde', immortalbrutehorde, 2.01, -11.3, 0.40),
    'ibwhirl': ('sfx_immortalbrute_whirl', immortalbrutewhirl, 1.70, -11.4, 0.34, 0.75),
    'ibslam': ('sfx_immortalbrute_slam', immortalbruteslam, 0.63, -11.8, 0.13),
    'ibsnag': ('sfx_immortalbrute_snag', immortalbrutesnag, 0.60, -12.4, 0.12),
    'ibroar': ('sfx_immortalbrute_roar', immortalbruteroar, 1.59, -11.9, 0.32),
    'ibdeath': ('sfx_immortalbrute_death', immortalbrutedeath, 2.13, -10.8, 0.40),
    'xerxesenter': ('sfx_xerxes_enter', xerxesenter, 2.80, -10.6, 0.40),
    'xerxeslaugh': ('sfx_xerxes_laugh', xerxeslaugh, 2.00, -10.4, 0.40),
    'xerxesarrows': ('sfx_xerxes_arrows', xerxesarrows, 2.60, -10.3, 0.40, 0.70),
    'xerxesvolley': ('sfx_xerxes_volley', xerxesvolley, 0.95, -11.4, 0.19, 0.70),
    'xerxesrhino': ('sfx_xerxes_rhino', xerxesrhino, 1.49, -10.6, 0.30),
    'xerxescharge': ('sfx_xerxes_charge', xerxescharge, 1.94, -10.8, 0.39),
    'xerxesturn': ('sfx_xerxes_turn', xerxesturn, 1.07, -11.5, 0.21),
    'xerxeselephants': ('sfx_xerxes_elephants', xerxeselephants, 1.77, -11.7, 0.35),
    'xerxesdeath': ('sfx_xerxes_death', xerxesdeath, 3.17, -11.5, 0.40),
    'holdline': ('sfx_hero_holdline', holdline, 1.07, -10.4, 0.21, 0.70),
    'spear': ('sfx_hero_spear', spear, 0.59, -12.0, 0.12),
    'herohotgates': ('sfx_hero_hotgates', hotgates, 2.40, -9.9, 0.40),
    # batch 6 (the same rule for the level)
    'bunionenter': ('sfx_bunion_enter', bunionenter, 1.80, -11.1, 0.36, 0.84, LIGHT),
    'bunionpump': ('sfx_bunion_pump', bunionpump, 1.24, -13.7, 0.25),
    'bunionsurge': ('sfx_bunion_surge', bunionsurge, 1.80, -12.4, 0.36),
    'bunionsmash': ('sfx_bunion_smash', bunionsmash, 1.17, -10.8, 0.23, 0.84, LIGHT),
    'buniontubehit': ('sfx_bunion_tubehit', buniontubehit, 0.41, -13.5, 0.08, 0.84, LIGHT),
    'buniondrain': ('sfx_bunion_drain', buniondrain, 1.19, -11.6, 0.24, 0.84, LIGHT),
    'buniongrab': ('sfx_bunion_grab', buniongrab, 0.74, -10.7, 0.15),
    'bunionstrain': ('sfx_bunion_strain', bunionstrain, 0.34, -14.9, 0.07),
    'bunionbreak': ('sfx_bunion_break', bunionbreak, 1.00, -12.1, 0.20, 0.75, LIGHT),
    'bunionsaved': ('sfx_bunion_saved', bunionsaved, 0.76, -11.4, 0.15, 0.84, LIGHT),
    'buniondeath': ('sfx_bunion_death', buniondeath, 2.40, -11.6, 0.40, 0.84, LIGHT),
    'jokesterenter': ('sfx_jokester_enter', jokesterenter, 1.08, -11.1, 0.22),
    'jokesterlaugh': ('sfx_jokester_laugh', jokesterlaugh, 1.18, -11.8, 0.24),
    'jokestertoss': ('sfx_jokester_toss', jokestertoss, 0.70, -13.0, 0.14),
    'jokestertick': ('sfx_jokester_tick', jokestertick, 1.06, -14.6, 0.21, 0.70),
    'jokesterboom': ('sfx_jokester_boom', jokesterboom, 1.23, -10.8, 0.25, 0.84, LIGHT),
    'jokesterdefuse': ('sfx_jokester_defuse', jokesterdefuse, 0.66, -11.9, 0.13, 0.62),
    'jokestergift': ('sfx_jokester_gift', jokestergift, 0.95, -12.6, 0.19),
    'jokestergas': ('sfx_jokester_gas', jokestergas, 0.92, -12.9, 0.18),
    'jokesterclear': ('sfx_jokester_clear', jokesterclear, 0.79, -10.0, 0.16),
    'jokestergiggle': ('sfx_jokester_giggle', jokestergiggle, 0.40, -12.3, 0.08),
    'jokesterjack': ('sfx_jokester_jack', jokesterjack, 1.70, -10.7, 0.34),
    'jokesterspring': ('sfx_jokester_spring', jokesterspring, 0.81, -10.9, 0.16),
    'jokesterpie': ('sfx_jokester_pie', jokesterpie, 0.54, -11.1, 0.11, 0.75),
    'jokestersplat': ('sfx_jokester_splat', jokestersplat, 0.90, -12.4, 0.18, 0.84, LIGHT),
    'jokesterteeth': ('sfx_jokester_teeth', jokesterteeth, 1.19, -13.7, 0.24, 0.70),
    'jokesterweight': ('sfx_jokester_weight', jokesterweight, 1.79, -12.1, 0.36),
    'jokesterthud': ('sfx_jokester_thud', jokesterthud, 1.40, -10.9, 0.28, 0.84, LIGHT),
    'jokesterbang': ('sfx_jokester_bang', jokesterbang, 0.61, -10.8, 0.12, 0.70),
    'jokesterwindow': ('sfx_jokester_window', jokesterwindow, 2.17, -11.5, 0.40),
    'jokesterdeath': ('sfx_jokester_death', jokesterdeath, 2.36, -11.7, 0.40),
    'darkfalls': ('sfx_hero_darkfalls', darkfalls, 2.00, -10.1, 0.40),
    'redsoleenter': ('sfx_redsole_enter', redsoleenter, 2.40, -8.7, 0.40),
    'redsolelaugh': ('sfx_redsole_laugh', redsolelaugh, 1.30, -9.7, 0.26),
    'redsoleturret': ('sfx_redsole_turret', redsoleturret, 0.77, -11.4, 0.15),
    'redsolespray': ('sfx_redsole_spray', redsolespray, 0.90, -10.5, 0.18),
    'redsolecap': ('sfx_redsole_cap', redsolecap, 0.62, -11.4, 0.12, 0.70),
    'redsolestomp': ('sfx_redsole_stomp', redsolestomp, 0.60, -10.2, 0.12, 0.84, LIGHT),
    'redsoledeath': ('sfx_redsole_death', redsoledeath, 2.63, -10.9, 0.40),
    'venomnomenter': ('sfx_venomnom_enter', venomnomenter, 2.20, -11.7, 0.40),
    'venomnomgrowl': ('sfx_venomnom_growl', venomnomgrowl, 1.30, -12.7, 0.26),
    'venomnomtongue': ('sfx_venomnom_tongue', venomnomtongue, 0.71, -11.7, 0.14, 0.75),
    'venomnomsnatch': ('sfx_venomnom_snatch', venomnomsnatch, 0.90, -12.7, 0.18, 0.84, LIGHT),
    'venomnomcut': ('sfx_venomnom_cut', venomnomcut, 0.53, -11.0, 0.11),
    'venomnomgoo': ('sfx_venomnom_goo', venomnomgoo, 0.99, -12.2, 0.20),
    'venomnomdrain': ('sfx_venomnom_drain', venomnomdrain, 0.90, -12.3, 0.18),
    'venomnomshriek': ('sfx_venomnom_shriek', venomnomshriek, 1.20, -12.3, 0.24),
    'venomnomsplit': ('sfx_venomnom_split', venomnomsplit, 0.95, -11.6, 0.19),
    'venomnomdeath': ('sfx_venomnom_death', venomnomdeath, 2.80, -11.3, 0.40),
    'cheetoeenter': ('sfx_cheetoe_enter', cheetoeenter, 1.32, -11.0, 0.26),
    'cheetoedash': ('sfx_cheetoe_dash', cheetoedash, 0.40, -12.8, 0.08, 0.60),
    'cheetoecrouch': ('sfx_cheetoe_crouch', cheetoecrouch, 1.10, -14.1, 0.22),
    'cheetoepounce': ('sfx_cheetoe_pounce', cheetoepounce, 0.53, -10.8, 0.11),
    'cheetoeslash': ('sfx_cheetoe_slash', cheetoeslash, 0.39, -12.2, 0.08, 0.75),
    'cheetoescratch': ('sfx_cheetoe_scratch', cheetoescratch, 0.42, -11.6, 0.08, 0.75),
    'cheetoehiss': ('sfx_cheetoe_hiss', cheetoehiss, 0.80, -12.2, 0.16),
    'cheetoerustle': ('sfx_cheetoe_rustle', cheetoerustle, 0.76, -12.3, 0.15),
    'cheetoeflush': ('sfx_cheetoe_flush', cheetoeflush, 0.76, -9.5, 0.15),
    'cheetoedeath': ('sfx_cheetoe_death', cheetoedeath, 1.59, -10.4, 0.32),
    'ghostsparta': ('sfx_hero_ghostsparta', ghostsparta, 2.40, -11.1, 0.40),
    'firetrail': ('sfx_hero_firetrail', firetrail, 0.50, -11.4, 0.10),
    'heroendgame': ('sfx_hero_endgame', heroendgame, 1.46, -10.4, 0.29),
    'unleashed': ('sfx_hero_unleashed', unleashed, 2.60, -10.5, 0.40),
    'ascended': ('sfx_hero_ascended', ascended, 1.67, -9.9, 0.33),
    'unbound': ('sfx_hero_unbound', unbound, 1.87, -11.2, 0.37),
    'tendril': ('sfx_hero_tendril', tendril, 0.60, -11.7, 0.12),
    'amazon': ('sfx_hero_amazon', amazon, 1.30, -10.8, 0.26, 0.65),
    # batch 7 (the same rule for the level)
    'herozeus': ('sfx_hero_zeus', herozeus, 1.63, -11.1, 0.33),
    'decree': ('sfx_hero_decree', decree, 1.23, -10.3, 0.25),
    'earthshaker': ('sfx_hero_earthshaker', earthshaker, 1.61, -11.3, 0.32),
    'harvest': ('sfx_hero_harvest', harvest, 1.16, -11.0, 0.23),
    'aegis': ('sfx_hero_aegis', aegis, 1.44, -10.7, 0.29),
    'chariot': ('sfx_hero_chariot', chariot, 1.60, -11.2, 0.32),
    'warcry': ('sfx_hero_warcry', warcry, 1.39, -10.3, 0.28),
    'charm': ('sfx_hero_charm', charm, 1.28, -10.8, 0.26),
    'forge': ('sfx_hero_forge', forge, 1.20, -11.6, 0.24),
    'spark': ('sfx_hero_spark', spark, 0.35, -13.9, 0.07),
    'messenger': ('sfx_hero_messenger', messenger, 0.89, -10.1, 0.18),
    'revel': ('sfx_hero_revel', revel, 1.40, -12.4, 0.28),
    'hearth': ('sfx_hero_hearth', hearth, 1.50, -10.6, 0.30),
    'underworld': ('sfx_hero_underworld', underworld, 1.60, -10.2, 0.32),
    'spring': ('sfx_hero_spring', spring, 1.12, -10.8, 0.22),
    'wings': ('sfx_hero_wings', wings, 1.27, -11.0, 0.25),
    'spartaaa': ('sfx_hero_spartaaa', spartaaa, 1.78, -9.3, 0.36),
    'flamesmack': ('sfx_hero_flamesmack', flamesmack, 0.40, -13.0, 0.08),
    'ragehiss': ('sfx_hero_ragehiss', ragehiss, 1.09, -13.6, 0.22, 0.75),
    'blade': ('sfx_hero_blade', blade, 0.25, -12.6, 0.05),
    'allfather': ('sfx_hero_allfather', allfather, 1.69, -10.8, 0.34),
    'thundergod': ('sfx_hero_thundergod', thundergod, 1.73, -11.2, 0.35),
    'mjolnir': ('sfx_hero_mjolnir', mjolnir, 0.59, -11.6, 0.12),
    'mischief': ('sfx_hero_mischief', mischief, 1.15, -9.8, 0.23),
    'falcon': ('sfx_hero_falcon', falcon, 0.80, -11.5, 0.16),
    'boar': ('sfx_hero_boar', boar, 1.52, -9.4, 0.30),
    'oath': ('sfx_hero_oath', oath, 1.70, -10.0, 0.34),
    'gjallarhorn': ('sfx_hero_gjallarhorn', gjallarhorn, 1.78, -9.9, 0.36),
    'radiance': ('sfx_hero_radiance', radiance, 1.60, -11.4, 0.32),
    'halfdeath': ('sfx_hero_halfdeath', halfdeath, 1.39, -10.3, 0.28),
    'seawind': ('sfx_hero_seawind', seawind, 1.47, -10.2, 0.29),
    'winterhunt': ('sfx_hero_winterhunt', winterhunt, 1.30, -10.1, 0.26),
    'freeze': ('sfx_hero_freeze', freeze, 0.30, -14.3, 0.06),
    'saga': ('sfx_hero_saga', saga, 1.40, -10.7, 0.28),
    'verse': ('sfx_hero_verse', verse, 0.55, -13.1, 0.11),
}

# the one-shots the game loops (batch 7): name -> (file, render, loop length s, 50 ms RMS peak dB); see loop_master()
LOOPS = {'rage': ('sfx_hero_rage', ragefire, 2.00, -11.6)}

if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    SRC = os.path.abspath(args.pop(0))
    OUT = os.path.join(ROOT, 'public', 'audio')
    if args and args[0] not in RECIPES and args[0] not in AMB and args[0] not in LOOPS and (os.sep in args[0] or os.path.isdir(args[0])):
        OUT = os.path.abspath(args.pop(0))
    bad = [a for a in args if a not in RECIPES and a not in AMB and a not in LOOPS]
    if bad:
        sys.exit('unknown sound(s) %s; known: %s (an OUT_DIR must exist or contain a /)' % (' '.join(bad), ' '.join(list(RECIPES) + list(AMB) + list(LOOPS))))
    os.makedirs(OUT, exist_ok=True)
    TMP = tempfile.mkdtemp(prefix='real-sfx-')
    try:
        for nm in args or list(RECIPES) + list(AMB) + list(LOOPS):
            if nm in LOOPS:
                key, fn, dur, level = LOOPS[nm]
                loop_master(key, fn(), dur, level)
                continue
            if nm in AMB:
                amb_loop(AMB[nm][0], AMB[nm][1](), **(AMB[nm][2] if len(AMB[nm]) > 2 else {}))
                continue
            key, fn, dur, level, fade = RECIPES[nm][:5]
            extra = dict(comp=RECIPES[nm][6]) if len(RECIPES[nm]) > 6 else {}  # (a recipe may set its own compressor)
            master(fn(), key, dur, level, fade, limit=RECIPES[nm][5] if len(RECIPES[nm]) > 5 else 0.84, **extra)
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
