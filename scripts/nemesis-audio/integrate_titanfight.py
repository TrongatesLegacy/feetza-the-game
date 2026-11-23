"""Copy Kronos the Titan King's reworked-fight SFX into the game (recipes_titanfight.py), add their TRIM lines right after
the Kronos block and credit them next to the other Kronos rows. Skips anything already there.
  KENNEY=... python3 -I build.py OUTDIR titanking_strain titanking_crumble titanking_rock titanking_weak titanking_rip \
      titanking_scrape titanking_unchained titanking_shield titanking_pierce titanking_swing titanking_bladehit \
      titanking_rise titanking_headchew titanking_sink titanking_gulp
  python3 -I integrate_titanfight.py OUTDIR REPO"""
import json
import math
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'boss-sfx'))
os.environ.setdefault('KENNEY', '')
import recipes_titanfight  # noqa: E402,F401  (registers)
from render import REG  # noqa: E402

PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/' + 'digi' + 'tal-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
NEW = [r['key'] for r in REG if r['fn'].__module__ == 'recipes_titanfight']
out, repo = sys.argv[1], sys.argv[2]
rep = {d['key']: d for d in json.load(open(os.path.join(out, 'report.json'))) if 'error' not in d}
rep = [rep[k] for k in NEW if k in rep]
missing = [k for k in NEW if k not in {d['key'] for d in rep}]
if missing:
    sys.exit('not rendered: ' + ', '.join(missing))

for d in rep:
    shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(repo, 'public/audio', d['key'] + '.mp3'))


def sfx_credit(d):
    used = []
    for u in d['used']:
        if u not in used:
            used.append(u)
    groups = {}
    for u in used:
        p, nm = u.split('/')
        groups.setdefault(p, []).append(nm)
    kenney = ' and '.join(f"{PACK[p][0]} {', '.join(ns)}" for p, ns in groups.items())
    what = f"Nemesis bosses: {d['where']}"
    notes = f"{what}; {d['syn']}, made with ffmpeg and Python and released as CC0" + (f', layered with Kenney {kenney} (CC0, kenney.nl)' if kenney else '')
    return dict(file=d['key'] + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=notes)


creds = [sfx_credit(d) for d in rep]
ANCHOR = 'sfx_titanking_death.mp3'

jp = os.path.join(repo, 'public/audio/credits.json')
cj = json.load(open(jp))
have = {c['file'] for c in cj}
add = [c for c in creds if c['file'] not in have]
if add:
    i = next(k for k, c in enumerate(cj) if c['file'] == ANCHOR) + 1
    cj[i:i] = add
    with open(jp, 'w') as fh:
        fh.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

mp = os.path.join(repo, 'public/audio/CREDITS.md')
md = open(mp).read()
rows = [f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |" for c in creds if f"`{c['file']}`" not in md]
if rows:
    s = md.index(f'| `{ANCHOR}` |')
    e = md.index('\n', s) + 1
    md = md[:e] + '\n'.join(rows) + '\n' + md[e:]
    open(mp, 'w').write(md)

ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
lines = []
for d in rep:
    if f"  {d['key']}:" in ts:
        continue
    after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
    lines.append(f"  {d['key']}: {d['trim']:.2f}, // {d['measured']:.1f} dB → {after:.1f}: {d['where']}")
if lines:
    s = ts.index('  sfx_titanking_death:')
    e = ts.index('\n', s) + 1
    ts = ts[:e] + '\n'.join(lines) + '\n' + ts[e:]
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx;', len(add), 'credits.json rows,', len(rows), 'CREDITS.md rows,', len(lines), 'TRIM lines')
