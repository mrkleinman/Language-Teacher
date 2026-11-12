#!/usr/bin/env python3
"""Plan the module writing: for each (cell, tier) with words, how many modules, then split into writer batches of about TARGET modules.
Usage: python3 make_module_batches.py japanese|mandarin [TARGET]"""
import csv, collections, math, sys, os
lang = sys.argv[1]; target = int(sys.argv[2]) if len(sys.argv) > 2 else 110
d = f'{lang}-modules'
rows = [r for r in csv.DictReader(open(f'{d}/{lang}-word-tags.csv', encoding='utf-8-sig')) if not r['skip']]
TI = ['T1', 'T2', 'T3', 'T4', 'T5']
cells = collections.defaultdict(collections.Counter)
for r in rows: cells[r['subgroup'] or r['group']][r['tier']] += 1
plan = []
for g, tc in sorted(cells.items()):
    cum = 0
    for t in TI:
        cum += tc[t]
        if not tc[t]: continue
        own = tc[t]
        if cum >= 10: m = min(24, 8 + math.ceil(cum / 10))
        elif cum >= 5: m = 8
        elif cum >= 3: m = 6
        else: m = 3 * cum if g.startswith('X_') else 6
        if own < cum and not g.startswith('X_'): m = max(6, min(m, 4 + 2 * own + (own >= 5) * 2))
        plan.append((g, t, cum, own, m))
os.makedirs(f'{d}/drafts/write', exist_ok=True)
with open(f'{d}/drafts/write/plan.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['cell', 'tier', 'words_up_to_tier', 'words_at_tier', 'modules']); w.writerows(plan)
# batches: keep all tiers of a cell together when small, keep a (cell,tier) whole; order by cell so an agent sees related cells
skip_t1 = lang == 'japanese'   # the Japanese T1 pilot (442 modules) is already written
plan_sorted = sorted([p for p in plan if not (skip_t1 and p[1] == 'T1')], key=lambda p: (p[0], p[1]))
batches, cur, n = [], [], 0
for p in plan_sorted:
    if n + p[4] > target and cur: batches.append(cur); cur, n = [], 0
    cur.append(p); n += p[4]
if cur: batches.append(cur)
for i, b in enumerate(batches, 1):
    with open(f'{d}/drafts/write/W{i:02d}.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(['cell', 'tier', 'words_up_to_tier', 'words_at_tier', 'modules']); w.writerows(b)
print(lang, 'cell-tier pairs', len(plan), 'modules to write', sum(p[4] for b in batches for p in b), 'batches', len(batches))
