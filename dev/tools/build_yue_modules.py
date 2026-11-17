#!/usr/bin/env python3
"""Rebuild the embedded Cantonese gap-fill module data in tt.jsx from dev/cantonese-modules/.

Usage (from dev/):  python3 tools/build_yue_modules.py            # merge the module files, rewrite the data block in tt.jsx
                    python3 tools/build_yue_modules.py --check    # only report sizes and counts (nothing is written)
                    python3 tools/build_yue_modules.py --fixture  # also (re)write fixtures/yue-modules-equivalence.json (the Python reference for the Node test)

Sources (single source of truth, never edited here): cantonese-modules/drafts/*-modules.csv merged by cantonese-modules/tools/yue_merge_modules.py into
ALL-modules.csv, and cantonese-modules/cantonese-word-tags.csv (the word ids are the app's ids). Only `ready` modules are embedded, and only the words the
modules can fill (not the skipped ones).
Cantonese does not inflect: the slots are {W} (the word as it stands) and {M} (its classifier, only when every fitting word has one). The fixed text of a line is
cut into chunks between the slots; every chunk is cut into WORDS with the closed word list (the same dynamic-programming cut yue_check.py uses to prove the
vocabulary) and each word carries its YALE reading, so the app writes a sentence's romanisation, and the word-by-word view, without a segmenter:
chunk words + the target's own Yale + the classifier's Yale.

Payload (gzip + base64):  {v:'y1', t:{id:[word, tier, cell, english_slot, english_plural, classifier, classifierYale]}, m:[15-field rows], c:[chunk specs]}
  15-field row  [module_id, cell, tier, excluded ids, A1 items, A1 English, A1 prompt, B items, B English, B prompt, A2 items, A2 English, A2 prompt, scene, job]
  an item is an index into c, or the slot token '{W}' / '{M}'
  a chunk spec is its words joined by \\x1e, each word `surface \\x1d yale` (yale is empty for punctuation)
"""
import base64, csv, gzip, hashlib, json, os, re, subprocess, sys, unicodedata

FLAGS = set(sys.argv[1:])        # yue_check resets sys.argv when imported, so the flags are read first
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SRC = os.path.join(ROOT, 'cantonese-modules')
JSX = os.path.join(ROOT, 'tt.jsx')
BEGIN, END = '// YUE_MODULES_DATA_BEGIN', '// YUE_MODULES_DATA_END'
TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
sys.path.insert(0, os.path.join(SRC, 'tools'))
sys.path.insert(0, HERE)

# reading of the free sentence-final / calling particles (yue_check.FREE): the word list does not carry them as words (Jyutping in the comment)
FREE_YALE = {'呀': 'a', '啊': 'a', '啦': 'lā', '喇': 'la', '囉': 'lō', '嘛': 'ma', '喎': 'wo', '啩': 'gwa', '噃': 'bo', '咯': 'lo', '吖': 'ā', '啫': 'jē',
             '哦': 'òh', '噢': 'ō', '嗯': 'ńg', '喂': 'wai', '哎': 'āai', '哇': 'wā', '嘿': 'hēi', '哈': 'hā'}
#            aa3 aa3 laa1 laa3 lo1 maa3 wo3 gwaa3 bo3 lo3 aa1 ze1 o4 o1 ng2 wai3 aai1 waa1 hei1 haa1
# classifiers that are not entries of the word list (a classifier of the list takes its Yale from the list); Jyutping converted with cantonese-modules/tools/yale.py
CLASSIFIER_JP = {'把': 'baa2', '塊': 'faai3', '副': 'fu3', '朵': 'do2', '幢': 'zong6', '盞': 'zaan2', '封': 'fung1', '句': 'geoi3', '籠': 'lung4', '筒': 'tung4', '磚': 'zyun1',
                 '道': 'dou6', '餐': 'caan1', '堂': 'tong4', '嚿': 'gau6', '幅': 'fuk1', '盤': 'pun4', '串': 'cyun3', '套': 'tou3', '方': 'fong1', '首': 'sau2', '單': 'daan1',
                 '片': 'pin3'}
# the one word of the fixed text read two ways by position: 呢 is nī (this) before a word and nē (the question / topic particle) at the end of a clause
DEMONSTRATIVE = '呢'
CLAUSE_END = '，。？！、…」 \t'


def merge():
    subprocess.check_call([sys.executable, os.path.join(SRC, 'tools', 'yue_merge_modules.py')], cwd=SRC, stdout=subprocess.DEVNULL)


def read(p):
    return list(csv.DictReader(open(p, encoding='utf-8-sig')))


def yc():
    sys.argv = ['x']
    import yue_check as Z
    import yale as Y
    return Z, Y


# ── Yale validator (the Python twin of validateYale in tt.jsx; the Node test checks both against every word of the list) ───────────────────────────────
INITIALS = ['ng', 'gw', 'kw', 'ch'] + list('bpmfdtnlgkhwjsy')
NUCLEI = ['a', 'aa', 'e', 'i', 'o', 'u', 'yu', 'eu', 'ai', 'aai', 'au', 'aau', 'ei', 'eui', 'iu', 'oi', 'ou', 'ui']
FINALS = {'a', 'aai', 'aau', 'aam', 'aan', 'aang', 'aap', 'aat', 'aak', 'ai', 'au', 'am', 'an', 'ang', 'ap', 'at', 'ak', 'e', 'ei', 'eng', 'ek', 'ep', 'eu', 'eui', 'eun', 'eung',
          'eut', 'euk', 'i', 'iu', 'im', 'in', 'ing', 'ip', 'it', 'ik', 'o', 'oi', 'ou', 'on', 'ong', 'ot', 'ok', 'u', 'ui', 'un', 'ung', 'ut', 'uk', 'yu', 'yun', 'yut'}
CODAS = ['ng', 'm', 'n', 'p', 't', 'k']
MARKS = {'̀': 'grave', '́': 'acute', '̄': 'macron'}


def yale_syllable(tok):
    """None when `tok` is a Yale syllable, else the reason it is not."""
    d = unicodedata.normalize('NFD', tok.lower())
    base, marks = '', []
    for ch in d:
        if ch in MARKS:
            marks.append((len(base) - 1, MARKS[ch]))
        elif 'a' <= ch <= 'z':
            base += ch
        else:
            return 'character %r is not Yale' % ch
    if len(marks) > 1:
        return 'more than one tone mark'
    mark = marks[0] if marks else None
    for nasal in ('m', 'ng'):
        if base in (nasal, nasal + 'h'):
            low = base.endswith('h')
            if mark and mark[0] != 0:
                return 'tone mark on the wrong letter'
            if mark and mark[1] == 'grave' and not low:
                return 'low falling tone needs h'
            if mark and mark[1] == 'macron' and low:
                return 'high tone has no h'
            return None
    for i in INITIALS + ['']:
        if not base.startswith(i):
            continue
        rest = base[len(i):]
        for nuc in NUCLEI:
            if not rest.startswith(nuc):
                continue
            r2 = rest[len(nuc):]
            low = r2.startswith('h')
            if low:
                r2 = r2[1:]
            if r2 not in [''] + CODAS or (nuc + r2) not in FINALS:
                continue
            vi = len(i) + (nuc.index('u') if nuc.startswith('yu') else 0)          # the mark sits on the first vowel (on the u of yu)
            if mark:
                if mark[0] != vi:
                    continue
                if mark[1] == 'grave' and not low:
                    continue
                if mark[1] == 'macron' and low:
                    continue
            return None
    return 'not a Yale syllable'


def validate_yale(s):
    s = unicodedata.normalize('NFC', str(s or '')).strip()
    if not s:
        return False, 'missing Yale'
    if re.search(r'[0-9]', s):
        return False, 'tone numbers are not Yale'
    if re.search(r'[一-鿿]', s):
        return False, 'Chinese characters in the Yale'
    for tok in re.split(r'\s+', re.sub(r"[,.?!;:…'\"()]", ' ', s)):
        if not tok:
            continue
        why = yale_syllable(tok)
        if why:
            return False, '%s: %s' % (tok, why)
    return True, ''


def tidy(p):
    """← tidyPinyin in tt.jsx"""
    s = str(p or '')
    for a, b in (('。', '.'), ('，', ','), ('？', '?'), ('！', '!'), ('；', ';'), ('、', ',')):
        s = s.replace(a, b)
    s = re.sub(r'\s+([,.;:?!])', r'\1', s)
    s = re.sub(r'([,;:])(?=\S)', r'\1 ', s)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()


def free_words():
    """{word: Yale} of the free words of cantonese-modules/free-words.csv that are written in characters (names, loanwords, interjections, particles). The learner-vocabulary rule of
    the app lets a lesson line use them although they were never taught; a starter module may therefore carry them in its fixed text. A Latin-spelled one (OK) is left out: the
    checker refuses Latin letters in a line, so no module can carry it."""
    out = {}
    p = os.path.join(SRC, 'free-words.csv')
    if os.path.exists(p):
        for r in read(p):
            if not re.search(r'[A-Za-z]', r['word']):
                out[r['word']] = r['yale']
    return out


def table(Z, Y):
    """form -> Yale: the word list (lowest tier, then lowest id wins a duplicate form), then the free particles."""
    out, seen = {}, {}
    for w in sorted((w for w in Z.WORDS.values() if not w.get('skip')), key=lambda w: (TIERS.index(w['tier']), int(w['id']))):
        out.setdefault(w['word'], w['yale'])
        seen.setdefault(w['word'], set()).add(w['yale'])
    out.update(FREE_YALE)
    for w, y in free_words().items():                              # names and loanwords of free-words.csv (a word of the list keeps the reading of the list)
        out.setdefault(w, y)
    return out, {k: v for k, v in seen.items() if len(v) > 1}


def classifier_yale(Y, py):
    cy = {k: Y.convert(v) for k, v in CLASSIFIER_JP.items()}
    return lambda c: py.get(c) or cy.get(c, '')


QUOTES = '「」'


def encode(mods, Z, py, report):
    chunks, index, rows = [], {}, []
    FREE_ALL = free_words()
    punct = re.compile(r'[，。？！、；：…\s,.?!"“”「」（）()\-—·]')

    def chunk(text, tier_i, nxt):
        # the cut of a chunk: with the words of the module's own tier and the free particles first (every module written before the starter modules is cut exactly as it always was);
        # a chunk that is not covered that way is cut again with every word of the list (a starter module may use a word of a higher tier that the beginner order teaches earlier)
        # and the free words of free-words.csv (阿欣 三文治 ...), which the checker has already proved
        ok, spans, toks = Z.segment(text, tier_i)
        if not ok:
            ok, spans, toks = Z.segment(text, tier_i, set(Z.ALLOWED), set(Z.FREE_SET) | set(FREE_ALL))
        assert ok, ('chunk is not covered by the closed list', text, spans)
        words, i, ti = [], 0, 0
        while i < len(text):
            if punct.match(text[i]):
                if not text[i].isspace():
                    words.append((text[i], ''))
                i += 1
                continue
            t = toks[ti]
            assert text.startswith(t, i), ('segment order', text, t, i)
            y = py.get(t)
            assert y is not None, ('no Yale', t)
            if t == DEMONSTRATIVE:                                         # nī before a word / slot, nē at the end of a clause
                after = text[i + 1:i + 2] or nxt
                y = 'nē' if (after == '' or after in CLAUSE_END) else 'nī'
                report['ne'][y] += 1
            if t == '長':
                report['cheung'].append(text)
            words.append((t, y))
            i += len(t)
            ti += 1
        assert ti == len(toks)
        spec = '\x1e'.join(s + '\x1d' + y for s, y in words)
        if spec not in index:
            index[spec] = len(chunks)
            chunks.append(spec)
        return index[spec]

    for r in mods:
        lines = []
        ti = TIERS.index(r['tier'])
        for f in ('A1', 'B', 'A2'):
            parts = [p for p in re.split(r'(\{[WM]\})', r[f + '_yue'].strip()) if p]
            items = []
            for k, part in enumerate(parts):
                if part in ('{W}', '{M}'):
                    items.append(part)
                else:
                    nxt = '\x01' if k + 1 < len(parts) else ''
                    items.append(chunk(part, ti, nxt))
            lines.append(items)
        rows.append(lines)
    return chunks, rows


def build():
    Z, Y = yc()
    py, homographs = table(Z, Y)
    cy = classifier_yale(Y, py)
    tags = read(os.path.join(SRC, 'cantonese-word-tags.csv'))
    mods = [r for r in read(os.path.join(SRC, 'drafts', 'ALL-modules.csv')) if r['status'] == 'ready']
    cells = {r['group'] for r in mods}
    # a word is tagged only when at least one module can fill it (穿 睜 當 have none: their English slots cannot sit in a sentence; the app teaches them without a module line)
    fillable = set()
    for r in mods:
        fillable.update(w['id'] for w in Z.fits(r))
    t = {}
    assert py['長'] == 'chèuhng', 'every 長 of the fixed text is the adjective (long)'
    for r in tags:
        cell = r['subgroup'] or r['group']
        if r['skip'] or not r['group'] or cell not in cells or r['id'] not in fillable:
            continue
        mw = r['classifier'].strip()
        mw = '' if mw == '-' else mw                                       # '-' = no classifier (a unit or an abstract noun): no module line uses {M} for these
        if mw:
            assert cy(mw), ('classifier without Yale', r['id'], mw)
        t[r['id']] = [r['word'], TIERS.index(r['tier']) + 1, cell, r['english_slot'], r['english_plural'], mw, cy(mw) if mw else '']
    report = {'ne': __import__('collections').Counter(), 'cheung': []}
    chunks, enc = encode(mods, Z, py, report)
    m = [[r['module_id'], r['group'], TIERS.index(r['tier']) + 1, ';'.join(x for x in r['exclude_ids'].replace(',', ';').split(';') if x), enc[k][0], r['A1_english'], r['A1_prompt'],
          enc[k][1], r['B_english'], r['B_prompt'], enc[k][2], r['A2_english'], r['A2_prompt'], r['scene'], r['job']] for k, r in enumerate(mods)]
    # every Yale of the embedded data is checked with the validator the app uses
    bad = []
    for spec in chunks:
        for w in spec.split('\x1e'):
            s, y = w.split('\x1d')
            if y:
                ok, why = validate_yale(y)
                if not ok:
                    bad.append((s, y, why))
    for tg in t.values():
        if tg[6]:
            ok, why = validate_yale(tg[6])
            if not ok:
                bad.append((tg[5], tg[6], why))
    for w in Z.WORDS.values():
        if not w.get('skip'):
            ok, why = validate_yale(w['yale'])
            if not ok:
                bad.append((w['word'], w['yale'], why))
    assert not bad, ('Yale the validator refuses', bad[:12], len(bad))
    return {'v': 'y1', 't': t, 'm': m, 'c': chunks}, report, homographs


def fill_yale(d, items, w, mw_yale):
    parts = []
    for it in items:
        if it == '{W}':
            parts.append(w['yale'])
        elif it == '{M}':
            parts.append(mw_yale)
        else:
            parts.append(' '.join(y if y else s for s, y in (x.split('\x1d') for x in d['c'][it].split('\x1e')) if not (not y and s in QUOTES)))
    return tidy(' '.join(parts))


def fixture(d):
    """What the Python reference produces: the English fills for every word, and one hash per module over all its fitting words (Cantonese, Yale, English, prompt)."""
    Z, Y = yc()
    py, _ = table(Z, Y)
    cy = classifier_yale(Y, py)
    en, mods = {}, {}
    byid = {}
    for w in Z.WORDS.values():
        if w['id'] not in d['t']:
            continue
        en[w['id']] = [Z.fill_en('{E}', w), Z.fill_en('{Es}', w), Z.fill_en('x {a} y {E}', w)]
    mrows = {r['module_id']: r for r in Z.read_rows(os.path.join(SRC, 'drafts', 'ALL-modules.csv'))}
    for k, row in enumerate(d['m']):
        r = mrows[row[0]]
        h = hashlib.sha1()
        fw = sorted(Z.fits(r), key=lambda w: int(w['id']))          # by id: the order of the word list is by rank, the Node test walks the ids in ascending order
        for w in fw:
            mw = (w.get('classifier') or '').strip()
            mw = '' if mw == '-' else mw
            for f, items in zip(('A1', 'B', 'A2'), (row[4], row[7], row[10])):
                zh = Z.fill_zh(r[f + '_yue'], {**w, 'classifier': mw})
                ya = fill_yale(d, items, w, cy(mw) if mw else '')
                h.update((zh + '|' + ya + '|' + Z.fill_en(r[f + '_english'], w) + '|' + Z.fill_en(r[f + '_prompt'], w) + '\n').encode('utf-8'))
        mods[r['module_id']] = [len(fw), h.hexdigest()[:16]]
    out = os.path.join(ROOT, 'fixtures', 'yue-modules-equivalence.json')
    json.dump({'en': en, 'mods': mods}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print('fixture', out, 'words', len(en), 'modules', len(mods), 'bytes', os.path.getsize(out))


def main():
    merge()
    d, report, homographs = build()
    raw = json.dumps(d, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    gz = gzip.compress(raw, 9, mtime=0)
    b64 = base64.b64encode(gz).decode('ascii')
    print('words', len(d['t']), 'modules', len(d['m']), 'chunks', len(d['c']), 'json', len(raw), 'gzip', len(gz), 'base64', len(b64))
    print('呢 read as', dict(report['ne']), '· 長 in', len(report['cheung']), 'chunk(s)', sorted(set(report['cheung']))[:6], '· homographs', sorted(homographs))
    if '--fixture' in FLAGS:
        fixture(d)
    if '--check' in FLAGS:
        return
    s = open(JSX, encoding='utf-8').read()
    Z, _ = yc()
    nomod = sorted(int(w['id']) for w in Z.WORDS.values() if not w.get('skip') and w['id'] not in d['t'])
    block = (BEGIN + '\nconst YUE_MODULES_GZ = "' + b64 + '"\n' +
             '// the live words no module can fill (their English slot cannot sit in a sentence): not Daily targets in the module-only first slice\n' +
             'const YUE_NO_MODULE_IDS = ' + json.dumps(nomod) + '\nconst YUE_NO_MODULE_SET = new Set(YUE_NO_MODULE_IDS)\n' + END)
    print('words without a module', nomod)
    if BEGIN in s:
        s = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), lambda _: block, s, flags=re.S)
    else:
        anchor = '// ZH_MODULES_DATA_END'
        assert anchor in s
        s = s.replace(anchor, anchor + '\n' + block, 1)
    open(JSX, 'w', encoding='utf-8').write(s)
    print('tt.jsx updated')


if __name__ == '__main__':
    main()          # (guarded so cantonese-modules/tools/yue_free_words.py can import the Yale validator without rebuilding tt.jsx)
