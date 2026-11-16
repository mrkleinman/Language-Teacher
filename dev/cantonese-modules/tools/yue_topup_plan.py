#!/usr/bin/env python3
"""Plan of top-up modules for thin words (fewer fitting modules than the tier asks: T1/T2 3, T3/T4 2, T5 1).
Writes drafts/topup/TUnn.csv (cell,tier,thin_word_ids,thin_words,modules) split into N files by cell. Usage: python3 tools/yue_topup_plan.py [N] [PREFIX] [all3]"""
import sys, os, csv, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); n_files = int(sys.argv[1]) if len(sys.argv) > 1 else 4; PREFIX = sys.argv[2] if len(sys.argv) > 2 else 'TU'; ALL3 = len(sys.argv) > 3 and sys.argv[3] == 'all3'; sys.argv = ['x']
import yue_check as Z
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
rows = Z.read_rows('drafts/ALL-modules.csv'); live = [w for w in Z.WORDS.values() if not w['skip']]
cov = collections.Counter()
for r in rows:
    for w in Z.fits(r):
        if Z.TIERS.index(r['tier']) >= Z.TIERS.index(w['tier']): cov[w['id']] += 1
need = {'T1': 3, 'T2': 3, 'T3': 3, 'T4': 3, 'T5': 3} if ALL3 else {'T1': 3, 'T2': 3, 'T3': 2, 'T4': 2, 'T5': 1}    # 'all3': every word of every tier reaches three modules (2026-11 gap fix, files TVnn)
g = collections.defaultdict(list)
for w in live:
    if cov[w['id']] < need[w['tier']]: g[(w['subgroup'], w['tier'])].append(w)
lines = []
for (cell, tier), ws in sorted(g.items()):
    deficit = max(need[w['tier']] - cov[w['id']] for w in ws)
    lines.append({'cell': cell, 'tier': tier, 'thin_word_ids': ';'.join(w['id'] for w in ws), 'thin_words': ' '.join(w['word'] for w in ws), 'modules': min(3, deficit)})
cells = sorted({l['cell'] for l in lines}); per = (len(cells) + n_files - 1) // n_files
os.makedirs('drafts/topup', exist_ok=True)
for i in range(n_files):
    mine = set(cells[i * per:(i + 1) * per]); part = [l for l in lines if l['cell'] in mine]
    with open('drafts/topup/%s%02d.csv' % (PREFIX, i + 1), 'w', encoding='utf-8-sig', newline='') as o:
        w = csv.DictWriter(o, fieldnames=list(lines[0].keys())); w.writeheader(); w.writerows(part)
    print('%s%02d' % (PREFIX, i + 1), len(part), 'lines', sum(l['modules'] for l in part), 'modules,', sum(len(l['thin_word_ids'].split(';')) for l in part), 'thin words')
