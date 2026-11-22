"""Act 10 · Finale audio. Everything is regenerated from here (needs ffmpeg; no pip packages):

  bash ../boss-sfx/getpacks.sh /tmp/sfx/kenney                 # Kenney CC0 packs, audio only
  KENNEY=/tmp/sfx/kenney python3 -I build.py OUTDIR [key-substring ...]   # SFX (finale_recipes.py) -> OUTDIR/*.mp3 + report.json
  bash music.sh WORKDIR                                         # Kevin MacLeod loops (musicloop.py) -> WORKDIR/music/
  python3 -I heartbeat.py OUT.mp3                               # "The Last Slice" heartbeat loop
  KENNEY=/tmp/sfx/kenney python3 -I ambience.py OUTDIR          # ambience_oven / ambience_firstpizzeria loops
  python3 -I musicloop.py check FILE.mp3 ...                    # loudness and loop-seam report

SFX levels follow ../boss-sfx/recipes.py (50 ms RMS peak after TRIM); report.json holds the TRIM for each file."""
import json
import multiprocessing as mp
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import finale_recipes  # noqa: E402,F401  (registers)
from render import REG, build  # noqa: E402

OUT = sys.argv[1]
SEL = sys.argv[2:]


def job(i):
    r = REG[i]
    try:
        d = build(r, OUT)
        d['what'] = finale_recipes.WHAT[r['key']]
        return d
    except Exception:
        return dict(key=r['key'], error=traceback.format_exc())


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    keys = [r['key'] for r in REG]
    assert len(set(keys)) == len(keys), 'duplicate keys'
    idx = [i for i, r in enumerate(REG) if not SEL or any(s in r['key'] for s in SEL)]
    with mp.get_context('fork').Pool(8) as p:
        res = p.map(job, idx)
    rp = os.path.join(OUT, 'report.json')
    old = {d['key']: d for d in json.load(open(rp))} if os.path.exists(rp) else {}
    for d in res:
        old[d['key']] = d
    json.dump([old[k] for k in keys if k in old], open(rp, 'w'), indent=1)
    for d in res:
        if 'error' in d:
            print('ERROR', d['key'], d['error'])
        else:
            flag = ' !!' if d['clip'] or d['lead'] > 3 or abs(d['measured'] - max(d['target'], -12)) > 1.0 else ''
            print(f"{d['key']:28s} dur={d['dur']:.2f} meas={d['measured']:6.1f} tgt={d['target']:6.1f} trim={d['trim']:.2f} "
                  f"peak={d['peak']:5.1f} lead={d['lead']:4.1f} clip={d['clip']}{flag}")
    print(len(REG), 'recipes')
