"""Build the Act 9 ambience loops from CC0 Freesound previews (fetched with fsfetch.sh) plus a few synthesized drips.
usage: python3 -I ambience9.py FSDIR OUTDIR
Each layer is decoded to 44.1 kHz stereo, filtered and levelled, mixed, then the tail is crossfaded into the head
(3 s) so the loop is seamless, and the result is loudness-normalised to -16.5 LUFS like the other ambiences (96k MP3)."""
import json
import math
import os
import random
import subprocess
import sys
from array import array

FF = '/opt/homebrew/bin/ffmpeg'
SR = 44100
LEN = 45.0
XF = 3.0
fs, out = sys.argv[1], sys.argv[2]


def layer(src, start, dur, db=0.0, af='anull', loop=False):
    args = [FF, '-v', 'error']
    if loop:
        args += ['-stream_loop', '-1']
    args += ['-ss', str(start), '-t', str(dur), '-i', os.path.join(fs, src), '-af', f'{af},volume={db}dB', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    a = array('f')
    a.frombytes(subprocess.run(args, capture_output=True, check=True).stdout)
    need = int(dur * SR) * 2
    if len(a) < need:
        sys.exit(f'{src}: only {len(a) / 2 / SR:.1f}s from {start}s')
    return a[:need]


def drips(dur, n, seed, db):
    """sparse water drips echoing in stone (original synthesis)."""
    r = random.Random(seed)
    N = int(dur * SR)
    x = array('f', [0.0]) * (N * 2)
    for _ in range(n):
        o = r.randrange(int(0.5 * SR), N - SR)
        f0 = r.uniform(900, 1700)
        pan = r.uniform(0.2, 0.8)
        amp = 10 ** ((db + r.uniform(-6, 0)) / 20)
        L = int(0.09 * SR)
        for echo, ed in ((0, 1.0), (int(0.11 * SR), 0.35), (int(0.23 * SR), 0.15)):
            ph = 0.0
            for j in range(L):
                t = j / SR
                ph += f0 * (1 + 1.2 * t / 0.09) / SR
                v = math.sin(2 * math.pi * ph) * math.exp(-t / 0.018) * amp * ed
                k = o + echo + j
                if k < N:
                    x[k * 2] += v * (1 - pan)
                    x[k * 2 + 1] += v * pan
    return x


def build(name, layers):
    total = LEN + XF
    n = int(total * SR) * 2
    acc = array('f', [0.0]) * n
    for lay in layers:
        for i in range(n):
            acc[i] += lay[i]
    L = int(LEN * SR)
    xf = int(XF * SR)
    body = acc[:L * 2]
    for i in range(xf):
        g = i / xf
        gi, go = math.sin(g * math.pi / 2), math.cos(g * math.pi / 2)
        for c in range(2):
            body[i * 2 + c] = acc[i * 2 + c] * gi + acc[(L + i) * 2 + c] * go
    raw = body.tobytes()
    m = subprocess.run([FF, '-v', 'info', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'loudnorm=I=-16.5:TP=-3:LRA=15:print_format=json',
                        '-f', 'null', '-'], input=raw, capture_output=True).stderr.decode()
    js = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    af = ('loudnorm=I=-16.5:TP=-3:LRA=15:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:'
          'measured_thresh={input_thresh}:offset={target_offset}:linear=true,aresample=44100').format(**js)
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', af, '-c:a', 'libmp3lame', '-b:a', '96k',
                    '-ar', str(SR), os.path.join(out, name)], input=raw, check=True)
    print(name, 'ok')


T = LEN + XF
# The Labyrinth: wind moaning through the stone corridors, a crackling brazier, water dripping somewhere in the maze
build('ambience_labyrinth.mp3', [
    layer('250036.mp3', 20, T, 0, 'highpass=f=60,lowpass=f=7000'),
    layer('483692.mp3', 8, T, -5, 'highpass=f=120'),
    drips(T, 14, 9, -24),
])
# Tartarus: the deep rumble of the pit, a dark cavern drone, the Styx rushing far below
build('ambience_tartarus.mp3', [
    layer('871610.mp3', 4, T, 0, 'lowpass=f=5000'),
    layer('516566.mp3', 30, T, -3, 'anull'),
    layer('523022.mp3', 0, T, -12, 'lowpass=f=1800,aecho=0.6:0.5:120:0.3', loop=True),
])
json.dump([
    dict(file='ambience_labyrinth.mp3', title='mystic wind howling', author='launemax (freesound.org)', url='https://freesound.org/people/launemax/sounds/250036/',
         notes='layered with "torch ambience loop" by LordStirling, https://freesound.org/people/LordStirling/sounds/483692/ (CC0), and synthesized '
               'echoing water drips (original, made for Feetza with Python, CC0); 45 s crossfaded loop'),
    dict(file='ambience_tartarus.mp3', title='Lava Rumble', author='CAT-FOX_ALEX (freesound.org)', url='https://freesound.org/people/CAT-FOX_ALEX/sounds/871610/',
         notes='layered with "Dark Dungeon Ambience" by Kinoton, https://freesound.org/people/Kinoton/sounds/516566/, and a distant, filtered '
               '"Rushing River Loop" by ThanksForTheInspiration, https://freesound.org/people/ThanksForTheInspiration/sounds/523022/ (both CC0); 45 s crossfaded loop'),
], open(os.path.join(out, 'ambience.json'), 'w'), indent=1)
