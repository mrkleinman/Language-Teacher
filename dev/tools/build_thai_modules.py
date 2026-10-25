#!/usr/bin/env python3
"""Rebuild the embedded gap-fill module data in tt.jsx from dev/thai-modules/*.csv.

Usage (from dev/):  python3 tools/build_thai_modules.py            # rewrites the data line in tt.jsx
                    python3 tools/build_thai_modules.py --check    # only reports sizes and counts

Only `ready` modules are embedded (superseded ones are dropped). Word tags are keyed by the app's word id;
the Thai text is kept so the app can confirm a tag really belongs to the word it is filling.
The data is JSON -> gzip -> base64 in one JS string constant between two marker comments.
"""
import base64, csv, gzip, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'thai-modules')
JSX = os.path.join(HERE, '..', 'tt.jsx')
BEGIN, END = '// THAI_MODULES_DATA_BEGIN', '// THAI_MODULES_DATA_END'


def tier(x):
    return int(x[1:])


def build():
    tags = list(csv.DictReader(open(os.path.join(SRC, 'thai-word-tags.csv'), encoding='utf-8-sig')))
    mods = [r for r in csv.DictReader(open(os.path.join(SRC, 'thai-modules.csv'), encoding='utf-8-sig')) if r['status'] == 'ready']
    clean = lambda v: '' if v in ('-', None) else v
    t = {r['id']: [r['thai'], tier(r['tier']), r['group'], clean(r['second_group']), clean(r['subgroup']), clean(r['classifier']),
                   r['english_slot'], r['english_slot_2'], r['english_plural']] for r in tags}
    cols = ['module_id', 'group', 'tier', 'exclude_ids', 'A1_thai', 'A1_english', 'A1_prompt', 'B_thai', 'B_english', 'B_prompt', 'A2_thai', 'A2_english', 'A2_prompt']
    m = [[tier(r[c]) if c == 'tier' else r[c] for c in cols] for r in mods]
    return {'v': 'm1', 't': t, 'm': m}


def main():
    d = build()
    raw = json.dumps(d, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    gz = gzip.compress(raw, 9, mtime=0)
    b64 = base64.b64encode(gz).decode('ascii')
    print('words', len(d['t']), 'modules', len(d['m']), 'json', len(raw), 'gzip', len(gz), 'base64', len(b64))
    if '--check' in sys.argv:
        return
    s = open(JSX, encoding='utf-8').read()
    block = BEGIN + '\nconst THAI_MODULES_GZ = "' + b64 + '"\n' + END
    if BEGIN in s:
        s = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), lambda _: block, s, flags=re.S)
    else:
        raise SystemExit('markers not found in tt.jsx: add ' + BEGIN + ' / ' + END + ' first')
    open(JSX, 'w', encoding='utf-8').write(s)
    print('tt.jsx updated')


main()
