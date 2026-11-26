"""Copy the Act 10 audio into the repo and credit it.  usage: integrate.py SFXDIR WORKDIR REPO
SFXDIR holds build.py's MP3s and report.json; WORKDIR holds music/ (music.sh, heartbeat.py) and amb/ (ambience.py).
Credits are appended to public/audio/credits.json and CREDITS.md (skipping files already there). The TRIM entries in
src/systems/audio.ts are added by hand from report.json (see the "Act 10 · Finale" block there)."""
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
CCBY = 'http://creativecommons.org/licenses/by/4.0/'
INC = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/'
BOSS = {'mirrorpeel': 'Mirror Peel', 'soleprop': 'The Sole Proprietor', 'ghostfuture': 'Ghost of Feet Future',
        'soleunbound': 'Sole Proprietor Unbound', 'finale': 'Act 10 finale'}
# the Kenney layer is the main sound for these; the rest are credited as original synthesized sounds
KENNEY_PRIMARY = {'sfx_' + k for k in '''mirrorpeel_fire mirrorpeel_interrupt mirrorpeel_shatter mirrorpeel_land mirrorpeel_death
    soleprop_stamp soleprop_agent ghostfuture_paradox soleunbound_krak soleunbound_stone soleunbound_eat soleunbound_montage
    soleunbound_final soleunbound_crack finale_glitch'''.split()}
MUSIC = [  # file, Kevin MacLeod title
    ('music_oven.mp3', 'Echoes of Time'),
    ('music_firstpizzeria.mp3', 'Ancient Rite'),
    ('music_boss_mirrorpeel.mp3', 'Darkling'),
    ('music_boss_soleprop.mp3', 'Hitman'),
    ('music_boss_ghostfuture.mp3', 'Future Gladiator'),
    ('music_boss_soleunbound.mp3', 'Volatile Reaction'),
    ('music_ending.mp3', 'Pixel Peeker Polka - faster'),
]
OWN = [  # original CC0 music/ambience: file, notes
    ('music_heartbeat.mp3', 'The Last Slice: a single slow heartbeat (64 bpm lub-dub with a sub thump) over a faint high '
     'drone and air, a 7.5 s seamless loop synthesized with ffmpeg and Python and released as CC0'),
    ('ambience_oven.mp3', 'The Oven Between Worlds: a synthesized low fire roar, distant cosmic drone, glassy shimmers and '
     'glitch ticks, a 48 s seamless loop made with ffmpeg and Python and released as CC0, with quiet Kenney Interface Sounds '
     'glitch_001, glitch_002, glitch_003 (CC0, kenney.nl)'),
    ('ambience_firstpizzeria.mp3', 'The First Pizzeria: synthesized crickets, soft night wind and a crackling wood fire, a '
     '50 s seamless loop made with ffmpeg and Python and released as CC0, with a soft Kenney Impact Sounds '
     'impactWood_light_001, impactWood_light_003 log settling (CC0, kenney.nl)'),
]

sfxdir, work, repo = sys.argv[1], sys.argv[2], sys.argv[3]
A = os.path.join(repo, 'public/audio')
rep = json.load(open(os.path.join(sfxdir, 'report.json')))
# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back (their credits are only ever added
# when missing, and the TRIM entries are by hand, so both are left as they are too).
REAL = {'sfx_' + k for k in '''soleprop_enter soleprop_voice soleprop_cash soleprop_clock soleprop_bell ghostfuture_rewind
    soleunbound_enter soleunbound_fist soleunbound_frost soleunbound_fire soleunbound_douse'''.split()} | {'ambience_firstpizzeria'}
for d in rep:
    if d['key'] not in REAL:
        shutil.copy(os.path.join(sfxdir, d['key'] + '.mp3'), os.path.join(A, d['key'] + '.mp3'))
for f, _ in MUSIC:
    shutil.copy(os.path.join(work, 'music', f), os.path.join(A, f))
for f, _ in OWN:
    if f[:-4] not in REAL:
        shutil.copy(os.path.join(work, 'music' if f.startswith('music_') else 'amb', f), os.path.join(A, f))


def kenney_list(used):
    by = {}
    for u in used:
        p, nm = u.split('/')
        by.setdefault(p, []).append(nm)
    return ' and '.join(f"{PACK[p][0]} {', '.join(ns)}" for p, ns in by.items())


def credit(d):
    k = d['key']
    what = f"{BOSS[k.split('_')[1]]}: {d['what']}"
    used, syn = d['used'], d['syn']
    if syn and (k not in KENNEY_PRIMARY or not used):
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


def attribution(title):
    return f'"{title}" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License {CCBY}'


music = [dict(file=f, title=t, author='Kevin MacLeod (incompetech.com)', license='CC-BY 4.0',
              url=INC + t.replace(' ', '%20') + '.mp3', attribution=attribution(t)) for f, t in MUSIC]
own = [dict(file=f, title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=nt) for f, nt in OWN]
sfx = [credit(d) for d in rep]

cj = os.path.join(A, 'credits.json')
data = json.load(open(cj))
have = {e['file'] for e in data}
new = [c for c in music + own + sfx if c['file'] not in have]
data += new
with open(cj, 'w') as fh:
    fh.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

md = os.path.join(A, 'CREDITS.md')
text = open(md).read()
mlines = ''.join(f"- `{c['file']}` — {c['attribution']}  \n  Source: {c['url']}\n" for c in music if f"`{c['file']}`" not in text)
if mlines:
    i = text.index('\n## Ambience and sound effects')
    text = text[:i].rstrip('\n') + '\n' + mlines + text[i:]
rows = ''.join(f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |\n"
               for c in own + sfx if f"`{c['file']}`" not in text)
marker = '\nCC0 sounds need no attribution'
i = text.index(marker)
text = text[:i].rstrip('\n') + '\n' + rows + text[i:]
open(md, 'w').write(text)
print(len(new), 'credited;', len(rep), 'sfx,', len(MUSIC), 'music,', len(OWN), 'own loops copied')
