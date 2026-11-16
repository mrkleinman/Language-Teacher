"""Merge the Cantonese writer files (W01-W21 and the core batches WC1-WC3) into drafts/ALL-modules.csv (one file, unique ids).
The missing core words (tag keys C001 ...) have their own WC modules: every ordinary module gets the core ids added to exclude_ids, so a core word is only ever served by a WC module."""
import csv, glob, collections
def rd(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))
CORE_TOPUP = 'drafts/TOPUP-TU05-modules.csv'        # the core-word top-up serves core words only
# the 2026-11 top-up (TV01-TV08) covers EVERY thin word, core words included: its writers list the words a module must not fit in exclude_ids themselves, so nothing is added to them
# (adding the core ids would leave a module written for a core word such as 肯 or 啩 fitting no word at all)
SELF_EXCLUDING = sorted(glob.glob('drafts/TOPUP-TV[0-9][0-9]-modules.csv'))
ordinary = sorted(glob.glob('drafts/W[0-9][0-9]-modules.csv')) + sorted(glob.glob('drafts/ZT[0-9][0-9]-modules.csv')) + [f for f in sorted(glob.glob('drafts/TOPUP-*-modules.csv')) if f != CORE_TOPUP and f not in SELF_EXCLUDING]
corefiles = sorted(glob.glob('drafts/WC[0-9]-modules.csv')) + ([CORE_TOPUP] if glob.glob(CORE_TOPUP) else []) + SELF_EXCLUDING
core = {t['id'] for t in rd('cantonese-word-tags.csv') if t['key'].startswith('C')}
rows, hdr, added = [], None, 0
for f in ordinary + corefiles:
    r = rd(f)
    if not r: continue
    if hdr is None: hdr = list(r[0].keys())
    if f in ordinary:
        for x in r:
            ex = [e for e in (x.get('exclude_ids') or '').replace(',', ';').split(';') if e]
            new = [c for c in sorted(core, key=int) if c not in ex]
            if new: x['exclude_ids'] = ';'.join(ex + new); added += 1
    rows += r
ids = collections.Counter(r['module_id'] for r in rows)
dup = [i for i, n in ids.items() if n > 1]
assert not dup, 'duplicate module ids: %s' % dup[:5]
with open('drafts/ALL-modules.csv', 'w', encoding='utf-8-sig', newline='') as o:
    w = csv.DictWriter(o, fieldnames=hdr); w.writeheader(); w.writerows(rows)
print(len(ordinary) + len(corefiles), 'files,', len(rows), 'modules;', added, 'ordinary modules got the core ids excluded')
