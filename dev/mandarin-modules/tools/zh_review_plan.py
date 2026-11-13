"""Quality-review plan: one fitting word per module (the highest id; two for broad modules fitting 6+ words), split into drafts/review/R01.csv ... (module_id,word_id)."""
import sys, csv, os
sys.path.insert(0, 'tools'); sys.argv = ['x']
import zh_check as Z
rows = Z.read_rows('drafts/ALL-modules.csv'); items = []
for r in rows:
    fw = sorted(Z.fits(r), key=lambda w: int(w['id']))
    if not fw: continue
    pick = [fw[-1]] if len(fw) < 6 else [fw[0], fw[-1]]
    for w in pick: items.append((r['group'], r['module_id'], w['id']))
items.sort(); N = int(os.environ.get('N', 8)); per = (len(items) + N - 1) // N
os.makedirs('drafts/review', exist_ok=True)
for i in range(N):
    part = items[i * per:(i + 1) * per]
    with open('drafts/review/R%02d.csv' % (i + 1), 'w', encoding='utf-8-sig', newline='') as o:
        w = csv.writer(o); w.writerow(['module_id', 'word_id']); [w.writerow([m, wid]) for _, m, wid in part]
    print('R%02d' % (i + 1), len(part), part[0][0], '..', part[-1][0])
