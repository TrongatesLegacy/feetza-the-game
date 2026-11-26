"""Copy rendered SFX into the repo, add TRIM entries and credits. usage: integrate.py OUTDIR REPO"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mapdata import M

PACK = {
    'imp': ('Impact Sounds', 'https://kenney.nl/assets/impact-sounds'),
    'sci': ('Sci-fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds'),
    'rpg': ('RPG Audio', 'https://kenney.nl/assets/rpg-audio'),
    'dgt': ('Digital Audio', 'https://kenney.nl/assets/digital-audio'),
    'ui': ('Interface Sounds', 'https://kenney.nl/assets/interface-sounds'),
    'uia': ('UI Audio', 'https://kenney.nl/assets/ui-audio'),
    'cas': ('Casino Audio', 'https://kenney.nl/assets/casino-audio'),
}
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
SYN_PRIMARY = {'sfx_' + k for k in '''kit_lane headwaiter_traytoss headwaiter_service bigfoot_ringok bigfoot_bigstep bigfoot_rampage
    sweep_soot sweep_hop ironheel_steam sandcastle_shovel sandcastle_walls clownking_honkwind clownking_decoydrop clownking_pie
    shortorder_bell trex_roar ufotoe_beam ufotoe_twin cosmiccroc_meteor cosmiccroc_blackhole cosmiccroc_holeclose nonna_pin
    gargoyle_swoop gargoyle_stone gargoyle_storm kraken_splash kraken_drag milkshake_freeze rinkqueen_dash yeti_avalanche'''.split()}
BOSS = {
    'kit': 'shared boss kit', 'headwaiter': 'Head Waiter', 'bigfoot': 'Bigfoot', 'sweep': 'Chimney Sweep', 'ironheel': 'Iron Heel',
    'sandcastle': 'Sandcastle Sam', 'clownking': 'King Honk', 'shortorder': 'Short-Order Shoe', 'trex': 'T-Rex Toes',
    'iceskate': 'Ice Skate Ivy', 'colossus': 'The Colossus', 'ufotoe': 'UFO Toe', 'cosmiccroc': 'Cosmic Croc', 'doughboy': 'Dough Boy',
    'nonna': "Nonna's Slipper", 'pigeonking': 'The Pigeon King', 'gargoyle': 'The Gargoyle', 'jellyfish': 'Jellyfish Flip-Flop',
    'kraken': 'Kraken Toes', 'milkshake': 'Milkshake Max', 'rinkqueen': 'Queen of the Rink', 'lumberjack': 'The Lumberjack',
    'yeti': 'The Yeti Ski Boot', 'poltergeist': 'The Zombie Loafer', 'phantomking': 'Phantom King',
}

out, repo = sys.argv[1], sys.argv[2]
rep = json.load(open(os.path.join(out, 'report.json')))
assert set(M) == {d['key'] for d in rep}, set(M) ^ {d['key'] for d in rep}

# ---- files
# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back.
REAL = {
    'sfx_headwaiter_service', 'sfx_sweep_hop', 'sfx_sweep_soot', 'sfx_ironheel_hiss',
    'sfx_ironheel_steam', 'sfx_sandcastle_shovel', 'sfx_sandcastle_walls', 'sfx_sandcastle_pour',
    'sfx_clownking_honkwind', 'sfx_clownking_honk', 'sfx_clownking_leap', 'sfx_clownking_decoydrop',
    'sfx_shortorder_bell', 'sfx_shortorder_rush', 'sfx_trex_roar', 'sfx_trex_growl',
    'sfx_trex_breath', 'sfx_trex_dinosqueak', 'sfx_iceskate_axel', 'sfx_iceskate_snow',
    'sfx_bigfoot_bigstep', 'sfx_bigfoot_rampage',
}
for d in rep:
    if d['key'] in REAL:
        continue
    shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(repo, 'public/audio', d['key'] + '.mp3'))


# ---- credits
def credit(d):
    used = d['used']
    syn = d['syn']
    for_ = f"{BOSS[d['key'].split('_')[1]]}: {M[d['key']][0]}"
    if used and d['key'] in SYN_PRIMARY:
        rest = {}
        for u in used:
            p2, n2 = u.split('/')
            rest.setdefault(p2, []).append(n2)
        parts = ' and '.join(f"{PACK[p2][0]} {', '.join(ns)}" for p2, ns in rest.items())
        return dict(file=d['key'] + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0,
                    notes=f'{for_}; {syn}, made with ffmpeg and Python and released as CC0, layered with Kenney {parts} (CC0, kenney.nl)')
    if used:
        pk, name = used[0].split('/')
        title = f'{PACK[pk][0]} ({name})'
        rest = {}
        for u in used[1:]:
            p2, n2 = u.split('/')
            rest.setdefault(p2, []).append(n2)
        parts = [f"{PACK[p2][0]} {', '.join(ns)}" for p2, ns in rest.items()]
        layers = []
        if parts:
            layers.append(' and '.join(parts) + ' (Kenney, CC0)')
        if syn:
            layers.append(f'{syn} (original, made for Feetza with ffmpeg and Python, CC0)')
        notes = for_ + ('; layered with ' + ' and '.join(layers) if layers else '')
        return dict(file=d['key'] + '.mp3', title=title, author='Kenney (kenney.nl)', license='CC0 1.0', url=PACK[pk][1], notes=notes)
    return dict(file=d['key'] + '.mp3', title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0,
                notes=f'{for_}; {syn}, made with ffmpeg and Python and released as CC0')


creds = [credit(d) for d in rep]
jp = os.path.join(repo, 'public/audio/credits.json')
cj = json.load(open(jp))
have = {c['file'] for c in cj}
cj += [c for c in creds if c['file'] not in have]
with open(jp, 'w') as f:
    f.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

mp = os.path.join(repo, 'public/audio/CREDITS.md')
md = open(mp).read()
rows = []
for c in creds:
    if f"`{c['file']}`" in md:
        continue
    url = c['url']
    author = c['author']
    rows.append(f"| `{c['file']}` | {c['title']} | {author} | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | {url} | {c['notes']} |")
anchor = '\nCC0 sounds need no attribution'
i = md.index(anchor)
head = md[:i].rstrip('\n')
md = head + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

# ---- TRIM
ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
lines = ['  // Boss set-piece moves (sfx_<boss>_<move>) and the shared boss kit (sfx_kit_*). Each file is normalised to about',
         '  // -12 dB or louder; the trim sets its final level: tells and hits near the slap (-10.5 to -11), signature hits a',
         '  // little over it (-9.5), mashable or repeated hits under it (-13.5), and long beds/risers further under (-14.5).']
cur = None
for d in rep:
    boss = d['key'].split('_')[1]
    if boss != cur:
        lines.append(f'  // {BOSS[boss]}')
        cur = boss
    after = round(d['measured'] + 20 * __import__('math').log10(d['trim']), 1)
    t = f"{d['trim']:.2f}".rstrip('0')
    t = t + '0' if t.endswith('.') else t
    lines.append(f"  {d['key']}: {t}, //{d['measured']:.1f} dB → {after:.1f}: {M[d['key']][0]}")
block = '\n'.join(lines) + '\n'
anchor = '  // Stings are normalised'
assert anchor in ts
if 'sfx_kit_prophit' not in ts:
    ts = ts.replace(anchor, block + anchor)
open(ap, 'w').write(ts)
print('ok', len(rep))
