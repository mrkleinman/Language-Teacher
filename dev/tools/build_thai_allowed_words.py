#!/usr/bin/env python3
"""Rebuild dev/thai-modules/thai-allowed-words.csv (the closed vocabulary of the Thai gap-fill modules: word -> first allowed tier).

WHY THIS TOOL EXISTS. The original file was never committed (the handover lists it, the workbench zip held it). The checker
(thai-modules/check_modules.py) needs it, so it is RECONSTRUCTED here from two sources and every row says which:
  tag      every tagged word of thai-word-tags.csv, at its own tier (the tier of its belt, or the tier chosen for a topic word)
  observed a word or glue particle that the 6,000+ reviewed modules use at a tier lower than (or without) its tag tier, or that has no tag
            (ไหน เลย จะ สิ ละ นึง ... ): it is allowed from the lowest tier of the reviewed module that uses it
A word is therefore never allowed at a LOWER tier than a reviewed module already used it at, and a writer can use no word that no
reviewed module and no tagged word has. Rerun after the tag file changes:  python3 tools/build_thai_allowed_words.py   (from dev/)
"""
import csv, os, re, sys
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'thai-modules')
TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
clean = lambda s: re.sub(r'\s*(\.\.\.|…)\s*$', '', s).strip()


def segment(chunk, ti, allowed, maxlen):
    n = len(chunk); INF = 10 ** 9; best = [INF] * (n + 1); back = [None] * (n + 1); best[0] = 0
    for i in range(n):
        if best[i] == INF: continue
        c = chunk[i]
        if c in '\x01\x02ๆ ,.?!':
            if best[i] < best[i + 1]: best[i + 1], back[i + 1] = best[i], (i, True)
            continue
        for L in range(1, min(maxlen, n - i) + 1):
            w = chunk[i:i + L]; t = allowed.get(w)
            if t is not None and t <= ti and best[i] < best[i + L]: best[i + L], back[i + L] = best[i], (i, True)
        if best[i] + 1 < best[i + 1]: best[i + 1], back[i + 1] = best[i] + 1, (i, False)
    spans, j, cur = [], n, []
    while j > 0:
        i, ok = back[j]
        if not ok: cur.append(chunk[i])
        elif cur: spans.append(''.join(reversed(cur))); cur = []
        j = i
    if cur: spans.append(''.join(reversed(cur)))
    return best[n] == 0, list(reversed(spans))


def main():
    from pythainlp.tokenize import word_tokenize
    tags = list(csv.DictReader(open(os.path.join(SRC, 'thai-word-tags.csv'), encoding='utf-8-sig')))
    mods = [r for r in csv.DictReader(open(os.path.join(SRC, 'thai-modules.csv'), encoding='utf-8-sig')) if r['status'] == 'ready']
    allowed, source = {}, {}
    for t in tags:
        w = clean(t['thai']); ti = TIERS.index(t['tier'])
        if w not in allowed or ti < allowed[w]: allowed[w], source[w] = ti, 'tag'
    for _ in range(4):                                   # a few passes: each adds what the previous pass left uncovered
        maxlen = max(len(w) for w in allowed); add = {}
        for r in mods:
            ti = TIERS.index(r['tier'])
            for f in ('A1', 'B', 'A2'):
                ok, spans = segment(r[f + '_thai'].replace('{W}', '\x01').replace('{CLF}', '\x02'), ti, allowed, maxlen)
                if ok: continue
                for sp in spans:
                    for tok in word_tokenize(sp, engine='newmm'):
                        tok = tok.strip()
                        if not tok or not re.fullmatch(r'[฀-๿]+', tok): continue
                        if len(tok) == 1 and tok not in ('จ', 'ว', 'ใ'): continue          # a fragment of a longer word, not a word
                        if tok not in add or ti < add[tok]: add[tok] = ti
        n0 = len(allowed)
        for w, ti in add.items():
            if w not in allowed or ti < allowed[w]: allowed[w], source[w] = ti, 'observed'
        if len(allowed) == n0: break
    allowed.setdefault('นึง', allowed.get('หนึ่ง', 0)); source.setdefault('นึง', 'observed')
    out = os.path.join(SRC, 'thai-allowed-words.csv')
    with open(out, 'w', encoding='utf-8-sig', newline='') as fh:
        wr = csv.writer(fh); wr.writerow(['thai', 'first_tier', 'source'])
        for w in sorted(allowed, key=lambda x: (allowed[x], x)): wr.writerow([w, TIERS[allowed[w]], source[w]])
    by = defaultdict(int)
    for w in allowed: by[source[w]] += 1
    print('words', len(allowed), dict(by), '->', os.path.relpath(out))


main()
