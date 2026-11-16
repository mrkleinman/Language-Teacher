"""Quality-review plan: one fitting word per module (the highest id; two for broad modules fitting 6+ words), split into drafts/review/R01.csv ... (module_id,word_id)."""
import sys, csv, os
sys.path.insert(0, 'tools'); sys.argv = ['x']
import yue_check as Z
rows = Z.read_rows('drafts/ALL-modules.csv'); items = []
for r in rows:
    fw = sorted(Z.fits(r), key=lambda w: int(w['id']))
    if not fw: continue
    pick = [fw[-1]] if len(fw) < 6 else [fw[0], fw[-1]]
    for w in pick: items.append((r['group'], r['module_id'], w['id']))
# early-tier modules (T1/T2 = the first ~950 words, the ones every learner meets) are reviewed first and in smaller files so they can go to the most careful reviewers
mt = {r['module_id']: r['tier'] for r in rows}
items.sort(key=lambda x: (0 if mt[x[1]] in ('T1', 'T2') else 1, x[0], x[1], x[2]))
early = [i for i in items if mt[i[1]] in ('T1', 'T2')]; late = items[len(early):]
NE = int(os.environ.get('NE', 5)); NL = int(os.environ.get('NL', 3))
chunks = [early[i::NE] if False else early[i * ((len(early) + NE - 1) // NE):(i + 1) * ((len(early) + NE - 1) // NE)] for i in range(NE)] + [late[i * ((len(late) + NL - 1) // NL):(i + 1) * ((len(late) + NL - 1) // NL)] for i in range(NL)]
N = len(chunks); per = 0
os.makedirs('drafts/review', exist_ok=True)
for i in range(N):
    part = chunks[i]
    with open('drafts/review/R%02d.csv' % (i + 1), 'w', encoding='utf-8-sig', newline='') as o:
        w = csv.writer(o); w.writerow(['module_id', 'word_id']); [w.writerow([m, wid]) for _, m, wid in part]
    print('R%02d' % (i + 1), len(part), part[0][0], '..', part[-1][0])
