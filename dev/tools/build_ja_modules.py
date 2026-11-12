#!/usr/bin/env python3
"""Rebuild the embedded Japanese gap-fill module data in tt.jsx from dev/japanese-modules/.

Usage (from dev/):  python3 tools/build_ja_modules.py            # merge the module files, rewrite the data line in tt.jsx
                    python3 tools/build_ja_modules.py --check    # only report sizes and counts
                    python3 tools/build_ja_modules.py --fixture  # also (re)write fixtures/ja-modules-equivalence.json (the Python reference for tests82.js)

Sources (single source of truth, never edited here): japanese-modules/drafts/{T1-modules-remapped,W*-modules,TOPUP-*-modules}.csv, merged by
japanese-modules/tools/ja_merge_modules.py into ALL-modules.csv, and japanese-modules/japanese-word-tags.csv. Only `ready` modules are embedded.
Word tags are keyed by the app's word id (the bank import kept the CSV ids); the Japanese text is kept so the app can confirm a tag really
belongs to the word it is filling. JSON -> gzip -> base64 in one JS string constant between two marker comments (like build_thai_modules.py).
The slot filling lives in japanese-modules/tools/ja_check.py + ja_conj.py (Python reference) and in jaModuleFillJa / jaModuleForms in tt.jsx (port):
--fixture writes what the Python produces for EVERY word and EVERY module so the port is compared against it, not sampled.
"""
import base64, csv, gzip, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SRC = os.path.join(ROOT, 'japanese-modules')
JSX = os.path.join(ROOT, 'tt.jsx')
BEGIN, END = '// JA_MODULES_DATA_BEGIN', '// JA_MODULES_DATA_END'
TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']


def merge():
    subprocess.check_call([sys.executable, os.path.join(SRC, 'tools', 'ja_merge_modules.py')], cwd=SRC, stdout=subprocess.DEVNULL)


def read(p):
    return list(csv.DictReader(open(p, encoding='utf-8-sig')))


def legacy_ids():
    """csv id -> the id the app SAVED the word under (the 200 words the app carried before the new list; see build_ja_zh_banks.py). Every other word has app id = csv id."""
    return {r['csv_id']: r['app_id'] for r in read(os.path.join(SRC, 'japanese-legacy-bank.csv'))}


# ── pre-segmentation (Sudachi, at build time) ───────────────────────────────────────────────────────────────────────────────────
# The browser has no Sudachi: its own word splitter only knows the bank headwords plus kanji-stem inflections, so a module line (written and
# checked against the closed vocabulary with Sudachi) would be refused for "untaught" fragments such as るん / っん. The fixed text between the
# slots is therefore segmented HERE, exactly as the Python checker reads it (same MULTI handling, same free words), and the segments carry the
# BANK's spelling as the lemma, so the app's own closed-vocabulary check compares real lemmas with what THIS learner has been taught.
_J = None


def _ja():
    global _J
    if _J is None:
        sys.path.insert(0, os.path.join(SRC, 'tools'))
        sys.path.insert(0, os.path.join(ROOT, 'tools'))
        _argv = sys.argv
        sys.argv = ['x']
        import ja_check
        import ja_readings
        sys.argv = _argv
        keys = {}
        for w in sorted(ja_check.WORDS.values(), key=lambda w: (ja_check.TIERS.index(w['tier']), int(w['id']))):
            for k in ja_check.lemma_keys(w['word']):
                keys.setdefault(k, w['word'])
        legacy = {r['word']: r['reading'] for r in read(os.path.join(SRC, 'japanese-legacy-bank.csv'))}
        bank_reading = {}
        for r in read(os.path.join(SRC, 'japanese-word-base.csv')):
            w = r['word']
            if w not in bank_reading:
                bank_reading[w] = legacy.get(w) or ja_readings.reading_for(w, r['romaji'])[0]
        _J = (ja_check, keys, bank_reading)
    return _J


def _hira(t):
    return ''.join(chr(ord(c) - 0x60) if '\u30a1' <= c <= '\u30f6' else c for c in t)


def seg_chunk(text, tier_i):
    """Tokens of one fixed chunk of a module line at a tier: 'surface|lemma|reading|kind' (lemma / reading empty when equal to the surface;
    kind c = content word, g = grammar / free word, p = punctuation)."""
    ja, keys, br = _ja()
    out = []
    # multi-token bank words (those Sudachi splits) are one content word when their tier allows them, longest first (as in ja_check.unknown_tokens)
    multi = [(mw, ti) for mw, ti in ja.MULTI if ti <= tier_i]
    pieces, i, buf = [], 0, ''
    while i < len(text):
        hit = next((mw for mw, _ in multi if text.startswith(mw, i)), None)
        if hit:
            if buf:
                pieces.append(('t', buf)); buf = ''
            pieces.append(('m', hit)); i += len(hit)
        else:
            buf += text[i]; i += 1
    if buf:
        pieces.append(('t', buf))
    fmt = lambda s, l, r, k: (s, l, r, k)
    for kind, piece in pieces:
        if kind == 'm':
            out.append(fmt(piece, piece, br.get(piece, piece), 'c')); continue
        for m in ja.toks(piece):
            surf, lem, pos = m.surface(), m.dictionary_form(), m.part_of_speech()
            rd = _hira(m.reading_form()) if m.reading_form() else surf
            if re.fullmatch(r'[\u30a0-\u30ff\u30fc]+', surf):
                rd = surf                                  # katakana words keep their own spelling as the reading (as the bank does)
            if re.fullmatch(r'[\s？！。、…「」『』（）(),.?!\-ー〜・]+', surf) and not re.fullmatch(r'[ー]+', surf):
                out.append(fmt(surf, surf, surf, 'p')); continue
            free = (pos[0] in ('助詞', '助動詞', '補助記号', '記号', '空白', '接頭辞', '接尾辞') or surf in ja.FREE_SURFACE or lem in ja.FREE_SURFACE
                    or (pos[0] == '動詞' and lem in ('する', 'いる', 'ある', 'くる') and pos[1] == '非自立可能'))
            if free:
                out.append(fmt(surf, surf, rd, 'g')); continue
            word = keys.get(lem) or keys.get(surf)
            if word is None:
                raise SystemExit('token not in the word list (the checker should have refused it): %r -> %r in %r' % (surf, lem, text))
            if surf == word and word in br:
                rd = br[word]                              # the bank's own reading for a headword written as in the list
            out.append(fmt(surf, word, rd, 'c'))
    return out


def spec_of(tokens):
    """compact token list of a chunk: kind + length of the surface (the surface itself is sliced from the chunk text), then /lemma/reading when they differ."""
    parts = []
    for surf, lem, rd, k in tokens:
        lem = lem if lem != surf else ''
        rd = rd if rd != surf else ''
        spec = k + str(len(surf))
        if lem or rd:
            spec += '/' + lem + ('/' + rd if rd else '')
        parts.append(spec)
    return ';'.join(parts)


def encode_lines(mods):
    """Every Japanese line becomes a list of items: an int (an index into the chunk table: fixed text + its segmentation) or a slot token such as {W}.
    Returns (chunks, rows): chunks[i] = text + '\\u001f' + spec; the text of a chunk exists once in the data."""
    ids, chunks, rows = {}, [], []
    for r in mods:
        ti = TIERS.index(r['tier'])
        lines = []
        for f in ('A1_ja', 'B_ja', 'A2_ja'):
            items = []
            for part in re.split(r'(\{[A-Za-z]+\})', r[f]):
                if not part:
                    continue
                if part.startswith('{'):
                    items.append(part)
                    continue
                toks = seg_chunk(part, ti)
                assert ''.join(t[0] for t in toks) == part, ('segmentation does not reconstruct', part, toks)
                key = (part, spec_of(toks))
                if key not in ids:
                    ids[key] = len(chunks); chunks.append(part + '\u001f' + key[1])
                items.append(ids[key])
            lines.append(items)
        rows.append(lines)
    return chunks, rows


def build():
    app = legacy_ids()
    A = lambda i: app.get(i, i)
    tags = read(os.path.join(SRC, 'japanese-word-tags.csv'))
    mods = [r for r in read(os.path.join(SRC, 'drafts', 'ALL-modules.csv')) if r['status'] == 'ready']
    cells = {r['group'] for r in mods}
    t = {}
    for r in tags:
        cell = r['subgroup'] or r['group']
        if r['skip'] or not r['group'] or cell not in cells:
            continue
        t[A(r['id'])] = [r['word'], TIERS.index(r['tier']) + 1, cell, r['pos'], r['conj'], r['english_slot'], r['english_plural']]
    chunks, enc = encode_lines(mods)
    # the excluded word ids are csv ids too: translated to the app's ids, so the app never compares two numbering schemes
    ex = lambda v: ';'.join(A(x) for x in v.replace(',', ';').split(';') if x)
    m = [[r['module_id'], r['group'], TIERS.index(r['tier']) + 1, ex(r['exclude_ids']), enc[k][0], r['A1_english'], r['A1_prompt'], enc[k][1], r['B_english'], r['B_prompt'],
          enc[k][2], r['A2_english'], r['A2_prompt'], r['scene'], r['job']] for k, r in enumerate(mods)]
    return {'v': 'j2', 't': t, 'm': m, 'c': chunks}


def fixture():
    """What the Python reference produces: every slot form of every word, the English fills, and one hash per module over all its fitting words."""
    sys.path.insert(0, os.path.join(SRC, 'tools'))
    sys.argv = ['x']
    import ja_check as J
    forms, en, mods = {}, {}, {}
    for w in J.WORDS.values():
        if w.get('skip') or not w.get('group'):
            continue
        try:
            forms[w['id']] = J.forms_for(w)
        except Exception as e:  # a word whose class has no forms (reported, never silently ignored)
            forms[w['id']] = {'_error': str(e)}
        en[w['id']] = [J.fill_en('{E}', w), J.fill_en('{Es}', w), J.fill_en('x {a} y {E}', w)]
    for r in J.read_rows(os.path.join(SRC, 'drafts', 'ALL-modules.csv')):
        h = hashlib.sha1()
        fw = J.fits(r)
        for w in fw:
            for f in ('A1', 'B', 'A2'):
                try:
                    ja = J.fill_ja(r[f + '_ja'], w)
                except KeyError:
                    ja = '\x00KeyError'
                h.update((ja + '|' + J.fill_en(r[f + '_english'], w) + '|' + J.fill_en(r[f + '_prompt'], w) + '\n').encode('utf-8'))
        mods[r['module_id']] = [len(fw), h.hexdigest()[:16]]
    out = os.path.join(ROOT, 'fixtures', 'ja-modules-equivalence.json')
    json.dump({'forms': forms, 'en': en, 'mods': mods}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print('fixture', out, 'words', len(forms), 'modules', len(mods), 'bytes', os.path.getsize(out))


def main():
    merge()
    d = build()
    raw = json.dumps(d, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    gz = gzip.compress(raw, 9, mtime=0)
    b64 = base64.b64encode(gz).decode('ascii')
    print('words', len(d['t']), 'modules', len(d['m']), 'json', len(raw), 'gzip', len(gz), 'base64', len(b64))
    if '--fixture' in sys.argv:
        fixture()
    if '--check' in sys.argv:
        return
    s = open(JSX, encoding='utf-8').read()
    block = BEGIN + '\nconst JA_MODULES_GZ = "' + b64 + '"\n' + END
    if BEGIN not in s:
        raise SystemExit('markers not found in tt.jsx: add ' + BEGIN + ' / ' + END + ' first')
    s = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), lambda _: block, s, flags=re.S)
    open(JSX, 'w', encoding='utf-8').write(s)
    print('tt.jsx updated')


main()
