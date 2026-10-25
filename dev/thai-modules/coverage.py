"""Per-word coverage for the merged files.
For each word: modules usable at its OWN tier = module.group is the word's subgroup (or its group when the group is not
split, or its second_group), module.tier == word tier, status != superseded, word id not in exclude_ids.
Thresholds: 3 modules (4 for T1-T2 words) for ordinary groups; X_ per-word groups need 2 (3 for T1) unless listed in a
.skip file (not shipped; see handover).
Usage: python3 coverage.py thai-modules.csv thai-word-tags.csv [--below N] [--group G]
"""
import csv, sys, collections
mods = [r for r in csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')) if r['status'] != 'superseded']
tags = list(csv.DictReader(open(sys.argv[2], encoding='utf-8-sig')))
only = sys.argv[sys.argv.index('--group') + 1] if '--group' in sys.argv else None
by = collections.defaultdict(list)
for r in mods:
    by[(r['group'], r['tier'])].append(set(x for x in r['exclude_ids'].split(';') if x))
res = collections.defaultdict(list)
tot = 0
for w in tags:
    keys = {w['subgroup'] or w['group'], w['group'], w['second_group']} - {'', '-'}
    g = w['group']
    if only and g != only: continue
    n = 0
    for k in keys:
        if k == w['group'] and w['subgroup'] and k != w['subgroup']:
            # unsplit module group name equals group; only count if such modules exist
            pass
        for ex in by.get((k, w['tier']), []):
            if w['id'] not in ex: n += 1
    x = g.startswith('X_')
    need = (3 if w['tier'] == 'T1' else 2) if x else (4 if w['tier'] in ('T1', 'T2') else 3)
    tot += 1
    if n < need: res[g].append((w['id'], w['thai'], w['tier'], n, need))
for g, l in sorted(res.items()):
    print(f'{g}: {len(l)} short:', ', '.join(f'{t}({i},{ti})={n}/{need}' for i, t, ti, n, need in l[:40]))
print('words checked', tot, 'short', sum(len(l) for l in res.values()))
