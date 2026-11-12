"""Merge the T1 pilot (remapped) and the 50 writer files into drafts/ALL-modules.csv (one file, unique ids)."""
import csv, glob, collections
def rd(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))
files = ['drafts/T1-modules-remapped.csv'] + sorted(glob.glob('drafts/W[0-9][0-9]-modules.csv')) + sorted(glob.glob('drafts/TOPUP-*-modules.csv'))
rows, hdr = [], None
for f in files:
    r = rd(f)
    if hdr is None: hdr = list(r[0].keys())
    rows += r
ids = collections.Counter(r['module_id'] for r in rows)
dup = [i for i, n in ids.items() if n > 1]
assert not dup, 'duplicate module ids: %s' % dup[:5]
with open('drafts/ALL-modules.csv', 'w', encoding='utf-8-sig', newline='') as o:
    w = csv.DictWriter(o, fieldnames=hdr); w.writeheader(); w.writerows(rows)
print(len(files), 'files,', len(rows), 'modules')
