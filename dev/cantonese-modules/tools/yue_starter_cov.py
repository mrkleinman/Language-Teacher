#!/usr/bin/env python3
"""Coverage of the words of a starter batch after a writer's draft.

Usage: python3 tools/yue_starter_cov.py drafts/starter/SS01.csv drafts/STARTER-SS01-modules.csv

For every word of the batch plan (anchors and `serve` words of every line) it prints how many modules a learner who knows exactly the earlier words (the learner rule of
tools/yue_stage_fit.py) can use: the EXISTING modules of drafts/ALL-modules.csv (non-starter ones) that fit the word and read with the words taught by its position, plus the
starter modules of the draft that fit the word and pass the checker (a starter module that has problems is not counted and is listed). Target: every word has at least 3.
Also lists, per (cell, tier), how many modules the plan asks for (minimum) and how many the draft has. Exit status 1 while any word is below 3.
"""
import csv, sys, collections, os
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
a = sys.argv[1:]
sys.argv = ['x']
import yue_starter_plan as P
Z = P.Z

def main():
    if len(a) < 2: sys.exit(__doc__)
    plan = Z.read_rows(a[0]); draft = [r for r in Z.read_rows(a[1]) if r.get('status', 'ready') == 'ready']
    first, usable, _ = P.usable_existing()
    good, bad, seen = [], [], {}
    for r in draft:
        probs = []
        if not Z.is_starter(r['module_id']): probs.append((r['module_id'], '-', 'not a starter id (-S<nn>)'))
        else: Z.check_row(r, probs, seen)
        probs = [p for p in probs if not p[2].startswith('note:')]
        (bad if probs else good).append((r, probs))
    cnt = collections.Counter()
    fitted = collections.defaultdict(list)
    for r, _ in good:
        for w in Z.fits(r):
            if int(w['rank']) <= Z.STARTER_LAST: cnt[w['id']] += 1; fitted[w['id']].append(r['module_id'])
    ids = collections.OrderedDict()
    for l in plan:
        for k, v in (('anchor', l['anchor_ids']), ('serve', l['serve_ids'])):
            for i in v.split(';'):
                if i: ids.setdefault(i, (k, l['cell'], l['tier']))
    low = 0
    print('status word  position day id  cell tier (anchor = creates the need, serve = counts on the same modules)  existing + starters = total')
    for i, (kind, cell, tier) in sorted(ids.items(), key=lambda kv: int(Z.WORDS[kv[0]]['rank'])):
        w = Z.WORDS[i]; ex = usable.get(i, 0); n = cnt[i]; tot = ex + n
        low += tot < 3
        print(f"{'OK  ' if tot >= 3 else 'LOW '}{w['word']:<6} p{int(w['rank']):<4d} d{(int(w['rank']) - 1) // 5 + 1:<3d} id {i:<5} {cell} {w['tier']} ({kind})  existing {ex} + starters {n} = {tot}")
    print()
    have = collections.Counter((r['group'], r['tier']) for r, _ in good)
    for l in plan:
        k = (l['cell'], l['tier'])
        print(f"{'ok ' if have[k] >= int(l['modules']) else 'few'} {l['cell']} {l['tier']}: plan minimum {l['modules']}, draft has {have[k]} passing")
    extra = sorted({r['group'] for r, _ in good} - {l['cell'] for l in plan})
    if extra: print('modules of cells that are not in this plan:', ' '.join(extra))
    for r, probs in bad:
        print('NOT COUNTED', r['module_id'], '; '.join(f'{f}: {m}' for _, f, m in probs[:3]))
    print(f'words {len(ids)} · below 3: {low} · starter modules passing {len(good)} · with problems {len(bad)}')
    sys.exit(1 if low or bad else 0)

if __name__ == '__main__': main()
