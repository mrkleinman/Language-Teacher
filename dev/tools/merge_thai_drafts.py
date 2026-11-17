#!/usr/bin/env python3
"""Merge the checked Muay Thai module drafts into the Thai module set and re-embed.

  python3 tools/merge_thai_drafts.py --dry-run          check + report what would change, write nothing
  python3 tools/merge_thai_drafts.py                    check, merge, regenerate the cross-use links, rebuild the embedded data in tt.jsx

Input: thai-modules/drafts-muaythai/MT01..MT08-modules.csv (the writers' output; MT00-sample-modules.csv is a hand-written SAMPLE and is never merged).
Steps (stops at the first failure, nothing half-written):
  1  tools/check_thai_drafts.py on every file: any problem stops the merge
  2  append the rows to thai-modules/thai-modules.csv (columns of that file; fits_words / cell_words are computed; the extra `serves_ids` column is not kept there)
  3  append one row per module to thai-modules/thai-module-links.csv (scene and job from the module; story_safe 0 until a story review, no fact types)
  4  `serves_ids` -> rows of thai-modules/thai-module-word-links.csv with class `author` (the writer's own statement that the module reads naturally for that
     word; the checker already proved the mechanical fit). They survive every later `thai_module_crossuse.py apply`.
  5  python3 tools/thai_module_crossuse.py apply  (safe noun-twin links for the new modules too)  and  python3 tools/build_thai_modules.py  (embeds modules,
     tags and links into tt.jsx)
After it: node build.js tt.jsx tt.compiled.js, then the module tests (tests68, tests99) and the coverage table from `python3 tools/thai_module_crossuse.py need --topic
thai-modules/topic-muay-thai-words.csv`.
"""
import csv, glob, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'thai-modules')
sys.path.insert(0, HERE)
from thai_modules_lib import Data, tier_i, clean


def read_bytes_rows(path):
    return list(csv.DictReader(open(path, encoding='utf-8-sig')))


def append_rows(path, header, rows):
    b = open(path, 'rb').read()
    assert b.startswith(b'\xef\xbb\xbf') and b.endswith(b'\r\n'), path + ' is expected to be UTF-8 BOM + CRLF'
    import io
    buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n')
    for r in rows:
        w.writerow([r.get(h, '') for h in header])
    open(path, 'wb').write(b + buf.getvalue().encode('utf-8'))


def main(argv):
    dry = '--dry-run' in argv
    files = sorted(glob.glob(os.path.join(SRC, 'drafts-muaythai', 'MT0[1-9]-modules.csv')))
    if not files:
        print('no drafts: thai-modules/drafts-muaythai/MT01..MT08-modules.csv'); return 1
    rc = subprocess.call([sys.executable, os.path.join(HERE, 'check_thai_drafts.py')] + files + ['--quiet'])
    if rc:
        print('the drafts have problems: nothing merged'); return 1
    d = Data()
    rows = []
    for f in files:
        rows += read_bytes_rows(f)
    header = list(csv.DictReader(open(os.path.join(SRC, 'thai-modules.csv'), encoding='utf-8-sig')).fieldnames)
    cellw = {}
    for t in d.tags:
        cellw.setdefault(t['subgroup'] or t['group'], []).append(t)
    out, links, wl = [], [], []
    for r in rows:
        cw = [t for t in cellw[r['group']] if tier_i(t['tier']) <= tier_i(r['tier'])]
        ex = {x for x in (r.get('exclude_ids') or '').split(';') if x}
        r['cell_words'] = str(len(cw)); r['fits_words'] = str(len([t for t in cw if t['id'] not in ex]))
        out.append(r)
        links.append({'module_id': r['module_id'], 'tier': r['tier'], 'scene': r['scene'], 'job': r['job'], 'story_safe': '0', 'fact_types': ''})
        for x in [y for y in (r.get('serves_ids') or '').split(';') if y]:
            w = d.byid[x]
            wl.append({'module_id': r['module_id'], 'word_id': x, 'thai': clean(w['thai']), 'module_cell': r['group'], 'word_cell': w['subgroup'] or w['group'],
                       'module_tier': r['tier'], 'word_tier': w['tier'], 'status': 'applied', 'class': 'author', 'score': '30',
                       'note': 'declared by the module writer (serves_ids); mechanical fit checked by tools/check_thai_drafts.py'})
    print('%d modules, %d module-links rows, %d author word links' % (len(out), len(links), len(wl)))
    if dry:
        return 0
    append_rows(os.path.join(SRC, 'thai-modules.csv'), header, out)
    append_rows(os.path.join(SRC, 'thai-module-links.csv'), ['module_id', 'tier', 'scene', 'job', 'story_safe', 'fact_types'], links)
    if wl:
        append_rows(os.path.join(SRC, 'thai-module-word-links.csv'), ['module_id', 'word_id', 'thai', 'module_cell', 'word_cell', 'module_tier', 'word_tier', 'status', 'class', 'score', 'note'], wl)
    subprocess.check_call([sys.executable, os.path.join(HERE, 'thai_module_crossuse.py'), 'apply'])
    subprocess.check_call([sys.executable, os.path.join(HERE, 'build_thai_modules.py')])
    print('merged. Next: node build.js tt.jsx tt.compiled.js ; node tests68.js ; node tests99.js')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
