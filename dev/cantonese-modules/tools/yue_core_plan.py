#!/usr/bin/env python3
"""Plan for the missing core words (keys C001..): one row per (cell, tier) that holds core words.
Each core module fits ONLY the core words of its row (every other word of the cell up to that tier is listed in exclude_ids), so it can be written for them alone.
Modules per row: T1/T2 3, T3/T4 2, T5 1 (the same rule as the main plan).  Output drafts/plan/WC.csv"""
import csv, os, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rows = list(csv.DictReader(open(f'{HERE}/cantonese-word-tags.csv', encoding='utf-8-sig')))
live = [r for r in rows if not r['skip']]
T = ['T1', 'T2', 'T3', 'T4', 'T5']; N = {'T1': 3, 'T2': 3, 'T3': 2, 'T4': 2, 'T5': 1}
core = [r for r in live if r['key'].startswith('C')]
out = []
for (cell, tier), ws in sorted(collections.defaultdict(list, {}).items()): pass
g = collections.defaultdict(list)
for r in core: g[(r['subgroup'], r['tier'])].append(r)
for (cell, tier), ws in sorted(g.items()):
    ex = [r['id'] for r in live if r['subgroup'] == cell and T.index(r['tier']) <= T.index(tier) and not r['key'].startswith('C')]
    coreids = {r['id'] for r in ws}
    # core words of a LOWER tier in the same cell also fit a higher-tier module unless excluded: they have their own row, so exclude them here
    ex += [r['id'] for r in core if r['subgroup'] == cell and T.index(r['tier']) < T.index(tier)]
    out.append({'cell': cell, 'tier': tier, 'words': ' '.join(r['word'] for r in ws), 'word_ids': ';'.join(r['id'] for r in ws), 'exclude_ids': ';'.join(ex), 'modules': N[tier]})
with open(f'{HERE}/drafts/plan/WC.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
print('rows', len(out), 'modules', sum(r['modules'] for r in out), 'words', len(core), collections.Counter(r['tier'] for r in out))
