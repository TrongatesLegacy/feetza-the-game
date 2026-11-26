"""Copy the sounds of Act 8's first batch of new feet into the repo, add their credits and TRIM entries.

usage: python3 -I integrate_act8a.py SFX_OUTDIR REPO
The sounds are made with:  KENNEY=/path/to/kenney RECIPES=recipes_act8a python3 -I build.py SFX_OUTDIR
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
WHO = {'wolfpup': 'Wolf-Pup Paws', 'berserker': 'Berserker Boots', 'shieldmaiden': 'Shieldmaiden Sabatons'}
# key → what it is (TRIM comment and credit note)
M = {
    'sfx_wolfpupyip': 'the litter yips as it arrives',
    'sfx_wolfpuphurt': 'a pup yelps when smacked',
    'sfx_wolfpupdie': 'a yelp falling to a whine (defeated)',
    'sfx_berserkerspawn': 'a war cry as it arrives',
    'sfx_berserkerhurt': 'a grunt when smacked',
    'sfx_berserkerrage': 'its berserk roar and war drums (it enrages)',
    'sfx_berserkerdie': 'a dying groan and a heavy fall (defeated)',
    'sfx_shieldmaidenspawn': 'a shield bang, mail and a battle shout as it arrives',
    'sfx_shieldmaidenparry': 'the shield boss rings as it turns a smack aside',
    'sfx_shieldmaidenhurt': 'a grunt and a rattle of mail when smacked',
    'sfx_shieldmaidendie': 'a gasp, armour and her shield falling (defeated)',
}


def who(key):
    return next(v for k, v in WHO.items() if key.startswith('sfx_' + k))


rep = json.load(open(os.path.join(out, 'report.json')))
assert set(M) == {d['key'] for d in rep}, set(M) ^ {d['key'] for d in rep}
# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back (their credits and TRIM entries are
# only ever added when missing, so they are left as they are too).
REAL = {
    'sfx_wolfpupyip',
}
dst = os.path.join(repo, 'public/audio')
for d in rep:
    if d['key'] not in REAL:
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
if 'sfx_wolfpupyip' not in ts:
    lines = ['  // Act 8, new Jotunheim feet (scripts/act8-sfx/recipes_act8a.py): arrivals and trait moments as tells, hurt',
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
