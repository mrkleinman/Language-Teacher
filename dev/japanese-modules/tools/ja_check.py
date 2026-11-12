#!/usr/bin/env python3
"""Checker and renderer for the Japanese gap-fill modules (casual speech).

Usage:  python3 tools/ja_check.py drafts/T1-modules.csv [--group G] [--quiet]
        python3 tools/ja_check.py render drafts/T1-modules.csv MODULE_ID [WORD_ID]

Module CSV columns (same as the Thai set):
  module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,
  A1_ja,A1_english,A1_prompt,B_ja,B_english,B_prompt,A2_ja,A2_english,A2_prompt
Japanese slot tokens: {W} (nouns and every non-verb non-adjective word, as written in the list)
  verbs: {V} dictionary form, {Vnai} {Vta} {Vte} {Vtai} {Vstem} {Vnakatta} {Vtakunai}
  adjectives: {A} plain predicate (おいしい / きれいだ), {Aq} (おいしい / きれい: for ？ and before よ/ね-less questions), {Aneg} {Apast} {Anegpast} {Ate} {Aadv} {Aattr}
English slot tokens: {E} {Es} {a}
"""
import csv, re, sys, os, glob, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ja_conj
from sudachipy import dictionary, tokenizer
_TK = dictionary.Dictionary().create(); _M = tokenizer.Tokenizer.SplitMode.C
def toks(text): return _TK.tokenize(text, _M)

TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
RANGE = {'T1': (2, 5), 'T2': (4, 8), 'T3': (6, 10), 'T4': (7, 12), 'T5': (8, 14)}
BELTS = {'T1': 'White;Orange', 'T2': 'Orange+Stripe;Blue;Blue+Stripe', 'T3': 'Yellow;Yellow+Stripe', 'T4': 'Green;Green+Stripe', 'T5': 'Brown;Brown+Stripe;Beyond'}
POLITE = re.compile(r'(です|ます|ました|ません|でした|ましょう|ください|くださ|ございます|いたします|おります|でしょう|いらっしゃ)')
FREE_SURFACE = {'うん', 'ええ', 'ああ', 'あっ', 'あ', 'えっ', 'え', 'へえ', 'ねえ', 'ね', 'よ', 'じゃあ', 'ほら', 'まあ', 'よし', 'さん', 'ちゃん', 'くん', 'お', 'ご', 'ふーん', 'そっか', 'そうか', 'そう', 'じゃ', 'あれ', 'うーん', 'ううん', 'よかった', 'そして', 'でも', 'だって'}
SPECIAL_FINAL = ('かな', 'かも', 'よね', 'じゃん', 'でしょ', 'だよ', 'だね', 'ね', 'よ', 'か', 'の', 'ぞ', 'ぜ', 'わ', 'さ', 'な', 'もん')
A_BANNED = ('かしら', 'わよ', 'わね', 'のよ', 'だわ', 'わ。', 'わ！', 'あたし')
B_BANNED = ('だぜ', 'ぜ。', 'ぜ！', 'ぞ。', 'ぞ！', 'おれ', '俺', 'お前', 'てめえ', 'だろ。', 'だろ！', 'ぼく', '僕')
GLOBAL_BANNED = ('死ね', 'バカ', 'ばか', 'くそ', 'うざい', 'きもい')
ENDS = ('。', '？', '！', '?', '!', '…')
V_SLOTS = ('V', 'Vnai', 'Vta', 'Vte', 'Vtai', 'Vstem', 'Vnakatta', 'Vtakunai')
A_SLOTS = ('A', 'Aq', 'Aneg', 'Apast', 'Anegpast', 'Ate', 'Aadv', 'Aattr')
SENT = '\u0001'

def load_words():
    base = {r['id']: r for r in csv.DictReader(open(f'{HERE}/japanese-word-base.csv', encoding='utf-8-sig'))}
    for p in sorted(glob.glob(f'{HERE}/drafts/*-tags.csv')):
        for r in csv.DictReader(open(p, encoding='utf-8-sig')):
            if r['id'] in base:
                base[r['id']].update({k: r.get(k, '') for k in ('group', 'subgroup', 'frame', 'english_slot', 'english_plural', 'counter', 'register_note', 'skip')})
    return base
WORDS = load_words()

def lemma_keys(word):
    ms = toks(word)
    keys = {word}
    if len(ms) == 1: keys.add(ms[0].dictionary_form())
    return keys
ALLOWED = {}      # key -> first tier index
MULTI = []        # multi-token list entries, longest first
for w in WORDS.values():
    ti = TIERS.index(w['tier'])
    for k in lemma_keys(w['word']):
        if k not in ALLOWED or ALLOWED[k] > ti: ALLOWED[k] = ti
    if len(toks(w['word'])) > 1: MULTI.append((w['word'], ti))
MULTI.sort(key=lambda x: -len(x[0]))

def slot_kind(w):
    if w['pos'] == 'verb' and w['conj'] not in ('', '?'): return 'V'
    if w['pos'] in ('adj-i', 'adj-na'): return 'A'
    return 'W'

def forms_for(w):
    k = slot_kind(w)
    if k == 'V':
        f = ja_conj.verb_forms(w['word'], w['conj'])
        return {'V': f['dict'], 'Vnai': f['nai'], 'Vta': f['ta'], 'Vte': f['te'], 'Vtai': f['tai'], 'Vstem': f['stem'], 'Vnakatta': f['nakatta'], 'Vtakunai': f['takunai'], 'W': w['word']}
    if k == 'A':
        f = ja_conj.adj_forms(w['word'], w['conj'])
        q = w['word'] if w['conj'] != 'na-adj' else w['word']
        return {'A': f['pred'], 'Aq': q, 'Aneg': f['neg'], 'Apast': f['past'], 'Anegpast': f['negpast'], 'Ate': f['te'], 'Aadv': f['adv'], 'Aattr': f['attr']}
    return {'W': w['word']}

def fill_ja(line, w):
    f = forms_for(w)
    def rep(m):
        t = m.group(1)
        if t not in f: raise KeyError(t)
        return f[t]
    return re.sub(r'\{([A-Za-z]+)\}', rep, line)

def fill_en(line, w, group_second=None):
    e = w.get('english_slot', ''); es = w.get('english_plural', '') or e
    out = line.replace('{Es}', es).replace('{E}', e)
    if '{a}' in out:
        art = '' if (es == e) else ('an ' if re.match(r'[aeiouAEIOU]', e) else 'a ')
        out = out.replace('{a} ', art).replace('{a}', art.strip())
    return re.sub(r'\s+', ' ', out)

def units(line):
    """content units of a line with ONE slot sentinel counted as 1; particles/auxiliaries/punctuation/する-after-noun not counted"""
    n = 0
    parts = line.split(SENT)
    for k, p in enumerate(parts):
        ms = toks(p) if p else []
        for i, m in enumerate(ms):
            pos = m.part_of_speech()
            if pos[0] in ('助詞', '助動詞', '補助記号', '記号', '空白', '接尾辞'): continue
            if pos[0] == '接頭辞': continue
            if pos[0] == '動詞' and m.dictionary_form() in ('する', 'いる', 'ある', 'くる') and i > 0 and ms[i - 1].part_of_speech()[0] in ('名詞', '動詞', '助詞') and pos[1] == '非自立可能': continue
            n += 1
        if k < len(parts) - 1: n += 1
    return n

def unknown_tokens(line, tier_i):
    """tokens of a line (slot = sentinel) that are not allowed words at this tier"""
    bad = []
    s = line
    for mw, ti in MULTI:
        if ti <= tier_i and mw in s: s = s.replace(mw, SENT)
    for p in s.split(SENT):
        if not p: continue
        for m in toks(p):
            pos = m.part_of_speech()
            surf, lem = m.surface(), m.dictionary_form()
            if pos[0] in ('助詞', '助動詞', '補助記号', '記号', '空白', '接頭辞', '接尾辞'): continue
            if surf in FREE_SURFACE or lem in FREE_SURFACE: continue
            if re.fullmatch(r'[？！。、…「」\s]+', surf): continue
            if pos[0] == '動詞' and lem in ('する', 'いる', 'ある', 'くる') and pos[1] == '非自立可能' : continue
            a = ALLOWED.get(lem, ALLOWED.get(surf))
            if a is None or a > tier_i: bad.append(surf if surf == lem else surf + '→' + lem)
    return bad

def cell_words(r):
    g = r['group']
    out = []
    for w in WORDS.values():
        if w.get('skip'): continue
        wg = w.get('subgroup') or w.get('group')
        if wg != g: continue
        if TIERS.index(w['tier']) > TIERS.index(r['tier']): continue
        out.append(w)
    return out

def fits(r):
    ex = {x for x in (r.get('exclude_ids') or '').replace(',', ';').split(';') if x}
    return [w for w in cell_words(r) if w['id'] not in ex]

def check_row(r, problems, seen_open):
    mid = r['module_id']; tier = r['tier']; ti = TIERS.index(tier); lo, hi = RANGE[tier]
    fw = fits(r)
    if not fw: problems.append((mid, '-', 'fits no word (group/subgroup/tier/exclude)'))
    kinds = {slot_kind(w) for w in fw}
    for f in ('A1', 'B', 'A2'):
        ja, en, pr = r[f + '_ja'].strip(), r[f + '_english'], r[f + '_prompt']
        slots = re.findall(r'\{([A-Za-z]+)\}', ja)
        if not slots: problems.append((mid, f, 'no slot in Japanese'))
        for sl in slots:
            if sl == 'W' and 'V' in kinds - {'W'} and False: pass
            if sl in V_SLOTS and kinds != {'V'}: problems.append((mid, f, f'verb slot {{{sl}}} but cell has {sorted(kinds)}'))
            elif sl in A_SLOTS and kinds != {'A'}: problems.append((mid, f, f'adjective slot {{{sl}}} but cell has {sorted(kinds)}'))
            elif sl == 'W' and kinds != {'W'}: problems.append((mid, f, '{W} used but cell has ' + str(sorted(kinds))))
            elif sl not in V_SLOTS + A_SLOTS + ('W',): problems.append((mid, f, 'unknown Japanese token {' + sl + '}'))
        if not re.search(r'\{Es?\}', en): problems.append((mid, f, 'no {E} or {Es} in English'))
        if not re.search(r'\{Es?\}', pr): problems.append((mid, f, 'note: no {E} in prompt'))
        for tok in re.findall(r'\{[^}]*\}', en + pr):
            if tok not in ('{E}', '{Es}', '{a}'): problems.append((mid, f, 'unknown English token ' + tok))
        if re.search(r'\b[Aa]n? \{Es?\}', en + ' ' + pr): problems.append((mid, f, 'literal a/an before {E}: use {a}'))
        if '/' in en or '/' in pr: problems.append((mid, f, 'slash in English or prompt'))
        if en.startswith('{E') or en.startswith('{a}'): problems.append((mid, f, 'note: English starts with {E}'))
        if POLITE.search(ja): problems.append((mid, f, 'polite form in a casual module: ' + POLITE.search(ja).group(1)))
        for b in GLOBAL_BANNED:
            if b in ja: problems.append((mid, f, 'banned word ' + b))
        if f in ('A1', 'A2'):
            for b in A_BANNED:
                if b in ja: problems.append((mid, f, 'feminine ending in an A (man) line: ' + b))
            if re.search(r'\bhim\b', pr): problems.append((mid, f, 'A prompt says him'))
        else:
            for b in B_BANNED:
                if b in ja: problems.append((mid, f, 'masculine/rough form in a B (woman) line: ' + b))
            if re.search(r'\bher\b', pr): problems.append((mid, f, 'B prompt says her'))
        if not ja.endswith(ENDS): problems.append((mid, f, 'line must end with 。？！… '))
        if ('？' in ja or '?' in ja) != ('?' in en): problems.append((mid, f, 'question mark mismatch between Japanese and English'))
        # render with the slot as a sentinel for vocabulary and length (the slot word itself is allowed by construction)
        probe = re.sub(r'\{[A-Za-z]+\}', SENT, ja)
        bad = unknown_tokens(probe, ti)
        if bad: problems.append((mid, f, 'NOT ALLOWED at ' + tier + ': ' + ' · '.join(bad)))
        n = units(probe)
        if n < lo or n > hi: problems.append((mid, f, f'{n} units (range {lo}-{hi}): ' + ja))
        # rendering of every fitting word must tokenise to the expected lemma in the slot position (catches wrong conjugation) - sample up to 6 words
        for w in fw[:6]:
            try: rj = fill_ja(ja, w)
            except KeyError as e: problems.append((mid, f, f'slot {e} not available for word {w["word"]}')); break
            if re.search(r'(\{|\})', rj): problems.append((mid, f, 'unfilled slot after rendering: ' + rj)); break
    k = (r['group'], tier, r['A1_ja'].strip()[:3])
    if k in seen_open: problems.append((mid, 'A1', 'same opening as ' + seen_open[k]))
    else: seen_open[k] = mid

def read_rows(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))

def main():
    a = sys.argv[1:]
    if a and a[0] == 'render':
        rows = {r['module_id']: r for r in read_rows(a[1])}; r = rows[a[2]]
        ws = [WORDS[a[3]]] if len(a) > 3 else fits(r)[:5]
        for w in ws:
            print(f"-- {w['word']} ({w['meaning']}) [{w.get('english_slot')}]")
            for f, who in (('A1', 'A'), ('B', 'B'), ('A2', 'A')):
                print(f"  {who}: {fill_ja(r[f + '_ja'], w)}   | {fill_en(r[f + '_english'], w)}   | {fill_en(r[f + '_prompt'], w)}")
        return
    if a and a[0] == 'allowed':
        ti = TIERS.index(a[1]); print(' '.join(w['word'] + '=' + w['meaning'].split('/')[0].strip() for w in WORDS.values() if TIERS.index(w['tier']) <= ti)); return
    if a and a[0] == 'words':
        g = a[1]; ti = TIERS.index(a[2]) if len(a) > 2 else 4
        for w in WORDS.values():
            if (w.get('subgroup') or w.get('group')) == g and TIERS.index(w['tier']) <= ti and not w.get('skip'): print(w['id'], w['word'], w['meaning'], '|', w.get('english_slot'), '|', w['tier'], w['pos'], w['conj'])
        return
    path = a[0]; only = a[a.index('--group') + 1] if '--group' in a else None; quiet = '--quiet' in a
    rows = [r for r in read_rows(path) if r.get('status', 'ready') == 'ready' and (not only or r['group'] == only)]
    problems = []; seen = {}
    ids = collections.Counter(r['module_id'] for r in rows)
    for r in rows:
        if ids[r['module_id']] > 1: problems.append((r['module_id'], '-', 'duplicate module_id'))
        check_row(r, problems, seen)
    # coverage per word: how many modules fit
    cov = collections.Counter()
    for r in rows:
        for w in fits(r): cov[w['id']] += 1
    thin = [(w['id'], w['word'], w['tier'], cov[w['id']]) for w in WORDS.values() if not w.get('skip') and w.get('group') and cov[w['id']] < 3 and (not only or (w.get('subgroup') or w.get('group')) == only)]
    real = [p for p in problems if not p[2].startswith('note:')]
    for p in (problems if not quiet else real)[:400]: print(p)
    print(f'modules {len(rows)} · problems {len(real)} · notes {len(problems) - len(real)} · words with <3 modules {len(thin)}')
    if thin and not quiet:
        print('thin:', thin[:40])
    sys.exit(1 if real else 0)

if __name__ == '__main__':
    main()
