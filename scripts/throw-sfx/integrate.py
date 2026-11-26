"""Copy the thrown-prop SFX into the repo and credit them. usage: integrate.py OUTDIR REPO
(TRIM entries in src/systems/audio.ts are written by hand from report.json's trims.)"""
import json
import os
import shutil
import sys

PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/digital-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
WHAT = {
    'sfx_tosssoft': 'a soft prop leaves the peel (tomato, polish, dough, pie, duck)',
    'sfx_tossflick': 'a small hard prop is flicked (toenail, coin, square slice, olive, clutter, rattle)',
    'sfx_tossspin': 'a spinning prop is thrown (plate, flatbread, skateboard, football)',
    'sfx_tossheavy': 'a heavy prop is heaved (dumbbell, cannonball, bowling ball, coconut, can, grenade)',
    'sfx_tossrope': 'a life ring or lasso is swung',
    'sfx_hitsplat': 'a soft prop splats on a foot',
    'sfx_hittink': 'a small hard prop ticks off a foot',
    'sfx_hitcoin': 'a stolen coin bonks a foot',
    'sfx_hitclang': 'a plate, can or skateboard clangs off a foot',
    'sfx_hitbonk': 'a rubbery prop bonks a foot',
    'sfx_hitthud': 'a heavy prop lands on a foot',
    'sfx_hitboom': 'a cannonball or pepper grenade explodes',
    'sfx_hitrope': 'a life ring or lasso snaps tight round a foot',
    'sfx_hitsqueak': 'a rubber duck squeaks off a foot',
    'sfx_hitrattle': 'a rattle bounces off a foot',
    'sfx_rollrumble': 'a bowling ball or pineapple ring rolls along a lane',
    'sfx_beam': 'a beam fires across the screen',
}
# synthesized layer is the main sound for these
SYN_PRIMARY = {'sfx_tosssoft', 'sfx_tossflick', 'sfx_tossspin', 'sfx_tossheavy', 'sfx_tossrope', 'sfx_hitbonk', 'sfx_hitsqueak', 'sfx_rollrumble', 'sfx_hitsplat'}

out, repo = sys.argv[1], sys.argv[2]
rep = json.load(open(os.path.join(out, 'report.json')))
# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back.
REAL = {
    'sfx_hitsplat', 'sfx_hitsqueak', 'sfx_rollrumble', 'sfx_tossrope',
    'sfx_tossheavy',
}
for d in rep:
    if d['key'] in REAL:
        continue
    shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(repo, 'public/audio', d['key'] + '.mp3'))


def kenney_list(used):
    by = {}
    for u in used:
        p, n = u.split('/')
        by.setdefault(p, []).append(n)
    return ' and '.join(f"{PACK[p][0]} {', '.join(ns)}" for p, ns in by.items())


def credit(d):
    k = d['key']
    what = f"Thrown props: {WHAT[k]}"
    used, syn = d['used'], d['syn']
    if syn and k in SYN_PRIMARY:
        notes = f'{what}; {syn}, made with ffmpeg and Python and released as CC0'
        if used:
            notes += f', layered with Kenney {kenney_list(used)} (CC0, kenney.nl)'
        return dict(file=k + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=notes)
    pk, name = used[0].split('/')
    notes = what
    rest = used[1:]
    if rest:
        notes += f'; layered with {kenney_list(rest)} (Kenney, CC0)'
    if syn:
        notes += f'{" and" if rest else "; layered with"} {syn} (original, made for Feetza with ffmpeg and Python, CC0)'
    return dict(file=k + '.mp3', title=f'{PACK[pk][0]} ({name})', author='Kenney (kenney.nl)', license='CC0 1.0', url=PACK[pk][1], notes=notes)


cj = os.path.join(repo, 'public/audio/credits.json')
data = json.load(open(cj))
have = {e['file'] for e in data}
new = [credit(d) for d in rep if d['key'] + '.mp3' not in have]
data += new
json.dump(data, open(cj, 'w'), indent=2, ensure_ascii=False)
open(cj, 'a').write('\n')

md = os.path.join(repo, 'public/audio/CREDITS.md')
text = open(md).read()
rows = ''.join(
    f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |\n" for c in new
)
marker = '\nCC0 sounds need no attribution'
i = text.index(marker)
# rows go at the end of the table (just before the blank line that ends it)
text = text[:i].rstrip('\n') + '\n' + rows + text[i:]
open(md, 'w').write(text)
print(len(new), 'credited')
