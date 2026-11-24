"""Copy the sounds of Act 8's last four new feet into the repo, add their credits and TRIM entries.

usage: python3 -I integrate_act8b.py SFX_OUTDIR REPO
The sounds are made with:  KENNEY=/path/to/kenney RECIPES=recipes_act8b python3 -I build.py SFX_OUTDIR
Re-running skips credits and TRIM entries that are already there."""
import json
import math
import os
import shutil
import sys

out, repo = sys.argv[1:3]
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
}
WHO = {'raven': 'Raven Talons', 'skald': 'Skald Slippers', 'dwarf': 'Dwarf-Forged Boots', 'muspel': 'Muspel Fire-Feet'}
# key → what it is (TRIM comment and credit note)
M = {
    'sfx_ravencaw': 'two harsh caws and a beat of wings as it swoops in',
    'sfx_ravensteal': 'a gloating caw over the clink of stolen coin (it swipes your tips)',
    'sfx_ravenhurt': 'a squawk when smacked',
    'sfx_ravendie': 'a caw falling away and a flurry of wings (defeated)',
    'sfx_skaldsong': 'a lyre strum and a sung saga phrase as he arrives',
    'sfx_skaldrally': 'a lyre run and a sung shout as he rallies the feet round him',
    'sfx_skaldhurt': 'a grunt and a jangled string when smacked',
    'sfx_skalddie': 'a string snapping and a last sung note falling away (defeated)',
    'sfx_dwarfspawn': 'an anvil ring, a stamp and a shout as it arrives',
    'sfx_dwarfhurt': 'an iron clank and a grunt when smacked',
    'sfx_dwarfblock': 'the rune-iron shield rings like an anvil as it blocks a smack',
    'sfx_dwarfbreak': 'the rune-iron shield splits and its rune goes out',
    'sfx_dwarfdie': 'a groan, falling armour and a dying anvil ring (defeated)',
    'sfx_muspelspawn': "a roar of flame and a fire giant's growl as it arrives",
    'sfx_muspelhurt': 'cinder cracking and a hiss when smacked',
    'sfx_muspelscorch': 'flames burst up off the pizza it stomped (its scorch)',
    'sfx_muspeldie': 'a dying roar, the fire guttering out and a hiss of steam (defeated)',
}


def who(key):
    return next(v for k, v in WHO.items() if key.startswith('sfx_' + k))


rep = json.load(open(os.path.join(out, 'report.json')))
assert set(M) == {d['key'] for d in rep}, set(M) ^ {d['key'] for d in rep}
dst = os.path.join(repo, 'public/audio')
for d in rep:
    shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(dst, d['key'] + '.mp3'))


def credit(d):
    key = d['key']
    for_ = f"{who(key)}: {M[key]}"
    used = []
    for u in d['used']:
        if u not in used:
            used.append(u)
    if not used:
        return dict(file=key + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0,
                    notes=f"{for_}; {d['syn']}, made with ffmpeg and Python and released as CC0")
    pk, name = used[0].split('/')
    rest = {}
    for u in used[1:]:
        p2, n2 = u.split('/')
        rest.setdefault(p2, []).append(n2)
    layers = []
    if rest:
        layers.append(' and '.join(f"{PACK[p2][0]} {', '.join(ns)}" for p2, ns in rest.items()) + ' (Kenney, CC0)')
    if d['syn']:
        layers.append(f"{d['syn']} (original, made for Feetza with ffmpeg and Python, CC0)")
    return dict(file=key + '.mp3', title=f'{PACK[pk][0]} ({name})', author='Kenney (kenney.nl)', license='CC0 1.0', url=PACK[pk][1],
                notes=for_ + ('; layered with ' + ' and '.join(layers) if layers else ''))


creds = [credit(d) for d in rep]
jp = os.path.join(dst, 'credits.json')
cj = json.load(open(jp))
have = {c['file'] for c in cj}
cj += [c for c in creds if c['file'] not in have]
with open(jp, 'w') as f:
    f.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

mp = os.path.join(dst, 'CREDITS.md')
md = open(mp).read()
rows = [f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |" for c in creds if f"`{c['file']}`" not in md]
if rows:
    i = md.index('\nCC0 sounds need no attribution')
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
if 'sfx_ravencaw' not in ts:
    lines = ['  // Act 8, new Bifröst feet (scripts/act8-sfx/recipes_act8b.py): arrivals and trait moments as tells, hurt',
             '  // sounds low (they play on many smacks), deaths at the slap.']
    for d in rep:
        after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
        t = f"{d['trim']:.2f}".rstrip('0')
        t = t + '0' if t.endswith('.') else t
        lines.append(f"  {d['key']}: {t}, // {d['measured']:.1f} dB → {after:.1f}: {M[d['key']]}")
    anchor = '  // ——— god peels and their feet'
    assert anchor in ts
    ts = ts.replace(anchor, '\n'.join(lines) + '\n' + anchor)
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx')
