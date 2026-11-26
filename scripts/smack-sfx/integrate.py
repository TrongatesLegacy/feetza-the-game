"""Copy the peel smack SFX into the repo, credit them, and write their TRIM table.
usage: python3 -I integrate.py OUTDIR REPO
Writes src/systems/smackTrim.ts (merged into TRIM in src/systems/audio.ts).

Each file is held to two targets and the trim meets the stricter: its 50 ms RMS peak (the kit's measure: the
transient) and its EBU R128 momentary loudness (ffmpeg ebur128, the loudest 400 ms, K-weighted: how loud it
sounds, which catches a bright ring or a long tail that the RMS peak misses). The classic slap measures about
-10.5 dB RMS peak after its trims and -20 LUFS momentary; the music sits at -13.5 (game) to -11.5 (boss) LUFS."""
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

FF = '/opt/homebrew/bin/ffmpeg'
# RMS-peak target (the build's level) → momentary-loudness ceiling
LUFS = {-10.5: -19.5, -8.5: -18.0, -12.0: -20.0, -13.5: -22.0, -14.0: -22.5, -15.0: -24.0}
MOMENTARY = re.compile(r' M:\s*(-?[0-9.]+)')


def momentary(path):
    """loudest momentary (400 ms) loudness in LUFS; short files are padded with silence so the window fills."""
    e = subprocess.run([FF, '-nostats', '-v', 'verbose', '-i', path, '-af', 'apad=pad_dur=0.5,ebur128=framelog=verbose', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    return max(float(m) for m in MOMENTARY.findall(e))

PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/digital-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
# the game's own slaps, re-used as the 'skin' family's body
FS = {
    'sfx_slap_1': ('Hitting in a Face', 'florianreichelt (freesound.org)', 'https://freesound.org/people/florianreichelt/sounds/460509/'),
    'sfx_slap_2': ('Punch in the face', 'Huminaatio (freesound.org)', 'https://freesound.org/people/Huminaatio/sounds/390462/'),
    'sfx_slap_3': ('Hitting in a Face', 'florianreichelt (freesound.org)', 'https://freesound.org/people/florianreichelt/sounds/460509/'),
}
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
SYN = 'made with ffmpeg and Python and released as CC0'


def what(key):
    k = key[len('sfx_smack_'):]
    if k.startswith('tail_'):
        return f'Peel smacks: the {k[5:]} signature tail'
    if k.startswith('hero_'):
        return f'Peel smacks: the {k[5:]} peel’s own smack tail'
    fam, take = k.rsplit('_', 1)
    return f'Peel smacks: the {fam} family, {"heavy take (crits)" if take == "heavy" else "take " + take}'


def lst(used):
    by = {}
    for u in used:
        p, nm = u.split('/')
        by.setdefault(p, []).append(nm)
    parts = []
    for p, ns in by.items():
        if p == 'fs':
            parts.append(' and '.join(f'"{FS[x][0]}" by {FS[x][1]} (CC0)' for x in ns))
        else:
            parts.append(f"Kenney {PACK[p][0]} {', '.join(ns)} (CC0)")
    return '; '.join(parts)


def credit(d):
    key, used, syn = d['key'], d['used'], d['syn']
    w = what(key)
    if not used:
        return dict(file=key + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=f'{w}; {syn}, {SYN}')
    first = used[0]
    p, nm = first.split('/')
    if p == 'fs':
        title, author, url = FS[nm]
    else:
        title, author, url = f'{PACK[p][0]} ({nm})', 'Kenney (kenney.nl)', PACK[p][1]
    notes = w
    rest = used[1:]
    if rest:
        notes += f'; layered with {lst(rest)}'
    if syn:
        notes += f'{" and" if rest else "; layered with"} {syn} (original, made for Feetza with ffmpeg and Python, CC0)'
    return dict(file=key + '.mp3', title=title, author=author, license='CC0 1.0', url=url, notes=notes)


out, repo = sys.argv[1], sys.argv[2]
# Tails since re-made from real recordings by scripts/real-sfx/build.py (the audio pass): left as they are, with
# their credits and trims, so running this again doesn't put the synthesized versions back.
REAL = {'sfx_smack_tail_pop', 'sfx_smack_tail_squawk', 'sfx_smack_tail_bell', 'sfx_smack_tail_kinghonk', 'sfx_smack_tail_boing'}
rep = [d for d in json.load(open(os.path.join(out, 'report.json'))) if 'error' not in d and d['key'] not in REAL]
for d in rep:
    shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(repo, 'public/audio', d['key'] + '.mp3'))

cj = os.path.join(repo, 'public/audio/credits.json')
data = [e for e in json.load(open(cj)) if not e['file'].startswith('sfx_smack_') or e['file'][:-4] in REAL]
new = [credit(d) for d in rep]
data += new
json.dump(data, open(cj, 'w'), indent=2, ensure_ascii=False)
open(cj, 'a').write('\n')

md = os.path.join(repo, 'public/audio/CREDITS.md')
text = open(md).read()
text = ''.join(line for line in text.splitlines(True) if not line.startswith('| `sfx_smack_') or line[3:].split('.mp3')[0] in REAL)
rows = ''.join(f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |\n" for c in new)
marker = '\nCC0 sounds need no attribution'
i = text.index(marker)
text = text[:i].rstrip('\n') + '\n' + rows + text[i:]
if 'scripts/smack-sfx/' not in text:
    text = text.replace('`scripts/throw-sfx/` and', '`scripts/throw-sfx/`, `scripts/smack-sfx/` and')
open(md, 'w').write(text)

with ThreadPoolExecutor(8) as ex:
    moms = list(ex.map(lambda d: momentary(os.path.join(repo, 'public/audio', d['key'] + '.mp3')), rep))
for d, m in zip(rep, moms):
    d['lufs'] = round(m, 1)
    d['lufs_target'] = LUFS[d['target']]
    d['trim'] = round(10 ** (min(d['target'] - d['measured'], d['lufs_target'] - m) / 20), 2)

ts = os.path.join(repo, 'src/systems/smackTrim.ts')
old_lines = open(ts).read().splitlines()
kept = {ln.strip().split(':')[0]: ln for ln in old_lines if ln.strip().split(':')[0] in REAL}
order = [ln.strip().split(':')[0] for ln in old_lines if ln.startswith('  sfx_smack_')]
lines = ['// Peel smack sounds (sfx_smack_*): per-file gain trims, generated by scripts/smack-sfx/integrate.py.',
         '// Two targets per file, and the trim meets the stricter: the 50 ms RMS peak (dB) and the loudest 400 ms of',
         '// EBU R128 momentary loudness (LUFS). Takes -10.5 dB / -19.5 LUFS (the classic slap: -10.5 / -20); heavy takes',
         '// -8.5 / -18; tails under the smack: big signatures -12 / -20, hero tails -13.5 / -22, chimes -14 / -22.5,',
         '// the shiny glint -15 / -24. Comments: measured dB, LUFS → targets.',
         'export const SMACK_TRIM: Record<string, number> = {']
made = {d['key']: f"  {d['key']}: {d['trim']:.2f}, // {d['measured']:.1f} dB, {d['lufs']:.1f} LUFS → {d['target']:.1f}, {d['lufs_target']:.1f}" for d in rep}
made.update(kept)
# in the order they had (the kept real-recording tails stay in their places), anything new after them
lines += [made.pop(k) for k in order if k in made] + [made[k] for k in made]
lines.append('};')
open(ts, 'w').write('\n'.join(lines) + '\n')
print(len(new), 'credited,', len(rep), 'trims')
