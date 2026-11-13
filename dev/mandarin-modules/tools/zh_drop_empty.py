"""Remove modules that fit no word at all (after exclusions) from the source files."""
import sys, csv, glob, io, os
sys.path.insert(0, 'tools'); sys.argv = ['x']
import zh_check as Z
dead = {r['module_id'] for r in Z.read_rows('drafts/ALL-modules.csv') if not Z.fits(r)}
n = 0
for f in sorted(glob.glob('drafts/W[0-9][0-9]-modules.csv')) + sorted(glob.glob('drafts/ZT[0-9][0-9]-modules.csv')) + sorted(glob.glob('drafts/TOPUP-*-modules.csv')):
    rd = csv.DictReader(open(f, encoding='utf-8-sig', newline='')); hdr = rd.fieldnames; rows = list(rd)
    keep = [r for r in rows if r['module_id'] not in dead]
    if len(keep) != len(rows):
        n += len(rows) - len(keep)
        buf = io.StringIO(newline=''); w = csv.DictWriter(buf, fieldnames=hdr, lineterminator='\r\n'); w.writeheader(); w.writerows(keep)
        tmp = f + '.tmp'; open(tmp, 'w', encoding='utf-8-sig', newline='').write(buf.getvalue()); os.replace(tmp, f)
print('removed', n, 'modules that fit no word:', sorted(dead))
