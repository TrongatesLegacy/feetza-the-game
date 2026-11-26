"""Copy the Act 9 audio into the repo, append its TRIM block and credits (skips anything already credited).
usage: python3 -I integrate9.py SFXDIR MUSICDIR REPO
SFXDIR holds the rendered SFX and report.json (build.py); MUSICDIR holds the music and ambience loops."""
import json
import math
import os
import shutil
import sys

out, mdir, repo = sys.argv[1], sys.argv[2], sys.argv[3]
AUD = os.path.join(repo, 'public/audio')
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/digital-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
# what each sound is (TRIM comment and credit note)
WHAT = {
    'sfx_minotaur_bellow': 'bull bellow (entrance and phase roar)',
    'sfx_minotaur_snort': 'pawing and steam snort (tell)',
    'sfx_minotaur_charge': 'hooves thunder into a charge',
    'sfx_minotaur_gore': 'horns hit a pizza',
    'sfx_minotaur_crash': 'slams into a stone wall',
    'sfx_minotaur_walls': 'maze walls grind and shift',
    'sfx_medusa_glow': 'eyes glow (tell)',
    'sfx_medusa_petrify': 'a pizza turns to stone',
    'sfx_medusa_crack': 'a statue cracks under a stomp',
    'sfx_medusa_crumble': 'a statue crumbles',
    'sfx_medusa_mirror': 'mirror shield appears',
    'sfx_medusa_reflect': 'smack on her reflection',
    'sfx_medusa_cure': 'curse broken on a statue',
    'sfx_medusa_hiss': 'snakes hiss',
    'sfx_medusa_gaze': 'the peel caught by her stare',
    'sfx_cerberus_bark': 'triple bark (entrance)',
    'sfx_cerberus_growl': 'triple growl (tell)',
    'sfx_cerberus_fire': 'fire breath',
    'sfx_cerberus_ice': 'frost blast',
    'sfx_cerberus_poison': 'poison spit',
    'sfx_cerberus_howl': 'a head beaten, the others go wild',
    'sfx_hades_toll': 'death bell (entrance)',
    'sfx_hades_rise': 'a Titan rises from the floor',
    'sfx_hades_chains': 'chains rattle',
    'sfx_hades_tick': 'Kronos clock tick, sits under',
    'sfx_hades_slow': 'time slows (tell)',
    'sfx_hades_shatter': 'hourglass smashed',
    'sfx_hades_tilt': 'Atlas tilts the table (tell)',
    'sfx_hades_slide': 'pizzas slide',
    'sfx_hades_flare': 'Hyperion solar flare',
    'sfx_hades_douse': 'flames smacked out',
    'sfx_hades_banish': 'a Titan sent back',
    'sfx_hades_shadow': 'shadow creeps out',
    'sfx_hades_grab': 'shadow steals a slice',
    'sfx_sirensong': 'Siren Slippers sing, sits under',
    'sfx_harpy': 'Harpy Talons screech and flap',
    'sfx_eyepoke': 'Cyclops Sandals poked in the eye',
    'sfx_whirlpool': 'Charybdis whirlpool opens',
    'sfx_gulp': 'Charybdis swallows',
}
WHO = {'minotaur': 'The Minotaur', 'medusa': 'Medusa', 'cerberus': 'Cerberus', 'hades': 'Hades and the Titans'}
MUSIC = [
    ('music_labyrinth.mp3', 'Teller of the Tales', 'The Labyrinth'),
    ('music_tartarus.mp3', 'Gathering Darkness', 'Tartarus'),
    ('music_boss_minotaur.mp3', 'Five Armies', 'The Minotaur'),
    ('music_boss_medusa.mp3', 'Curse of the Scarab', 'Medusa'),
    ('music_boss_cerberus.mp3', 'Killers', 'Cerberus'),
    ('music_boss_hades.mp3', 'Strength of the Titans', 'Hades and the Titans'),
]
AMB = json.load(open(os.path.join(mdir, 'ambience.json')))  # [{file,title,author,url,notes}]


def who(key):
    part = key.split('_')[1]
    return WHO.get(part, 'Act 9 feet and events')


def credit(d):
    used, syn, key = d['used'], d['syn'], d['key']
    for_ = f"{who(key)}: {WHAT[key]}"
    syn_txt = f'{syn} (original, made for Feetza with ffmpeg and Python, CC0)' if syn else ''
    if not used:
        return dict(file=key + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0,
                    notes=f'{for_}; {syn}, made with ffmpeg and Python and released as CC0')
    if syn and key not in KENNEY_FIRST:
        rest = {}
        for u in used:
            p2, n2 = u.split('/')
            rest.setdefault(p2, []).append(n2)
        parts = ' and '.join(f"{PACK[p2][0]} {', '.join(dict.fromkeys(ns))}" for p2, ns in rest.items())
        return dict(file=key + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0,
                    notes=f'{for_}; {syn}, made with ffmpeg and Python and released as CC0, layered with Kenney {parts} (CC0, kenney.nl)')
    pk, name = used[0].split('/')
    rest = {}
    for u in used[1:]:
        p2, n2 = u.split('/')
        if u != used[0]:
            rest.setdefault(p2, []).append(n2)
    layers = []
    if rest:
        layers.append(' and '.join(f"{PACK[p2][0]} {', '.join(dict.fromkeys(ns))}" for p2, ns in rest.items()) + ' (Kenney, CC0)')
    if syn_txt:
        layers.append(syn_txt)
    notes = for_ + ('; layered with ' + ' and '.join(layers) if layers else '')
    return dict(file=key + '.mp3', title=f'{PACK[pk][0]} ({name})', author='Kenney (kenney.nl)', license='CC0 1.0', url=PACK[pk][1], notes=notes)


# Kenney-led sounds (credited to the Kenney file, synthesis as a layer); everything else is synthesis-led
KENNEY_FIRST = {'sfx_hades_chains', 'sfx_medusa_crack', 'sfx_medusa_reflect', 'sfx_medusa_gaze', 'sfx_minotaur_gore', 'sfx_minotaur_crash',
                'sfx_medusa_crumble', 'sfx_hades_shatter', 'sfx_hades_tilt', 'sfx_hades_grab', 'sfx_eyepoke', 'sfx_hades_douse', 'sfx_cerberus_poison',
                'sfx_hades_tick'}

rep = json.load(open(os.path.join(out, 'report.json')))
assert {d['key'] for d in rep} == set(WHAT), set(WHAT) ^ {d['key'] for d in rep}
# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back (their credits and TRIM entries are
# only ever added when missing, so they are left as they are too).
REAL = {
    'sfx_minotaur_bellow', 'sfx_minotaur_snort', 'sfx_minotaur_charge', 'sfx_minotaur_walls', 'sfx_medusa_glow',
    'sfx_medusa_petrify', 'sfx_medusa_hiss', 'sfx_cerberus_bark', 'sfx_cerberus_growl', 'sfx_cerberus_fire',
    'sfx_cerberus_ice', 'sfx_cerberus_howl', 'sfx_hades_toll', 'sfx_hades_rise', 'sfx_hades_slide', 'sfx_hades_flare',
    'sfx_sirensong', 'sfx_harpy', 'sfx_whirlpool', 'sfx_gulp',
}
for d in rep:
    if d['key'] not in REAL:
        shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(AUD, d['key'] + '.mp3'))
for f, _, _ in MUSIC:
    shutil.copy(os.path.join(mdir, f), os.path.join(AUD, f))
for a in AMB:
    shutil.copy(os.path.join(mdir, a['file']), os.path.join(AUD, a['file']))

# ---- credits.json
jp = os.path.join(AUD, 'credits.json')
cj = json.load(open(jp))
have = {c['file'] for c in cj}
new = []
for f, title, place in MUSIC:
    u = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + title.replace(' ', '%20') + '.mp3'
    new.append(dict(file=f, title=title, author='Kevin MacLeod (incompetech.com)', license='CC-BY 4.0', url=u,
                    attribution=f'"{title}" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/'))
for a in AMB:
    new.append(dict(file=a['file'], title=a['title'], author=a['author'], license='CC0 1.0', url=a['url'], notes=a['notes']))
new += [credit(d) for d in rep]
cj += [c for c in new if c['file'] not in have]
with open(jp, 'w') as fh:
    fh.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

# ---- CREDITS.md: music in the MacLeod list, the rest in the table
mp = os.path.join(AUD, 'CREDITS.md')
md = open(mp).read()
mlines = []
for c in new[:len(MUSIC)]:
    if f"`{c['file']}`" in md:
        continue
    mlines.append(f"- `{c['file']}` — {c['attribution']}  \n  Source: {c['url']}")
if mlines:
    anchor = '\n## Ambience and sound effects'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(mlines) + '\n' + md[i:]
rows = []
for c in new[len(MUSIC):]:
    if f"`{c['file']}`" in md:
        continue
    rows.append(f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | {c['url']} | {c['notes']} |")
anchor = '\nCC0 sounds need no attribution'
i = md.index(anchor)
md = md[:i].rstrip('\n') + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

# ---- TRIM: one appended block before the stings
ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
if 'sfx_minotaur_bellow' not in ts:
    lines = ['  // ——— Act 9 · Greek myths (made by scripts/act9-audio/, same levels as the boss kit above: tells and hits near the',
             '  // slap, signature hits a little over it, repeated ones under it). Feet and Charybdis sounds are core (load at boot).']
    cur = None
    for d in rep:
        w = who(d['key'])
        if w != cur:
            lines.append(f'  // {w}')
            cur = w
        after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
        t = f"{d['trim']:.2f}".rstrip('0')
        t = t + '0' if t.endswith('.') else t
        lines.append(f"  {d['key']}: {t}, // {d['measured']:.1f} dB → {after:.1f}: {WHAT[d['key']]}")
    anchor = '  // Stings are normalised'
    assert anchor in ts
    ts = ts.replace(anchor, '\n'.join(lines) + '\n' + anchor)
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx,', len(MUSIC), 'music,', len(AMB), 'ambience')
