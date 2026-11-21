"""Copy Act 7's rendered SFX into the game, add one TRIM block and credit them, the music and the ambience.
usage: python3 -I integrate.py SFX_OUTDIR REPO   (music and ambience are written straight to public/audio by loops.py)"""
import json
import math
import os
import shutil
import sys

out, repo = sys.argv[1], sys.argv[2]
rep = [d for d in json.load(open(os.path.join(out, 'report.json'))) if 'error' not in d]
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
CCBY = 'http://creativecommons.org/licenses/by/4.0/'
PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/digital-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
MUSIC = [
    ('music_metropizza.mp3', 'Heroic Age', 'Metropizza Rooftops (waves 61–64)'),
    ('music_doomlab.mp3', 'Gearhead', 'The Doom Lab (waves 66–69)'),
    ('music_boss_lexlugtoe.mp3', 'Hitman', 'Lex Lugtoe (mini-boss, wave 63)'),
    ('music_boss_doomstomp.mp3', 'Killers', 'Doomstomp (wave 65)'),
    ('music_boss_ultoe.mp3', 'Mechanolith', 'Ultoe (mini-boss, wave 68)'),
    ('music_boss_thanfoot.mp3', 'Final Battle of the Dark Wizards', 'Thanfoot (wave 70)'),
]
AMB = [
    dict(file='ambience_metropizza.mp3', title='Ambience_Berlin_Rooftop.wav', author='danner (freesound.org)', url='https://freesound.org/people/danner/sounds/426894/',
         notes='Metropizza Rooftops; layered with "201110 Distant sirens, urban, night, quiet, roof 11pm.flac" by TRP, https://freesound.org/people/TRP/sounds/568975/ (CC0); 50 s crossfaded loop'),
    dict(file='ambience_doomlab.mp3', title='Kaiju Lab Interior Ambience #1.wav', author='Vortex4 (freesound.org)', url='https://freesound.org/people/Vortex4/sounds/191852/',
         notes='The Doom Lab; layered with "Bubbling beaker.wav" by Melthurian, https://freesound.org/people/Melthurian/sounds/319384/, and "Electricity Ambience 2" by PureAudioNinja, https://freesound.org/people/PureAudioNinja/sounds/341617/ (both CC0); 50 s crossfaded loop'),
]

for d in rep:
    shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(repo, 'public/audio', d['key'] + '.mp3'))


def sfx_credit(d):
    used = []
    for u in d['used']:
        if u not in used:
            used.append(u)
    groups = {}
    for u in used:
        p, n = u.split('/')
        groups.setdefault(p, []).append(n)
    kenney = ' and '.join(f"{PACK[p][0]} {', '.join(ns)}" for p, ns in groups.items())
    what = f"Act 7: {d['where']}"
    if d['syn']:
        notes = f"{what}; {d['syn']}, made with ffmpeg and Python and released as CC0" + (f', layered with Kenney {kenney} (CC0, kenney.nl)' if kenney else '')
        return dict(file=d['key'] + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=notes)
    p, n = used[0].split('/')
    rest = {}
    for u in used[1:]:
        p2, n2 = u.split('/')
        rest.setdefault(p2, []).append(n2)
    more = ' and '.join(f"{PACK[p2][0]} {', '.join(ns)}" for p2, ns in rest.items())
    return dict(file=d['key'] + '.mp3', title=f'{PACK[p][0]} ({n})', author='Kenney (kenney.nl)', license='CC0 1.0', url=PACK[p][1],
                notes=what + (f'; layered with {more} (Kenney, CC0)' if more else ''))


creds = [sfx_credit(d) for d in rep] + [dict(a, license='CC0 1.0') for a in AMB]
music = []
for f, title, where in MUSIC:
    src = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + title.replace(' ', '%20') + '.mp3'
    attr = f'"{title}" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License {CCBY}'
    music.append(dict(file=f, title=title, author='Kevin MacLeod (incompetech.com)', license='CC-BY 4.0', url=src, attribution=attr, notes=where))

jp = os.path.join(repo, 'public/audio/credits.json')
cj = json.load(open(jp))
have = {c['file'] for c in cj}
cj += [c for c in music + creds if c['file'] not in have]
with open(jp, 'w') as fh:
    fh.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

mp = os.path.join(repo, 'public/audio/CREDITS.md')
md = open(mp).read()
mrows = [f"- `{m['file']}` — {m['attribution']}  \n  Source: {m['url']} ({m['notes']})" for m in music if f"`{m['file']}`" not in md]
if mrows:
    anchor = '\n## Ambience and sound effects'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + '\n<!-- Act 7 · Comics -->\n' + '\n'.join(mrows) + '\n' + md[i:]
rows = [f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |" for c in creds if f"`{c['file']}`" not in md]
if rows:
    anchor = '\nCC0 sounds need no attribution'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
if 'sfx_doomstomp_roar' not in ts:
    lines = ['  // ——— Act 7 · Comics (scripts/act7-audio): the act\'s weather and villain feet, then each boss\'s moves ———']
    for d in rep:
        after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
        t = f"{d['trim']:.2f}"
        lines.append(f"  {d['key']}: {t}, // {d['measured']:.1f} dB → {after:.1f}: {d['where']}")
    anchor = '  // Stings are normalised'
    ts = ts.replace(anchor, '\n'.join(lines) + '\n' + anchor)
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx,', len(music), 'music,', len(AMB), 'ambience')
