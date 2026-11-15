#!/usr/bin/env python3
"""Rebuild the embedded Mandarin gap-fill module data in tt.jsx from dev/mandarin-modules/.

Usage (from dev/):  python3 tools/build_zh_modules.py            # merge the module files, rewrite the data line in tt.jsx
                    python3 tools/build_zh_modules.py --check    # only report sizes and counts
                    python3 tools/build_zh_modules.py --fixture  # also (re)write fixtures/zh-modules-equivalence.json (the Python reference for tests86.js)

Sources (single source of truth, never edited here): mandarin-modules/drafts/{W*,ZT*,TOPUP-*}-modules.csv merged by mandarin-modules/tools/zh_merge_modules.py
into ALL-modules.csv, and mandarin-modules/mandarin-word-tags.csv (the word ids are the app's ids: Mandarin saved ids are the list rows). Only `ready` modules are
embedded, and only the words the modules can fill (not the skipped ones, not the 20 Taiwan duplicates left out of the app's list).
Mandarin has no inflection: the slots are {W} (the word as it stands) and {M} (its measure word, only when every fitting word has one). The fixed text of a line is cut
into chunks between the slots; each chunk carries its pinyin, made here from the closed word list (the same dynamic-programming cut zh_check.py uses to prove the
vocabulary), so the app writes a sentence's pinyin without a segmenter: chunk pinyin + the target's own pinyin + the measure word's pinyin.
"""
import base64, csv, gzip, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SRC = os.path.join(ROOT, 'mandarin-modules')
JSX = os.path.join(ROOT, 'tt.jsx')
BEGIN, END = '// ZH_MODULES_DATA_BEGIN', '// ZH_MODULES_DATA_END'
TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
sys.path.insert(0, os.path.join(SRC, 'tools'))
sys.path.insert(0, HERE)
# the 20 left out of the app's list (build_ja_zh_banks.ZH_DROP): read from there so there is one list
import build_ja_zh_banks as BANKS
DROP = {str(i) for i in BANKS.ZH_DROP}
# reading of the free grammar words (zh_check.FREE); a word of the list takes its own pinyin from mandarin-word-tags.csv
FREE_PINYIN = {'的': 'de', '了': 'le', '吗': 'ma', '呢': 'ne', '吧': 'ba', '啊': 'a', '呀': 'ya', '嘛': 'ma', '啦': 'la', '哦': 'ò', '噢': 'ō', '嗯': 'èn', '哎': 'āi', '哇': 'wa',
               '着': 'zhe', '过': 'guo', '地': 'de', '得': 'de', '们': 'men', '一下': 'yíxià', '哈': 'hā', '诶': 'éi', '喔': 'ō'}

# measure words that are not entries of the list (a learner who has not been taught one never gets a module that needs it: the app's closed-vocabulary check refuses it)
MEASURE_PINYIN = {'瓶': 'píng', '列': 'liè', '架': 'jià', '笼': 'lóng', '节': 'jié', '扇': 'shàn', '封': 'fēng', '匹': 'pǐ', '盘': 'pán', '副': 'fù', '串': 'chuàn', '朵': 'duǒ',
                  '株': 'zhū', '顶': 'dǐng', '盏': 'zhǎn'}


def merge():
    subprocess.check_call([sys.executable, os.path.join(SRC, 'tools', 'zh_merge_modules.py')], cwd=SRC, stdout=subprocess.DEVNULL)


def read(p):
    return list(csv.DictReader(open(p, encoding='utf-8-sig')))


def zhc():
    sys.argv = ['x']
    import zh_check as Z
    return Z


def pinyin_table(Z):
    """form -> pinyin: the word list (lowest tier wins a duplicate form), then the free particles."""
    py = {}
    for w in sorted(Z.WORDS.values(), key=lambda w: (TIERS.index(w['tier']), int(w['id']))):
        py.setdefault(w['word'], w['pinyin'])
    py.update(FREE_PINYIN)
    for k, v in MEASURE_PINYIN.items():
        py.setdefault(k, v)
    return py


def encode(mods, Z, py):
    chunks, index, rows = [], {}, []
    punct = re.compile(r'[，。？！、；：…\s,.?!"“”「」（）()\-—·]')

    def chunk(text):
        ok, spans, toks = Z.segment(text, 4)
        assert ok, ('chunk is not covered by the closed list', text, spans)
        # tokens come back as the words that covered the text, punctuation dropped: rebuild the pinyin in text order with the punctuation where it stood
        out, i, ti = [], 0, 0
        while i < len(text):
            if punct.match(text[i]):
                if not text[i].isspace():
                    out.append(text[i])
                i += 1
                continue
            t = toks[ti]
            assert text.startswith(t, i), ('segment order', text, t, i)
            assert t in py, ('no pinyin', t)
            out.append(py[t])
            i += len(t)
            ti += 1
        assert ti == len(toks)
        spec = text + '\x1f' + ' '.join(out)
        if spec not in index:
            index[spec] = len(chunks)
            chunks.append(spec)
        return index[spec]

    for r in mods:
        lines = []
        for f in ('A1', 'B', 'A2'):
            items = []
            for part in re.split(r'(\{[WM]\})', r[f + '_zh'].strip()):
                if not part:
                    continue
                items.append(part if part in ('{W}', '{M}') else chunk(part))
            lines.append(items)
        rows.append(lines)
    return chunks, rows


def build():
    Z = zhc()
    py = pinyin_table(Z)
    tags = read(os.path.join(SRC, 'mandarin-word-tags.csv'))
    mods = [r for r in read(os.path.join(SRC, 'drafts', 'ALL-modules.csv')) if r['status'] == 'ready']
    cells = {r['group'] for r in mods}
    t = {}
    for r in tags:
        cell = r['subgroup'] or r['group']
        if r['skip'] or not r['group'] or cell not in cells or r['id'] in DROP:
            continue
        mw = r['measure_word'].strip()
        t[r['id']] = [r['word'], TIERS.index(r['tier']) + 1, cell, r['english_slot'], r['english_plural'], mw, py.get(mw, '') if mw else '']
        assert not mw or mw in py, ('measure word without pinyin', r['id'], mw)
    chunks, enc = encode(mods, Z, py)
    ex = lambda v: ';'.join(x for x in v.replace(',', ';').split(';') if x and x not in DROP)
    m = [[r['module_id'], r['group'], TIERS.index(r['tier']) + 1, ex(r['exclude_ids']), enc[k][0], r['A1_english'], r['A1_prompt'], enc[k][1], r['B_english'], r['B_prompt'],
          enc[k][2], r['A2_english'], r['A2_prompt'], r['scene'], r['job']] for k, r in enumerate(mods)]
    return {'v': 'z1', 't': t, 'm': m, 'c': chunks}


def fixture():
    """What the Python reference produces: the English fills for every word, and one hash per module over all its fitting words (Mandarin, English, prompt)."""
    Z = zhc()
    en, mods = {}, {}
    for w in Z.WORDS.values():
        if w.get('skip') or not w.get('group') or w['id'] in DROP:
            continue
        en[w['id']] = [Z.fill_en('{E}', w), Z.fill_en('{Es}', w), Z.fill_en('x {a} y {E}', w)]
    for r in Z.read_rows(os.path.join(SRC, 'drafts', 'ALL-modules.csv')):
        h = hashlib.sha1()
        fw = [w for w in Z.fits(r) if w['id'] not in DROP]
        for w in fw:
            for f in ('A1', 'B', 'A2'):
                h.update((Z.fill_zh(r[f + '_zh'], w) + '|' + Z.fill_en(r[f + '_english'], w) + '|' + Z.fill_en(r[f + '_prompt'], w) + '\n').encode('utf-8'))
        mods[r['module_id']] = [len(fw), h.hexdigest()[:16]]
    out = os.path.join(ROOT, 'fixtures', 'zh-modules-equivalence.json')
    json.dump({'en': en, 'mods': mods}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print('fixture', out, 'words', len(en), 'modules', len(mods), 'bytes', os.path.getsize(out))


def main():
    merge()
    d = build()
    raw = json.dumps(d, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    gz = gzip.compress(raw, 9, mtime=0)
    b64 = base64.b64encode(gz).decode('ascii')
    print('words', len(d['t']), 'modules', len(d['m']), 'chunks', len(d['c']), 'json', len(raw), 'gzip', len(gz), 'base64', len(b64))
    if '--fixture' in sys.argv:
        fixture()
    if '--check' in sys.argv:
        return
    s = open(JSX, encoding='utf-8').read()
    block = BEGIN + '\nconst ZH_MODULES_GZ = "' + b64 + '"\n' + END
    if BEGIN in s:
        s = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), lambda _: block, s, flags=re.S)
    else:
        anchor = '// JA_MODULES_DATA_END'
        assert anchor in s
        s = s.replace(anchor, anchor + '\n' + block, 1)
    open(JSX, 'w', encoding='utf-8').write(s)
    print('tt.jsx updated')


main()
