"""Coverage of the thin words after a top-up file: python3 tools/ja_topup_cov.py drafts/topup/TUnn.csv drafts/TOPUP-TUnn-modules.csv"""
import sys, csv, collections
sys.path.insert(0, 'tools'); a = sys.argv[1:]; sys.argv = ['x']
import ja_check as J
base = J.read_rows('drafts/ALL-modules.csv'); new = J.read_rows(a[1]) if len(a) > 1 else []
cov = collections.Counter()
for r in base + new:
    for w in J.fits(r): cov[w['id']] += 1
bad = 0
for l in J.read_rows(a[0]):
    for wid in l['thin_word_ids'].split(';'):
        w = J.WORDS[wid]; n = cov[wid]
        print(('OK  ' if n >= 3 else 'LOW ') + l['cell'], l['tier'], w['word'], n); bad += n < 3
print('thin words still below 3:', bad)
