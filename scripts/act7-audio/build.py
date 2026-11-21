"""Render Act 7's sounds.  usage: KENNEY=... python3 -I build.py OUTDIR [key-substring ...]  (see recipes.py)"""
import json
import multiprocessing as mp
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'boss-sfx'))
import recipes  # noqa: E402,F401  (registers)
from render import REG, build  # noqa: E402

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
    with mp.get_context('fork').Pool(8) as p:
        res = p.map(job, idx)
    for d in res:
        d['where'] = recipes.WHERE.get(d['key'], '')
    json.dump(res, open(os.path.join(OUT, 'report.json'), 'w'), indent=1)
    for d in res:
        if 'error' in d:
            print('ERROR', d['key'], d['error'])
        else:
            print(f"{d['key']:28s} dur={d['dur']:.2f} meas={d['measured']:6.1f} tgt={d['target']:6.1f} trim={d['trim']:.2f} peak={d['peak']:5.1f} lead={d['lead']:4.1f}")
