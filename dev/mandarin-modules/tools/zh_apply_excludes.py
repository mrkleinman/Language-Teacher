"""Apply the reviewers' 'exclude <word_id>' findings (severity FIX) to the module source files (drafts/W*-modules.csv, drafts/TOPUP-*-modules.csv)."""
import csv, glob, re, collections, os, io
iss = []
for f in sorted(glob.glob('drafts/review/R0*-issues.csv')): iss += list(csv.DictReader(open(f, encoding='utf-8-sig')))
add = collections.defaultdict(set)
for r in iss:
    s = (r['suggested_fix'] or '').strip().lower()
    if r['severity'] == 'FIX' and s.startswith('exclude'):
        for i in re.findall(r'\d+', s): add[r['module_id']].add(i)
        if not re.findall(r'\d+', s): add[r['module_id']].add(r['word_id'])
changed = 0; seen = set()
for f in sorted(glob.glob('drafts/W[0-9][0-9]-modules.csv')) + sorted(glob.glob('drafts/ZT[0-9][0-9]-modules.csv')) + sorted(glob.glob('drafts/TOPUP-*-modules.csv')):
    rd = csv.DictReader(open(f, encoding='utf-8-sig', newline='')); hdr = rd.fieldnames; rows = list(rd); dirty = False
    for r in rows:
        if r['module_id'] in add:
            seen.add(r['module_id'])
            cur = [x for x in (r.get('exclude_ids') or '').replace(',', ';').split(';') if x]
            new = sorted(set(cur) | add[r['module_id']], key=int)
            if new != sorted(set(cur), key=int): r['exclude_ids'] = ';'.join(new); dirty = True; changed += 1
    if dirty:
        buf = io.StringIO(newline=''); w = csv.DictWriter(buf, fieldnames=hdr, lineterminator='\r\n'); w.writeheader(); w.writerows(rows)
        tmp = f + '.tmp'; open(tmp, 'w', encoding='utf-8-sig', newline='').write(buf.getvalue()); os.replace(tmp, f)
print('modules changed', changed, 'of', len(add), 'with exclusion findings; not found:', sorted(set(add) - seen)[:5])
