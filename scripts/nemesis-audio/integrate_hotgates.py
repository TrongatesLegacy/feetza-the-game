"""Copy Leonidas's Hot Gates rendered SFX into the game (KENNEY=... python3 -I build.py OUTDIR immortalbrute xerxes
holdline spear shieldblock hotgates), add one TRIM block and credit them, the music and the ambience.
usage: python3 -I integrate_hotgates.py SFX_OUTDIR REPO

The music and ambience are made straight into public/audio (no TRIM: levelled to -16.4 and -16.6 LUFS):
  python3 -I loops.py music "Achilles.mp3" REPO/public/audio/music_hotgates.mp3 43.55 4 4
  python3 -I loops.py music "Prelude and Action.mp3" REPO/public/audio/music_boss_immortalbrute.mp3 49.57 10 10
  python3 -I loops.py music "The Descent.mp3" REPO/public/audio/music_boss_xerxes.mp3 56.03 20 10
  python3 -I ambience_hotgates.py REPO/public/audio
  (the ambience is now made from real recordings by ../real-sfx/build.py, so ambience_hotgates.py refuses public/audio)
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
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/' + 'digi' + 'tal-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
out, repo = sys.argv[1], sys.argv[2]
rep = [d for d in json.load(open(os.path.join(out, 'report.json'))) if 'error' not in d]
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
CCBY = 'http://creativecommons.org/licenses/by/4.0/'
LOOP = 'a bar-aligned loop with a short crossfade at the loop point'
MUSIC = [
    ('music_hotgates.mp3', 'Achilles', f"Leonidas's nemesis: The Hot Gates (waves 81-85 with the King Leonidas peel); {LOOP}"),
    ('music_boss_immortalbrute.mp3', 'Prelude and Action', f"Leonidas's nemesis: the Immortal Horde and the Immortal Brute (mini-boss, The Hot Gates, wave 83); {LOOP}"),
    ('music_boss_xerxes.mp3', 'The Descent', f"Leonidas's nemesis: Xerxes (boss, The Hot Gates, wave 85); {LOOP}"),
]
AMB = [
    dict(file='ambience_hotgates.mp3', title='Original synthesized ambience', author='Made for Feetza', license='CC0 1.0',
         url='https://creativecommons.org/publicdomain/zero/1.0/',
         notes="Leonidas's nemesis: The Hot Gates: wind moaning through the cliffs, surf breaking on the rocks below, distant war "
               'drums and twice a far-off horn; synthesized with Python and ffmpeg (scripts/nemesis-audio/ambience_hotgates.py), 50 s crossfaded loop'),
]

# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back (their credits and TRIM entries are
# only ever added when missing, so they are left as they are too).
# (all of Tartarus and the Hot Gates: build.py with no selection renders every recipe file into one report)
REAL = {
    'sfx_titanking_enter', 'sfx_titanking_roar', 'sfx_titanking_flip', 'sfx_titanking_tick',
    'sfx_titanking_shatter', 'sfx_titanking_chomp', 'sfx_titanking_chew', 'sfx_titanking_jawhit',
    'sfx_titanking_freed', 'sfx_titanking_chain', 'sfx_titanking_chainbreak', 'sfx_titanking_death',
    'sfx_titanking_strain', 'sfx_titanking_weakhit', 'sfx_titanking_weakbreak', 'sfx_titanking_rip',
    'sfx_titanking_scrape', 'sfx_titanking_unchained', 'sfx_titanking_swing', 'sfx_titanking_bladehit',
    'sfx_titanking_crumble', 'sfx_titanking_rockcrack', 'sfx_titanking_rockfall', 'sfx_titanking_rocksmash',
    'sfx_titanking_rockland', 'sfx_titanking_pierce', 'sfx_titanking_rise', 'sfx_titanking_headchew',
    'sfx_titanking_sink', 'sfx_titanking_gulp', 'sfx_zeus_enter', 'sfx_zeus_thunder', 'sfx_zeus_bolt',
    'sfx_zeus_hurl', 'sfx_zeus_poseidon', 'sfx_zeus_wave', 'sfx_zeus_trident', 'sfx_zeus_ares', 'sfx_zeus_warcry',
    'sfx_zeus_crown', 'sfx_zeus_death', 'sfx_immortalbrute_enter', 'sfx_immortalbrute_horde',
    'sfx_immortalbrute_whirl', 'sfx_immortalbrute_slam', 'sfx_immortalbrute_snag', 'sfx_immortalbrute_roar',
    'sfx_immortalbrute_death', 'sfx_xerxes_enter', 'sfx_xerxes_laugh', 'sfx_xerxes_arrows', 'sfx_xerxes_volley',
    'sfx_xerxes_rhino', 'sfx_xerxes_charge', 'sfx_xerxes_turn', 'sfx_xerxes_elephants', 'sfx_xerxes_death',
    'sfx_hero_holdline', 'sfx_hero_spear', 'sfx_hero_hotgates',
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
    what = f"Leonidas's Hot Gates: {d['where']}"
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


creds = [sfx_credit(d) for d in rep]
music = []
for f, title, where in MUSIC:
    src = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + title.replace(' ', '%20') + '.mp3'
    attr = f'"{title}" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License {CCBY}'
    music.append(dict(file=f, title=title, author='Kevin MacLeod (incompetech.com)', license='CC-BY 4.0', url=src, attribution=attr, notes=where))

jp = os.path.join(repo, 'public/audio/credits.json')
cj = json.load(open(jp))
have = {c['file'] for c in cj}
cj += [c for c in music + AMB + creds if c['file'] not in have]
with open(jp, 'w') as fh:
    fh.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

mp = os.path.join(repo, 'public/audio/CREDITS.md')
md = open(mp).read()
mrows = [f"- `{m['file']}` — {m['attribution']}  \n  Source: {m['url']} ({m['notes']})" for m in music if f"`{m['file']}`" not in md]
if mrows:
    anchor = '\n## Ambience and sound effects'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + "\n<!-- Leonidas's nemesis: The Hot Gates -->\n" + '\n'.join(mrows) + '\n' + md[i:]
rows = [f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |" for c in AMB + creds if f"`{c['file']}`" not in md]
if rows:
    anchor = '\nCC0 sounds need no attribution'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
if 'sfx_immortalbrute_enter' not in ts:
    lines = ["  // ——— Leonidas's nemesis, the Hot Gates (scripts/nemesis-audio/recipes_hotgates.py): the Immortal Brute, Xerxes, "
             "King Leonidas and the Hot Gates variant ———"]
    for d in rep:
        after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
        lines.append(f"  {d['key']}: {d['trim']:.2f}, // {d['measured']:.1f} dB → {after:.1f}: {d['where']}")
    # at the very end of the TRIM table, after the last block
    start = ts.index('const TRIM: Record<string, number> = {')
    end = ts.index('\n};', start) + 1
    ts = ts[:end] + '\n'.join(lines) + '\n' + ts[end:]
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx,', len(music), 'music')
