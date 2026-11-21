"""Render the Act 9 SFX with the shared boss-sfx kit (scripts/boss-sfx/dsp.py and render.py).
usage: KENNEY=.../kenney python3 -I build.py OUTDIR [key-substring ...]   (writes OUTDIR/report.json)"""
import json
import multiprocessing as mp
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'boss-sfx'))
sys.path.insert(0, HERE)
import recipes9  # noqa: F401  (registers)
from render import REG, build

OUT = sys.argv[1]
SEL = sys.argv[2:]


def job(i):
    r = REG[i]
    try:
        return build(r, OUT)
    except Exception:
        return dict(key=r['key'], error=traceback.format_exc())


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    idx = [i for i, r in enumerate(REG) if not SEL or any(s in r['key'] for s in SEL)]
    keys = [r['key'] for r in REG]
    dup = {k for k in keys if keys.count(k) > 1}
    if dup:
        sys.exit(f'duplicate keys {dup}')
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
