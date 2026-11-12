#!/usr/bin/env python3
"""The pilot (T1) modules were written against the taggers' first subgroup names. The harmonisation moved some T1 words to other subgroups.
This re-points every T1 module to the words' CURRENT subgroups: a module whose words are now in several subgroups is copied into each of them,
excluding the T1 words of that subgroup it was not written for. Output: drafts/T1-modules-remapped.csv"""
import csv, collections, os
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
old = {r['id']: (r['subgroup'] or r['group'], r) for r in csv.DictReader(open(f'{HERE}/drafts/T1-tags.csv', encoding='utf-8-sig')) if not r['skip'].strip()}
new = {r['id']: (r['subgroup'] or r['group']) for r in csv.DictReader(open(f'{HERE}/japanese-word-tags.csv', encoding='utf-8-sig')) if not r['skip'] and r['tier'] == 'T1'}
oldcell = collections.defaultdict(set)
for i, (c, _) in old.items(): oldcell[c].add(i)
newcell = collections.defaultdict(set)
for i, c in new.items(): newcell[c].add(i)
# words that moved from na/noun to adjective etc. had their own exclusion because of the old tags: those exclusions are dropped below
DROP_EXCL = {'56', '164'}
mods = list(csv.DictReader(open(f'{HERE}/drafts/T1-all-modules.csv', encoding='utf-8-sig')))
out = []; counter = collections.Counter(); unmapped = []
for m in mods:
    oc = m['group']
    ex = {x for x in (m['exclude_ids'] or '').replace(',', ';').split(';') if x}
    fit_old = {i for i in oldcell.get(oc, set()) if i not in (ex - DROP_EXCL)}
    # words whose old cell was this one but are now elsewhere map by their new cell
    by_new = collections.defaultdict(set)
    for i in fit_old:
        if i in new: by_new[new[i]].add(i)
    if not by_new: unmapped.append(m['module_id']); continue
    for nc, ids in sorted(by_new.items()):
        r = dict(m)
        counter[nc] += 1
        r['group'] = nc
        r['module_id'] = f'{nc}-T1-{counter[nc]:02d}'
        r['exclude_ids'] = ';'.join(sorted(newcell[nc] - ids, key=int))
        r['belts'] = m['belts']; r['fits_words'] = ''; r['cell_words'] = ''
        out.append(r)
hdr = list(mods[0].keys())
with open(f'{HERE}/drafts/T1-modules-remapped.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=hdr); w.writeheader(); w.writerows(out)
print('modules in', len(mods), 'out', len(out), 'unmapped', unmapped)
