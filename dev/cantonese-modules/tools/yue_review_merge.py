#!/usr/bin/env python3
"""Combine the reviewers' findings (drafts/review/R0N-issues.csv), find each module's source file, apply the 'exclude <id>' fixes to the source files, and write the remaining
FIX findings as drafts/review/FIXnn-findings.csv (one file per fixer, grouped by source file).  Usage: python3 tools/yue_review_merge.py [--apply-excludes] [--fixers N]"""
import csv, glob, os, re, sys, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(HERE)
def rd(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))
src = {}
for f in sorted(glob.glob('drafts/W*-modules.csv')) + sorted(glob.glob('drafts/ZT*-modules.csv')) + sorted(glob.glob('drafts/TOPUP-*-modules.csv')):
    for r in rd(f): src[r['module_id']] = f
issues = []
for f in sorted(glob.glob('drafts/review/R0*-issues.csv')):
    for r in rd(f): r['review_file'] = os.path.basename(f)[:3]; r['source_file'] = src.get(r['module_id'], ''); issues.append(r)
print('findings', len(issues), collections.Counter(r['severity'] for r in issues), 'no source:', sum(1 for r in issues if not r['source_file']))
excl = collections.defaultdict(set)
rest = []
for r in issues:
    m = re.match(r'\s*exclude\s+([0-9; ,]+)', r['suggested_fix'] or '', re.I)
    if m and r['source_file']:
        for i in re.findall(r'\d+', m.group(1)): excl[(r['source_file'], r['module_id'])].add(i)
    elif r['severity'] == 'FIX': rest.append(r)
print('exclude fixes', sum(len(v) for v in excl.values()), 'in', len(excl), 'modules · remaining FIX findings', len(rest))
if '--apply-excludes' in sys.argv:
    byfile = collections.defaultdict(dict)
    for (f, mid), ids in excl.items(): byfile[f][mid] = ids
    for f, mods in byfile.items():
        rows = rd(f); hdr = list(rows[0].keys())
        for r in rows:
            if r['module_id'] in mods:
                ex = [x for x in (r.get('exclude_ids') or '').replace(',', ';').split(';') if x]
                r['exclude_ids'] = ';'.join(ex + [i for i in sorted(mods[r['module_id']], key=int) if i not in ex])
        with open(f, 'w', encoding='utf-8-sig', newline='') as o:
            w = csv.DictWriter(o, fieldnames=hdr); w.writeheader(); w.writerows(rows)
    print('excludes applied to', len(byfile), 'files')
N = int(sys.argv[sys.argv.index('--fixers') + 1]) if '--fixers' in sys.argv else 6
rest.sort(key=lambda r: (r['source_file'], r['module_id']))
mods = list(dict.fromkeys((r['source_file'], r['module_id']) for r in rest))
per = (len(mods) + N - 1) // N
for k in range(N):
    keep = set(mods[k * per:(k + 1) * per])
    part = [r for r in rest if (r['source_file'], r['module_id']) in keep]
    with open(f'drafts/review/FIX{k + 1:02d}-findings.csv', 'w', encoding='utf-8-sig', newline='') as o:
        w = csv.DictWriter(o, fieldnames=['source_file', 'module_id', 'word_id', 'line', 'kind', 'severity', 'problem', 'suggested_fix', 'review_file']); w.writeheader()
        w.writerows([{k2: r.get(k2, '') for k2 in w.fieldnames} for r in part])
    print('FIX%02d' % (k + 1), len(part), 'findings,', len(keep), 'modules')
