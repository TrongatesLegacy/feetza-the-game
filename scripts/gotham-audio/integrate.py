"""Copy Batpeel's Gotham rendered SFX into the game, add one TRIM block and credit them, the music and the ambience.
usage: python3 -I integrate.py SFX_OUTDIR REPO

The music and ambience are made straight into public/audio (no TRIM: they're levelled to -16.4 and -16.6 LUFS):
  python3 -I loops.py music "Crossing the Chasm.mp3" REPO/public/audio/music_gotham.mp3 57.6 76 4
  python3 -I loops.py music "Metalmania.mp3" REPO/public/audio/music_boss_bunion.mp3 48.0 18 4
  python3 -I loops.py music "Carnivale Intrigue.mp3" REPO/public/audio/music_boss_jokester.mp3 60.63 20 6
  python3 -I ambience.py REPO/public/audio
(ambience_gotham.mp3 is now made from real recordings by scripts/real-sfx/build.py, so ambience.py refuses to render into
public/audio; the sound effects it lists in REAL below are skipped the same way.)
(sources: https://incompetech.com/music/royalty-free/mp3-royaltyfree/<Title>.mp3)"""
import json
import math
import os
import shutil
import sys

PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/digital-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
out, repo = sys.argv[1], sys.argv[2]
rep = [d for d in json.load(open(os.path.join(out, 'report.json'))) if 'error' not in d]
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
CCBY = 'http://creativecommons.org/licenses/by/4.0/'
MUSIC = [
    ('music_gotham.mp3', 'Crossing the Chasm', "Batpeel's Gotham: Goth-Ham Rooftops (waves 61–65 with the Batpeel peel); a bar-aligned loop with a short crossfade at the loop point"),
    ('music_boss_bunion.mp3', 'Metalmania', "Batpeel's Gotham: Bunion (mini-boss, wave 63); a bar-aligned loop with a short crossfade at the loop point"),
    ('music_boss_jokester.mp3', 'Carnivale Intrigue', "Batpeel's Gotham: The Jokester (wave 65); a bar-aligned loop with a short crossfade at the loop point"),
]
AMB = [
    dict(file='ambience_gotham.mp3', title='Original synthesized ambience', author='Made for Feetza', url=CC0,
         notes="Batpeel's Gotham: Goth-Ham Rooftops: steady rain on the rooftop, drips from the gutters, gusts of wind, two distant "
               'thunder rolls and a faint far-off siren; synthesized with Python and ffmpeg (scripts/gotham-audio/ambience.py), 50 s crossfaded loop'),
]

# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back (their credits and TRIM entries are
# only ever added when missing, so they are left as they are too; ambience.py refuses to render into public/audio).
REAL = {
    'sfx_bunion_enter', 'sfx_bunion_pump', 'sfx_bunion_surge', 'sfx_bunion_smash', 'sfx_bunion_tubehit',
    'sfx_bunion_drain', 'sfx_bunion_grab', 'sfx_bunion_strain', 'sfx_bunion_break', 'sfx_bunion_saved',
    'sfx_bunion_death', 'sfx_jokester_enter', 'sfx_jokester_laugh', 'sfx_jokester_toss', 'sfx_jokester_tick',
    'sfx_jokester_boom', 'sfx_jokester_defuse', 'sfx_jokester_gift', 'sfx_jokester_gas', 'sfx_jokester_clear',
    'sfx_jokester_giggle', 'sfx_jokester_jack', 'sfx_jokester_spring', 'sfx_jokester_pie', 'sfx_jokester_splat',
    'sfx_jokester_teeth', 'sfx_jokester_weight', 'sfx_jokester_thud', 'sfx_jokester_bang', 'sfx_jokester_window',
    'sfx_jokester_death', 'sfx_hero_darkfalls',
}
for d in rep:
    if d['key'] not in REAL:
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
    what = f"Batpeel's Gotham: {d['where']}"
    if d['syn']:
        notes = f"{what}; {d['syn']}, made with ffmpeg and Python and released as CC0" + (f', layered with Kenney {kenney} (CC0, kenney.nl)' if kenney else '')
        return dict(file=d['key'] + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=notes)
    p, nm = used[0].split('/')
    rest = {}
    for u in used[1:]:
        p2, n2 = u.split('/')
        rest.setdefault(p2, []).append(n2)
    more = ' and '.join(f"{PACK[p2][0]} {', '.join(ns)}" for p2, ns in rest.items())
    return dict(file=d['key'] + '.mp3', title=f'{PACK[p][0]} ({nm})', author='Kenney (kenney.nl)', license='CC0 1.0', url=PACK[p][1],
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
    md = md[:i].rstrip('\n') + "\n<!-- Batpeel's Gotham -->\n" + '\n'.join(mrows) + '\n' + md[i:]
rows = [f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |" for c in creds if f"`{c['file']}`" not in md]
if rows:
    anchor = '\nCC0 sounds need no attribution'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
if 'sfx_bunion_enter' not in ts:
    lines = ["  // ——— Batpeel's Gotham (nemesis stage, scripts/gotham-audio): Bunion and the Jokester's moves, the Dark Kneader ———"]
    for d in rep:
        after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
        lines.append(f"  {d['key']}: {d['trim']:.2f}, // {d['measured']:.1f} dB → {after:.1f}: {d['where']}")
    # after the last act block (Act 10's finale lines), at the end of the table
    last = ts.index('  sfx_finale_peelwall:')
    eol = ts.index('\n', last) + 1
    assert ts[eol:].startswith('};'), 'expected the TRIM table to end after the finale block'
    ts = ts[:eol] + '\n'.join(lines) + '\n' + ts[eol:]
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx,', len(music), 'music,', len(AMB), 'ambience')
