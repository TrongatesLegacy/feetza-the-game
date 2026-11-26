"""Copy the nemesis bosses' and hero variants' rendered SFX into the game, add one TRIM block and credit them and the
boss music.  usage: python3 -I integrate.py SFX_OUTDIR REPO

The music is made straight into public/audio (no TRIM: it's levelled to -16.4 LUFS):
  python3 -I loops.py music "Grim Idol.mp3" REPO/public/audio/music_boss_titanking.mp3 56.7 55 6
  python3 -I loops.py music "Exhilarate.mp3" REPO/public/audio/music_boss_zeus.mp3 56.6 8 6
  python3 -I loops.py music "Movement Proposition.mp3" REPO/public/audio/music_boss_redsole.mp3 45.76 5 4
  python3 -I loops.py music "Aggressor.mp3" REPO/public/audio/music_boss_venomnom.mp3 48.1 20 6
  python3 -I loops.py music "Rites.mp3" REPO/public/audio/music_boss_cheetoe.mp3 50.95 10 6
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
    ('music_boss_titanking.mp3', 'Grim Idol', f"Kratos's nemesis: Kronos the Titan King (mini-boss, Tartarus, wave 88 with the Kratos peel); {LOOP}"),
    ('music_boss_zeus.mp3', 'Exhilarate', f"Kratos's nemesis: Zeus (boss, Tartarus, wave 90 with the Kratos peel); {LOOP}"),
    ('music_boss_redsole.mp3', 'Movement Proposition', f"Captain Pizzeria's nemesis: the Red Sole (mini-boss, The Doom Lab, wave 68); {LOOP}"),
    ('music_boss_venomnom.mp3', 'Aggressor', f"Spider-Pan's nemesis: Venomnom (mini-boss, The Doom Lab, wave 68); {LOOP}"),
    ('music_boss_cheetoe.mp3', 'Rites', f"Wonder Wedge's nemesis: the Cheetoe (mini-boss, Metropizza Rooftops, wave 63); {LOOP}"),
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
    what = f"Nemesis bosses: {d['where']}"
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
cj += [c for c in music + creds if c['file'] not in have]
with open(jp, 'w') as fh:
    fh.write(json.dumps(cj, indent=2, ensure_ascii=False) + '\n')

mp = os.path.join(repo, 'public/audio/CREDITS.md')
md = open(mp).read()
mrows = [f"- `{m['file']}` — {m['attribution']}  \n  Source: {m['url']} ({m['notes']})" for m in music if f"`{m['file']}`" not in md]
if mrows:
    anchor = '\n## Ambience and sound effects'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + "\n<!-- Nemesis bosses (Kratos, Captain Pizzeria, Spider-Pan, Wonder Wedge) -->\n" + '\n'.join(mrows) + '\n' + md[i:]
rows = [f"| `{c['file']}` | {c['title']} | {c['author']} | [CC0 1.0]({CC0}) | {c['url']} | {c['notes']} |" for c in creds if f"`{c['file']}`" not in md]
if rows:
    anchor = '\nCC0 sounds need no attribution'
    i = md.index(anchor)
    md = md[:i].rstrip('\n') + '\n' + '\n'.join(rows) + '\n' + md[i:]
open(mp, 'w').write(md)

ap = os.path.join(repo, 'src/systems/audio.ts')
ts = open(ap).read()
if 'sfx_titanking_enter' not in ts:
    lines = ["  // ——— Nemesis bosses and hero variants (scripts/nemesis-audio): Kronos the Titan King, Zeus, the Red Sole, Venomnom, "
             "the Cheetoe, and the upgraded hero peels ———"]
    for d in rep:
        after = round(d['measured'] + 20 * math.log10(d['trim']), 1)
        lines.append(f"  {d['key']}: {d['trim']:.2f}, // {d['measured']:.1f} dB → {after:.1f}: {d['where']}")
    # at the very end of the TRIM table, after the last block
    start = ts.index('const TRIM: Record<string, number> = {')
    end = ts.index('\n};', start) + 1
    ts = ts[:end] + '\n'.join(lines) + '\n' + ts[end:]
    open(ap, 'w').write(ts)
print('ok', len(rep), 'sfx,', len(music), 'music')
