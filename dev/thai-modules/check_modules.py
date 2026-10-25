"""Checker for Thai gap-fill modules.

Usage: python3 check_modules.py new_modules.csv [--group G]
Checks every module row against the handover spec:
  - {W} in all three Thai lines; {E} or {Es} in every English line; only the
    English tokens {E}, {Es} and {a} (see the handover, section 4b)
  - closed vocabulary: each Thai line must segment fully into allowed words at the
    module's tier or below (slots excepted)
  - words per line within the tier range (end particle not counted)
  - speaker particles (A = ครับ, B = ค่ะ/คะ), one end particle, pronouns
  - banned / written-style words from the speaking guide
  - prompts: A prompts must not say "him", B prompt must not say "her"
  - {CLF} only when every non-excluded word in the cell has a classifier
  - no two modules in a cell share a line-1 opening
It also prints, per cell, how many modules each word fits.
"""
import csv, re, sys, collections, math
from pythainlp.tokenize import word_tokenize

TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
RANGE = {'T1': (2, 5), 'T2': (4, 8), 'T3': (6, 10), 'T4': (7, 12), 'T5': (8, 14)}
BELTS = {'T1': 'White;Orange', 'T2': 'Orange+Stripe;Blue;Blue+Stripe',
         'T3': 'Yellow;Yellow+Stripe', 'T4': 'Green;Green+Stripe',
         'T5': 'Brown;Brown+Stripe;Beyond'}
END_PARTICLES = ('ครับ', 'ค่ะ', 'คะ')
SOFT = ('นะ', 'สิ')
BANNED = ['ดิฉัน', 'กรุณา', 'มั้ย', 'รึเปล่า', 'เค้า', '555', 'จ้ะ', 'จ้า', 'ซึ่ง', 'จึง',
          'ดังนั้น', 'เนื่องจาก', 'สามารถ', 'ต้องการ', 'อย่างไร', 'ปัจจุบัน', 'ภาพยนตร์',
          'สัปดาห์', 'ห้างสรรพสินค้า', 'รับประทาน', 'อาศัยอยู่', 'สวม', 'เพียง',
          'หรือไม่', 'ขณะที่', 'แล้วไหม', 'กู', 'มึง']
QWORDS = ('ไหม', 'อะไร', 'ไหน', 'ใคร', 'เท่าไหร่', 'กี่', 'ทำไม', 'ยังไง', 'เมื่อไหร่',
          'หรือเปล่า', 'หรือยัง', 'เหรอ', 'ล่ะ', 'บ้าง')

HERE = __file__.rsplit('/', 1)[0]


def load():
    allowed = {}
    for r in csv.DictReader(open(f'{HERE}/thai-allowed-words.csv', encoding='utf-8-sig')):
        allowed[r['thai']] = TIERS.index(r['first_tier'])
    tags = list(csv.DictReader(open(f'{HERE}/thai-word-tags.csv', encoding='utf-8-sig')))
    allowed.setdefault('นึง', allowed['หนึ่ง'])
    for t in tags:
        t.setdefault('subgroup', '')
        t.setdefault('english_slot_2', '')
        t.setdefault('english_plural', '')
    # Work in progress: drafts/*.subgroups (id|subgroup) and drafts/*.slots
    # (id|english_slot|english_plural) are overlaid on the tag rows.
    import glob
    by_id = {t['id']: t for t in tags}
    for p in sorted(glob.glob(f'{HERE}/drafts/*.subgroups')):
        for line in open(p, encoding='utf-8'):
            if line.strip() and not line.startswith('#'):
                i, sg = [x.strip() for x in line.split('|')[:2]]
                if i in by_id and by_id[i]['group'] == sg.split('.')[0]:
                    by_id[i]['subgroup'] = sg   # only a word's own group can be split
    rows = []
    for p in sorted(glob.glob(f'{HERE}/drafts/*.slots')):
        key = p.rsplit('/', 1)[1].rsplit('.', 1)[0].split('@')[0]
        for line in open(p, encoding='utf-8'):
            if not line.strip() or line.startswith('#'):
                continue
            parts = [x.strip() for x in line.rstrip('\n').split('|')] + ['', '']
            if parts[0] in by_id:
                rows.append((key, parts[0], parts[1], parts[2]))
    # first the word's own group, then groups that only have it as second_group
    for key, i, slot, plural in rows:
        t = by_id[i]
        if t['group'] == key:
            t['english_slot'], t['english_plural'] = slot, plural
    for key, i, slot, plural in rows:
        t = by_id[i]
        if t['group'] != key:
            if not t['english_slot']:
                t['english_slot'], t['english_plural'] = slot, plural
            elif t['english_slot'] != slot:
                t['english_slot_2'] = slot
    return allowed, tags


ALLOWED, TAGS = load()
MAXLEN = max(len(w) for w in ALLOWED)


def segment(chunk, tier_i):
    """Return (ok, uncovered_spans). DP that minimises uncovered characters."""
    n = len(chunk)
    INF = 10 ** 9
    best = [INF] * (n + 1)
    back = [None] * (n + 1)
    best[0] = 0
    for i in range(n):
        if best[i] == INF:
            continue
        c = chunk[i]
        if c in '\x01\x02ๆ ,.?!':
            if best[i] < best[i + 1]:
                best[i + 1], back[i + 1] = best[i], (i, True)
            continue
        for L in range(1, min(MAXLEN, n - i) + 1):
            w = chunk[i:i + L]
            t = ALLOWED.get(w)
            if t is not None and t <= tier_i and best[i] < best[i + L]:
                best[i + L], back[i + L] = best[i], (i, True)
        if best[i] + 1 < best[i + 1]:
            best[i + 1], back[i + 1] = best[i] + 1, (i, False)
    spans, j, cur = [], n, []
    while j > 0:
        i, ok = back[j]
        if not ok:
            cur.append(chunk[i])
        elif cur:
            spans.append(''.join(reversed(cur)))
            cur = []
        j = i
    if cur:
        spans.append(''.join(reversed(cur)))
    return best[n] == 0, list(reversed(spans))


def count_words(line):
    """Words in a Thai line, slot = 1 word, final particle(s) not counted."""
    s = line.replace('{CLF}', '{W}')
    parts = s.split('{W}')
    toks = []
    for k, p in enumerate(parts):
        toks += [t for t in word_tokenize(p, engine='newmm') if t.strip() and t not in ('ๆ',)]
        if k < len(parts) - 1:
            toks.append('{W}')
    while toks and toks[-1] in END_PARTICLES + ('นะคะ', 'นะครับ', 'สิคะ', 'สิครับ', 'ไหนคะ', 'นคะ'):
        last = toks.pop()
        if last in ('ไหนคะ',):
            toks.append('ไหน')
        if last == 'นคะ' and toks and toks[-1] == 'ไห':
            toks[-1] = 'ไหน'
    while toks and toks[-1] in SOFT:
        toks.pop()
    return len(toks), toks


def check_row(r, problems):
    mid = r.get('module_id') or f"{r['group']}-{r['tier']}-?"
    tier = r['tier']
    ti = TIERS.index(tier)
    lo, hi = RANGE[tier]
    for f in ('A1', 'B', 'A2'):
        th = r[f + '_thai'].strip()
        en = r[f + '_english']
        pr = r[f + '_prompt']
        if '{W}' not in th:
            problems.append((mid, f, 'no {W} in Thai'))
        if not re.search(r'\{Es?\}', en):
            problems.append((mid, f, 'no {E} or {Es} in English'))
        if not re.search(r'\{Es?\}', pr):
            problems.append((mid, f, 'note: no {E} in prompt'))
        for tok in re.findall(r'\{[^}]*\}', en + pr):
            if tok not in ('{E}', '{Es}', '{a}'):
                problems.append((mid, f, 'unknown English token ' + tok))
        if re.search(r'\b[Aa]n? \{Es?\}', en + ' ' + pr):
            problems.append((mid, f, 'literal a/an before {E}: use {a}'))
        if '/' in en or '/' in pr:
            problems.append((mid, f, 'slash in English or prompt'))
        # vocabulary
        chunk = th.replace('{W}', '\x01').replace('{CLF}', '\x02')
        ok, spans = segment(chunk, ti)
        if not ok:
            problems.append((mid, f, 'NOT ALLOWED at ' + tier + ': ' + ' · '.join(spans)))
        # length
        n, toks = count_words(th)
        if n < lo or n > hi:
            problems.append((mid, f, f'{n} words (range {lo}-{hi}): ' + ' '.join(toks)))
        # banned
        toks_all = word_tokenize(th.replace('{W}', ' ').replace('{CLF}', ' '), engine='newmm')
        for b in BANNED:
            hit = (b in toks_all) if len(b) <= 3 else (b in th)
            if hit:
                problems.append((mid, f, 'banned/written word: ' + b))
        if en.startswith('{E') or en.startswith('{a}'):
            problems.append((mid, f, 'note: English starts with {E}'))
        if re.search(r'(?<!เมื่อ)การ|^การ', th) and 'อาการ' not in th and 'บริการ' not in th:
            pass
        # speaker
        if f in ('A1', 'A2'):
            if not th.endswith('ครับ'):
                problems.append((mid, f, 'A line must end with ครับ'))
            if th.count('ครับ') != 1:
                problems.append((mid, f, 'A line has more than one ครับ'))
            if 'ค่ะ' in th or 'คะ' in th or re.search('ฉัน(?!ท)', th):
                problems.append((mid, f, 'female particle/pronoun in A line'))
            if re.search(r'\bhim\b', pr):
                problems.append((mid, f, 'A prompt says him'))
        else:
            if not (th.endswith('ค่ะ') or th.endswith('คะ')):
                problems.append((mid, f, 'B line must end with ค่ะ/คะ'))
            if th.count('ค่ะ') + th.count('คะ') != 1:
                problems.append((mid, f, 'B line has more than one particle'))
            if 'ครับ' in th or 'ผม' in th.replace('ผมดำ', ''):
                problems.append((mid, f, 'male particle/pronoun in B line'))
            if re.search(r'\bher\b', pr):
                problems.append((mid, f, 'B prompt says her'))
            body = th[:-3] if th.endswith('ค่ะ') else th[:-2]
            isq = any(body.rstrip().endswith(q) or body.rstrip().endswith(q + 'นะ') for q in QWORDS)
            if th.endswith('ค่ะ') and isq:
                problems.append((mid, f, 'question ends with ค่ะ (should be คะ)'))
            if th.endswith('คะ') and not th.endswith('นะคะ') and not th.endswith('สิคะ') and not isq:
                problems.append((mid, f, 'note: statement ends with คะ'))


def in_group(w, group):
    """A word belongs to a module group through its subgroup (if it has one),
    otherwise its group, or through its second_group."""
    own = w.get('subgroup') or w['group']
    return own == group or w['second_group'] == group


def cells_for(group):
    """{tier: [tag rows]} cumulative, counting group/subgroup and second_group."""
    out = {}
    for k, t in enumerate(TIERS):
        out[t] = [w for w in TAGS if in_group(w, group)
                  and w['tier'] in TIERS and TIERS.index(w['tier']) <= k]
    return out


def main(path, only=None):
    rows = list(csv.DictReader(open(path, encoding='utf-8-sig')))
    if only:
        rows = [r for r in rows if r['group'] == only]
    problems = []
    for r in rows:
        check_row(r, problems)
    by_cell = collections.defaultdict(list)
    for r in rows:
        by_cell[(r['group'], r['tier'])].append(r)
    for (g, t), rs in sorted(by_cell.items()):
        cell = cells_for(g)[t]
        ids = {w['id'] for w in cell}
        n_target = min(24, 8 + math.ceil(len(cell) / 10))
        print(f'\n== {g} {t}: {len(rs)} modules (target {n_target}), {len(cell)} words in cell')
        openings = collections.Counter(' '.join(count_words(r['A1_thai'])[1][:2]) for r in rs)
        for o, c in openings.items():
            if c > 1:
                problems.append((f'{g}-{t}', 'A1', f'{c} modules open with {o}'))
        fit = collections.Counter()
        for r in rs:
            ex = {x for x in r['exclude_ids'].split(';') if x}
            bad = ex - ids
            if bad:
                problems.append((r.get('module_id') or g, '-', 'exclude ids not in cell: ' + ';'.join(sorted(bad))))
            fits = [w for w in cell if w['id'] not in ex]
            for w in fits:
                fit[w['id']] += 1
            uses_clf = any('{CLF}' in r[f + '_thai'] for f in ('A1', 'B', 'A2'))
            if uses_clf:
                nocl = [w['thai'] for w in fits if w['classifier'] in ('', '-')]
                if nocl:
                    problems.append((r.get('module_id') or g, '-', '{CLF} used but no classifier for: ' + ', '.join(nocl)))
            if len(fits) == 1:
                # a one-word module may write that word's English directly
                mid0 = r.get('module_id') or g
                problems[:] = [(m, f, 'note: no {E} in English (one-word module)') if m == mid0 and t == 'no {E} or {Es} in English' else (m, f, t)
                               for (m, f, t) in problems]
            share = len(fits) / max(1, len(cell))
            if share < 0.6:
                problems.append((r.get('module_id') or g, '-', f'note: fits {len(fits)}/{len(cell)} words'))
        line = ', '.join(f"{w['thai']}={fit[w['id']]}" for w in cell)
        print('   fits per word:', line)
    print(f'\n{len(problems)} findings')
    for p in problems:
        print('  ', ' | '.join(p))
    return problems


if __name__ == '__main__':
    args = sys.argv[1:]
    g = None
    if '--group' in args:
        i = args.index('--group'); g = args[i + 1]; del args[i:i + 2]
    main(args[0], g)
