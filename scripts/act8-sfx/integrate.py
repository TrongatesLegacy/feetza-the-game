"""Copy the Act 8 audio into the repo, add credits and the TRIM block.

usage: python3 -I integrate.py SFX_OUTDIR MUSIC_DIR AMB_DIR REPO
How the files were made (no pip packages; needs ffmpeg and node):
  KENNEY=/path/to/kenney python3 -I build.py SFX_OUTDIR             # recipes_act8.py → sfx MP3s + report.json
  node loopscan.mjs SRC.mp3 MIN MAX [from to]                        # find a loop by rhythm (prints t0/t1)
  node seam.mjs SRC.mp3 t0 t1 0.08                                   # fine-align its end by waveform
  python3 -I loopfind.py SRC.mp3 OUT.mp3 --t0 T0 --t1 T1 [--lufs X]   # crossfaded loop, -16.4 LUFS, 128k
  python3 -I ambience.py AMB_DIR                                     # synthesized ambience beds
Re-running skips credits and TRIM entries that are already there."""
import json
import math
import os
import shutil
import sys

out, mdir, adir, repo = sys.argv[1:5]
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
WHO = {'fenrir': "Fenrir's Paw", 'thrym': 'Thrym the Frost King', 'jormungandr': 'Jörmungandr', 'surtr': 'Surtr'}
FEET = {'sfx_frostchill': 'Frost Giant Toes', 'sfx_trollstone': 'Troll Feet', 'sfx_draugrrise': 'Draugr Boots',
        'sfx_valkyrieswoop': 'Valkyrie-cursed Clogs', 'sfx_sungap': 'the troll sun-gap'}
# key → what it is (TRIM comment and credit note)
M = {
    'sfx_fenrir_strain': 'chain creaks under strain (each smack)',
    'sfx_fenrir_snap': 'Gleipnir snaps',
    'sfx_fenrir_howl': 'wolf howl (entrance, loose)',
    'sfx_fenrir_pounce': 'paw pounces on a pizza',
    'sfx_fenrir_claw': 'frost claw swipe',
    'sfx_fenrir_link': 'a fallen chain link is smacked',
    'sfx_fenrir_bind': 'the chain re-forms',
    'sfx_fenrir_death': 'whimpering howl (death)',
    'sfx_thrym_enter': 'ice cracks and a giant rumble (entrance)',
    'sfx_thrym_freeze': 'a pizza freezes solid',
    'sfx_thrym_thaw': 'ice shell smashed off a pizza',
    'sfx_thrym_block': 'an ice block forms',
    'sfx_thrym_crack': 'ice block takes a hit',
    'sfx_thrym_shatter': 'ice block broken',
    'sfx_thrym_close': 'the fortress walls meet',
    'sfx_thrym_keystone': 'keystone takes a hit',
    'sfx_thrym_blizzard': 'blizzard gust',
    'sfx_thrym_hail': 'falling ice shard',
    'sfx_thrym_spread': 'ice creeps to the next pizza',
    'sfx_thrym_death': 'huge shatter and collapse (death)',
    'sfx_jormungandr_enter': 'deep sea surge (entrance)',
    'sfx_jormungandr_surface': 'the head rises from the water',
    'sfx_jormungandr_hiss': 'serpent hiss (tell)',
    'sfx_jormungandr_bite': 'snapping lunge',
    'sfx_jormungandr_reflect': 'a smack bounces off the coils',
    'sfx_jormungandr_constrict': 'coils squeeze a pizza',
    'sfx_jormungandr_venom': 'venom spit',
    'sfx_jormungandr_dive': 'the head dives back under',
    'sfx_jormungandr_death': 'fading roar and huge splash (death)',
    'sfx_surtr_enter': 'fire giant roar and fire whoosh (entrance)',
    'sfx_surtr_fireball': 'fireball launched',
    'sfx_surtr_impact': 'fireball lands',
    'sfx_surtr_ignite': 'a pizza bursts into flame',
    'sfx_surtr_douse': 'flames smacked out',
    'sfx_surtr_fuse': 'fire runs along the bridge',
    'sfx_surtr_raise': 'sword raised (riser, tell)',
    'sfx_surtr_window': 'the sword flashes: the timing window',
    'sfx_surtr_sweep': 'flaming sword sweeps the table',
    'sfx_surtr_parry': 'perfect counter: the sweep is cancelled',
    'sfx_surtr_roar': 'giant roar',
    'sfx_surtr_death': 'collapse as the fire dies (death)',
    'sfx_frostchill': 'frost creeps over a pizza',
    'sfx_trollstone': 'a troll turns to stone',
    'sfx_draugrrise': 'the dead rise again',
    'sfx_valkyrieswoop': 'a pair of clogs swoops in',
    'sfx_sungap': 'the clouds part',
}
MUSIC = [
    ('music_jotunheim', 'Crusade', 'Crusade.mp3', None, 'Jotunheim Ice Fields'),
    ('music_bifrost', 'Heroic Age', 'Heroic Age.mp3', None, 'Bifröst Bridge'),
    ('music_boss_fenrir', 'Feral Angel Waltz', 'Feral Angel Waltz .mp3', 'Alexander Nakarada', "Fenrir's Paw"),
    ('music_boss_thrym', 'Undaunted', 'Undaunted.mp3', None, 'Thrym the Frost King'),
    ('music_boss_jormungandr', 'Black Vortex', 'Black Vortex.mp3', None, 'Jörmungandr'),
    ('music_boss_surtr', 'Burn The World Waltz', 'Burn The World Waltz .mp3', 'Alexander Nakarada', 'Surtr'),
]
AMB = {
    'ambience_jotunheim': 'Jotunheim Ice Fields: howling glacier wind, creaking ice and the distant groans of the ice; synthesized with Python and ffmpeg (scripts/act8-sfx/ambience.py), 50 s crossfaded loop',
    'ambience_bifrost': 'Bifröst Bridge: thin high-altitude wind, a soft crystalline shimmer, distant rolling thunder and faint crackling fire; synthesized with Python and ffmpeg (scripts/act8-sfx/ambience.py), 50 s crossfaded loop',
}

rep = json.load(open(os.path.join(out, 'report.json')))
assert set(M) == {d['key'] for d in rep}, set(M) ^ {d['key'] for d in rep}
# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back (their credits and TRIM entries are
# only ever added when missing, so they are left as they are too).
REAL = {
    'sfx_fenrir_howl', 'sfx_fenrir_death', 'sfx_thrym_blizzard', 'sfx_thrym_spread', 'sfx_jormungandr_enter',
    'sfx_jormungandr_surface', 'sfx_jormungandr_hiss', 'sfx_surtr_fuse', 'sfx_surtr_raise', 'sfx_surtr_roar',
    'sfx_frostchill', 'ambience_jotunheim', 'ambience_bifrost',
}
dst = os.path.join(repo, 'public/audio')
for d in rep:
    if d['key'] not in REAL:
        shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(dst, d['key'] + '.mp3'))
for k, *_ in MUSIC:
    shutil.copy(os.path.join(mdir, k + '.mp3'), os.path.join(dst, k + '.mp3'))
for k in AMB:
    if k not in REAL:
        shutil.copy(os.path.join(adir, k + '.mp3'), os.path.join(dst, k + '.mp3'))


def who(key):
    return FEET.get(key) or WHO[key.split('_')[1]]


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


creds = [dict(file=k + '.mp3', title='Original synthesized ambience', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=v) for k, v in AMB.items()]
creds += [credit(d) for d in rep]
mcreds = []
for k, title, fn, feat, place in MUSIC:
    by = 'Kevin MacLeod (incompetech.com)' + (f' featuring {feat}' if feat else '')
    url = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + fn.replace(' ', '%20')
    mcreds.append(dict(file=k + '.mp3', title=title, author=by, license='CC-BY 4.0', url=url,
                       attribution=f'"{title}" {by} Licensed under Creative Commons: By Attribution 4.0 License {CCBY}', place=place))

jp = os.path.join(dst, 'credits.json')
cj = json.load(open(jp))
have = {c['file'] for c in cj}
cj += [{k: v for k, v in c.items() if k != 'place'} for c in mcreds if c['file'] not in have]
cj += [c for c in creds if c['file'] not in have]
with open(jp, 'w') as f:
    f.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

mp = os.path.join(dst, 'CREDITS.md')
md = open(mp).read()
mlines = [f"- `{c['file']}` — {c['attribution']}  \n  Source: {c['url']} ({c['place']}; a loopable excerpt with a short crossfade at the loop point)"
          for c in mcreds if f"`{c['file']}`" not in md]
if mlines:
    i = md.index('\n## Ambience and sound effects')
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(mlines) + '\n' + md[i:]
rows = [f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |" for c in creds if f"`{c['file']}`" not in md]
if rows:
    i = md.index('\nCC0 sounds need no attribution')
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
if 'sfx_fenrir_strain' not in ts:
    lines = ['  // ——— Act 8 · Norse ———',
             '  // Boss moves (sfx_<boss>_<move>, loaded a wave ahead of each fight) and the Norse feet (core sounds). Same',
             '  // targets as the other boss sounds: tells and hits -10.5 to -11, signature hits -9.5, repeated ones -13.5.']
    cur = None
    for d in rep:
        grp = who(d['key']) if d['key'] in FEET else WHO[d['key'].split('_')[1]]
        grp = 'Norse feet' if d['key'] in FEET else grp
        if grp != cur:
            lines.append(f'  // {grp}')
            cur = grp
        after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
        t = f"{d['trim']:.2f}".rstrip('0')
        t = t + '0' if t.endswith('.') else t
        lines.append(f"  {d['key']}: {t}, // {d['measured']:.1f} dB → {after:.1f}: {M[d['key']]}")
    anchor = '  // Stings are normalised'
    assert anchor in ts
    ts = ts.replace(anchor, '\n'.join(lines) + '\n' + anchor)
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx,', len(MUSIC), 'music,', len(AMB), 'ambience')
