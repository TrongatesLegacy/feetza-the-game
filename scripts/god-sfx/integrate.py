"""Copy the god SFX into the repo, credit them (CREDITS.md and credits.json), and write their TRIM block in
src/systems/audio.ts. Every layer is synthesized in build.py, so each one is CC0.
usage: integrate.py OUTDIR REPO"""
import json
import os
import re
import shutil
import sys

CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'

WHAT = {
    'zeus': 'Zeus’s Wrath of Olympus', 'decree': 'Hera’s Queen’s Decree', 'earthshaker': 'Poseidon’s Earthshaker',
    'harvest': 'Demeter’s Harvest', 'aegis': 'Athena’s Aegis', 'chariot': 'Apollo’s Sun Chariot', 'moon': 'Artemis’s Hunter’s Moon',
    'warcry': 'Ares’s War Cry', 'charm': 'Aphrodite’s Charm', 'forge': 'Hephaestus’s Forge', 'spark': 'a spark off Hephaestus’s anvil',
    'messenger': 'Hermes’s Messenger', 'dart': 'a quick darting strike (Hermes, Freya)', 'revel': 'Dionysus’s Revel', 'hearth': 'Hestia’s Hearth',
    'underworld': 'Hades’s Underworld', 'spring': 'Persephone’s Spring Returns', 'wings': 'Nike’s Victory Wings', 'nightfall': 'Nyx’s Nightfall',
    'spartaaa': 'the Kratos Peel’s “This Is Spartaaa!” shout', 'rage': 'the Kratos Peel’s roaring fire loop while enraged',
    'flamesmack': 'an enraged, flaming smack (the Kratos Peel)', 'ragehiss': 'the Kratos Peel’s rage hisses out', 'blade': 'the Kratos Peel’s Spinning Blade hits',
    'allfather': 'Odin’s Allfather', 'thundergod': 'Thor’s Thunder God', 'mjolnir': 'Thor’s hammer thrown', 'mischief': 'Loki’s Mischief',
    'foresight': 'Frigg’s Foresight', 'falcon': 'Freya’s Falcon Cloak', 'boar': 'Freyr’s Golden Boar', 'oath': 'Tyr’s Oath', 'gjallarhorn': 'Heimdall’s Gjallarhorn',
    'radiance': 'Baldur’s Radiance', 'halfdeath': 'Hel’s Half-Death', 'seawind': 'Njord’s Sea Wind', 'winterhunt': 'Skadi’s Winter Hunt',
    'freeze': 'a Winter Hunt smack freezes a foot', 'apples': 'Idun’s Golden Apples', 'saga': 'Bragi’s Saga', 'verse': 'Bragi’s Skald verse',
}
OTHER = {
    'sfx_divinefeast': 'The God Peel: Divine Feast',
    'sfx_godreveal': 'The God Peel: its first-unlock reveal (a choir sting)',
    'sfx_trumpet': 'Persian Elephant Feet trumpet as they dive',
    'sfx_spartanroar': 'Spartan Sandals roar as they enrage',
    'sfx_bronzeshield': 'a bronze shield is raised (Spartan Sandals, Persian Elephant Feet)',
}


def what(key):
    if key in OTHER:
        return OTHER[key]
    return 'God peels: ' + WHAT.get(key.replace('sfx_hero_', ''), key)


out, repo = sys.argv[1], sys.argv[2]
rep = [d for d in json.load(open(os.path.join(out, 'report.json'))) if 'error' not in d]
# Files since re-made from real recordings by scripts/real-sfx/build.py (the audio pass, docs/audio-audit.md): not
# copied over, so running this again doesn't put the synthesized versions back (their credits and TRIM entries are
# only ever added when missing, so they are left as they are too).
REAL = {
    'sfx_trumpet', 'sfx_spartanroar', 'sfx_bronzeshield',
    # batch 7: the god peels' charged moves
    'sfx_hero_zeus', 'sfx_hero_decree', 'sfx_hero_earthshaker', 'sfx_hero_harvest', 'sfx_hero_aegis',
    'sfx_hero_chariot', 'sfx_hero_warcry', 'sfx_hero_charm', 'sfx_hero_forge', 'sfx_hero_spark', 'sfx_hero_messenger',
    'sfx_hero_revel', 'sfx_hero_hearth', 'sfx_hero_underworld', 'sfx_hero_spring', 'sfx_hero_wings',
    'sfx_hero_spartaaa', 'sfx_hero_rage', 'sfx_hero_flamesmack', 'sfx_hero_ragehiss', 'sfx_hero_blade',
    'sfx_hero_allfather', 'sfx_hero_thundergod', 'sfx_hero_mjolnir', 'sfx_hero_mischief', 'sfx_hero_falcon',
    'sfx_hero_boar', 'sfx_hero_oath', 'sfx_hero_gjallarhorn', 'sfx_hero_radiance', 'sfx_hero_halfdeath',
    'sfx_hero_seawind', 'sfx_hero_winterhunt', 'sfx_hero_freeze', 'sfx_hero_saga', 'sfx_hero_verse',
}
for d in rep:
    if d['key'] not in REAL:
        shutil.copy(os.path.join(out, d['key'] + '.mp3'), os.path.join(repo, 'public/audio', d['key'] + '.mp3'))

# credits
md_path = os.path.join(repo, 'public/audio/CREDITS.md')
md = open(md_path).read()
js_path = os.path.join(repo, 'public/audio/credits.json')
js = json.load(open(js_path))
have = {e['file'] for e in js}
rows = []
for d in rep:
    f = d['key'] + '.mp3'
    notes = f"{what(d['key'])}; {d['syn']}, made with ffmpeg and Python and released as CC0"
    if f not in have:
        js.append(dict(file=f, title='Original synthesized sound', author='Made for Feetza', license='CC0 1.0', url=CC0, notes=notes))
    if f'`{f}`' not in md:
        rows.append(f'| `{f}` | Original synthesized sound | Made for Feetza | [CC0 1.0]({CC0}) | {CC0} | {notes} |')
json.dump(js, open(js_path, 'w'), indent=2, ensure_ascii=False)
open(js_path, 'a').write('\n')
if rows:
    # straight after the last hero row, so they sit in the same table
    lines = md.split('\n')
    last = max(i for i, l in enumerate(lines) if l.startswith('| `sfx_hero_'))
    lines[last + 1:last + 1] = rows
    open(md_path, 'w').write('\n'.join(lines))

# TRIM block
au_path = os.path.join(repo, 'src/systems/audio.ts')
au = open(au_path).read()
block = ['  // ——— god peels and their feet (generated by scripts/god-sfx/integrate.py) ———']
for d in rep:
    if re.search(rf"^\s*{d['key']}:", au, re.M):
        continue
    block.append(f"  {d['key']}: {d['trim']:.2f}, // {d['measured']:.1f} dB → {d['target']:.1f}")
if len(block) > 1:
    anchor = '  // ——— hero peels (generated by scripts/hero-sfx/integrate.py) ———'
    assert anchor in au
    au = au.replace(anchor, '\n'.join(block) + '\n' + anchor)
    open(au_path, 'w').write(au)
print(len(rep), 'sounds,', len(rows), 'credit rows,', len(block) - 1, 'trims')
