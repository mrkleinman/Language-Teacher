#!/usr/bin/env python3
"""Checker / renderer for the Mandarin gap-fill modules (casual-polite spoken Mandarin).

Usage:  python3 tools/zh_check.py FILE.csv [--group CELL] [--quiet]
        python3 tools/zh_check.py render FILE.csv MODULE_ID [WORD_ID]
        python3 tools/zh_check.py words CELL [TIER]      python3 tools/zh_check.py allowed T1

Module CSV columns: module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,A1_zh,A1_english,A1_prompt,B_zh,B_english,B_prompt,A2_zh,A2_english,A2_prompt
Mandarin slot tokens: {W} the word (never changes form); {M} its measure word (only when every fitting word has one).
English slot tokens: {E} {Es} {a}.
There is no tokeniser: a line is segmented against the closed word list (the same dynamic-programming method the Thai checker uses): every
character must be covered by an allowed word at the module's tier or by a free grammar word.
"""
import csv, re, sys, os, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
RANGE = {'T1': (2, 5), 'T2': (4, 8), 'T3': (6, 10), 'T4': (7, 12), 'T5': (8, 14)}
# free grammar words (not in the list as teachable words, always allowed) - sentence particles and aspect/structural particles
FREE = ['的', '了', '吗', '呢', '吧', '啊', '呀', '嘛', '啦', '哦', '噢', '嗯', '哎', '哇', '着', '过', '地', '得', '们', '一下', '哈', '诶', '喔']
FINAL_PARTICLES = ('吗', '呢', '吧', '啊', '呀', '嘛', '啦', '哦', '噢', '嘛')
BANNED = ['您', '贵姓', '敬请', '幸会', '兹', '谨', '妈的', '他妈', '傻逼', '操', '靠北', '干嘛', '屌', '死了']
FORMAL = ['并且', '然而', '因此', '因而', '以及', '从而', '之间', '所以说']
ENDS = ('。', '？', '！', '…', '?', '!')

def load_words():
    return {r['id']: r for r in csv.DictReader(open(f'{HERE}/mandarin-word-tags.csv', encoding='utf-8-sig'))}
WORDS = load_words()
ALLOWED = {}      # form -> first tier index
for w in WORDS.values():
    ti = TIERS.index(w['tier'])
    forms = {w['word']}
    for f in forms:
        if f not in ALLOWED or ALLOWED[f] > ti: ALLOWED[f] = ti
    # skipped words are still part of the learner's list: they are allowed vocabulary even though no module targets them
MAXLEN = max(len(k) for k in ALLOWED)
FREE_SET = set(FREE)

def segment(chunk, tier_i):
    """DP: cover chunk with allowed words (tier <= tier_i) or free grammar words; punctuation and spaces are free. Returns (ok, uncovered spans, tokens)."""
    n = len(chunk); INF = 10 ** 9
    best = [INF] * (n + 1); back = [None] * (n + 1); best[0] = 0
    for i in range(n):
        if best[i] == INF: continue
        c = chunk[i]
        if re.match(r'[，。？！、；：…\s,.?!"“”「」（）()\-—·]', c) or c == '\x01':
            if best[i] < best[i + 1]: best[i + 1], back[i + 1] = best[i], (i, 'p')
            continue
        for L in range(1, min(MAXLEN, n - i) + 1):
            w = chunk[i:i + L]
            t = ALLOWED.get(w)
            if (t is not None and t <= tier_i) or w in FREE_SET:
                cost = 0.0001 * (1 if w in FREE_SET else 0)       # prefer real words over free particles on a tie
                if best[i] + cost < best[i + L]: best[i + L], back[i + L] = best[i] + cost, (i, 'w')
        if best[i] + 1 < best[i + 1]: best[i + 1], back[i + 1] = best[i] + 1, (i, 'u')
    spans, tokens, j, cur = [], [], n, []
    while j > 0:
        i, kind = back[j]
        if kind == 'u': cur.append(chunk[i])
        else:
            if cur: spans.append(''.join(reversed(cur))); cur = []
            if kind == 'w': tokens.append(chunk[i:j])
        j = i
    if cur: spans.append(''.join(reversed(cur)))
    return best[n] < 1, list(reversed(spans)), list(reversed(tokens))

def units(tokens, slots):
    """content units: segmented words (not free particles), slot sentinels counted by the caller"""
    return len([t for t in tokens if t not in FREE_SET])

def cell_words(r):
    out = []
    for w in WORDS.values():
        if w.get('skip'): continue
        if (w.get('subgroup') or w.get('group')) != r['group']: continue
        if TIERS.index(w['tier']) > TIERS.index(r['tier']): continue
        out.append(w)
    return out

def fits(r):
    ex = {x for x in (r.get('exclude_ids') or '').replace(',', ';').split(';') if x}
    return [w for w in cell_words(r) if w['id'] not in ex]

def fill_zh(line, w):
    return line.replace('{W}', w['word']).replace('{M}', w.get('measure_word', '') or '？M')

def fill_en(line, w):
    e = w.get('english_slot', ''); es = w.get('english_plural', '') or e
    out = line.replace('{Es}', es).replace('{E}', e)
    if '{a}' in out:
        art = '' if es == e else ('an ' if re.match(r'[aeiouAEIOU]', e) else 'a ')
        out = out.replace('{a} ', art).replace('{a}', art.strip())
    return re.sub(r'\s+', ' ', out)

def check_row(r, problems, seen_open):
    mid = r['module_id']; tier = r['tier']; ti = TIERS.index(tier); lo, hi = RANGE[tier]
    fw = fits(r)
    if not fw: problems.append((mid, '-', 'fits no word (group/subgroup/tier/exclude)'))
    for f in ('A1', 'B', 'A2'):
        zh, en, pr = r[f + '_zh'].strip(), r[f + '_english'], r[f + '_prompt']
        if '{W}' not in zh: problems.append((mid, f, 'no {W} in Mandarin'))
        if '{M}' in zh and any(not w.get('measure_word') for w in fw): problems.append((mid, f, '{M} used but some fitting word has no measure word'))
        for tok in re.findall(r'\{[^}]*\}', zh):
            if tok not in ('{W}', '{M}'): problems.append((mid, f, 'unknown Mandarin token ' + tok))
        if not re.search(r'\{Es?\}', en): problems.append((mid, f, 'no {E} or {Es} in English'))
        if not re.search(r'\{Es?\}', pr): problems.append((mid, f, 'note: no {E} in prompt'))
        for tok in re.findall(r'\{[^}]*\}', en + pr):
            if tok not in ('{E}', '{Es}', '{a}'): problems.append((mid, f, 'unknown English token ' + tok))
        if re.search(r'\b[Aa]n? \{Es?\}', en + ' ' + pr): problems.append((mid, f, 'literal a/an before {E}: use {a}'))
        if '/' in en or '/' in pr: problems.append((mid, f, 'slash in English or prompt'))
        if en.startswith('{E') or en.startswith('{a}'): problems.append((mid, f, 'note: English starts with {E}'))
        for b in BANNED:
            if b in zh: problems.append((mid, f, 'banned/too formal or rough: ' + b))
        for b in FORMAL:
            if b in zh: problems.append((mid, f, 'written-style word: ' + b))
        if not zh.endswith(ENDS): problems.append((mid, f, 'line must end with 。？！…'))
        if ('？' in zh or '?' in zh) != ('?' in en): problems.append((mid, f, 'question mark mismatch between Mandarin and English'))
        if f in ('A1', 'A2') and re.search(r'\bhim\b', pr): problems.append((mid, f, 'A prompt says him'))
        if f == 'B' and re.search(r'\bher\b', pr): problems.append((mid, f, 'B prompt says her'))
        finals = [c for c in zh if c in FINAL_PARTICLES]
        if len(re.findall(r'[吗呢吧啊呀嘛啦哦噢]', re.sub(r'[^吗呢吧啊呀嘛啦哦噢，。？！、]', '', zh))) and sum(1 for k in re.split(r'[，。？！、]', zh) if k and k[-1] in FINAL_PARTICLES) > 2:
            problems.append((mid, f, 'too many sentence-final particles'))
        probe = zh.replace('{W}', '\x01').replace('{M}', '\x01')
        ok, spans, toks = segment(probe, ti)
        if not ok: problems.append((mid, f, 'NOT ALLOWED at ' + tier + ': ' + ' · '.join(spans)))
        n = units(toks, 0) + probe.count('\x01')
        if n < lo or n > hi: problems.append((mid, f, f'{n} units (range {lo}-{hi}): ' + zh))
        for w in fw[:6]:
            rz = fill_zh(zh, w)
            if '？M' in rz and '{M}' in zh: problems.append((mid, f, f'word {w["word"]} has no measure word')); break
    k = (r['group'], tier, r['A1_zh'].strip()[:2])
    if k in seen_open: problems.append((mid, 'A1', 'same opening as ' + seen_open[k]))
    else: seen_open[k] = mid

def read_rows(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))

def main():
    a = sys.argv[1:]
    if a and a[0] == 'render':
        rows = {r['module_id']: r for r in read_rows(a[1])}; r = rows[a[2]]
        ws = [WORDS[a[3]]] if len(a) > 3 else fits(r)[:5]
        for w in ws:
            print(f"-- {w['word']} {w['pinyin']} ({w['meaning']}) [{w.get('english_slot')}]")
            for f, who in (('A1', 'A'), ('B', 'B'), ('A2', 'A')):
                print(f"  {who}: {fill_zh(r[f + '_zh'], w)}   | {fill_en(r[f + '_english'], w)}   | {fill_en(r[f + '_prompt'], w)}")
        return
    if a and a[0] == 'allowed':
        ti = TIERS.index(a[1]); print(' '.join(w['word'] + '=' + w['meaning'].split('/')[0].strip() for w in WORDS.values() if TIERS.index(w['tier']) <= ti)); return
    if a and a[0] == 'words':
        g = a[1]; ti = TIERS.index(a[2]) if len(a) > 2 else 4
        for w in WORDS.values():
            if (w.get('subgroup') or w.get('group')) == g and TIERS.index(w['tier']) <= ti and not w.get('skip'):
                print(w['id'], w['word'], w['pinyin'], w['meaning'], '|', w.get('english_slot'), '|', w['tier'], w['pos'], '|', w.get('frame', ''), '|', w.get('measure_word', ''), '|', w.get('register_note', ''))
        return
    path = a[0]; only = a[a.index('--group') + 1] if '--group' in a else None; quiet = '--quiet' in a
    rows = [r for r in read_rows(path) if r.get('status', 'ready') == 'ready' and (not only or r['group'] == only)]
    problems = []; seen = {}
    ids = collections.Counter(r['module_id'] for r in rows)
    for r in rows:
        if ids[r['module_id']] > 1: problems.append((r['module_id'], '-', 'duplicate module_id'))
        check_row(r, problems, seen)
    cov = collections.Counter()
    for r in rows:
        for w in fits(r): cov[w['id']] += 1
    thin = [(w['id'], w['word'], w['tier'], cov[w['id']]) for w in WORDS.values() if not w.get('skip') and w.get('group') and cov[w['id']] < 3 and (not only or (w.get('subgroup') or w.get('group')) == only)]
    real = [p for p in problems if not p[2].startswith('note:')]
    for p in (problems if not quiet else real)[:400]: print(p)
    print(f'modules {len(rows)} · problems {len(real)} · notes {len(problems) - len(real)} · words with <3 modules {len(thin)}')
    sys.exit(1 if real else 0)

if __name__ == '__main__':
    main()
