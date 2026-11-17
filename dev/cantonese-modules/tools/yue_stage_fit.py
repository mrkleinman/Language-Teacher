#!/usr/bin/env python3
"""Stage fit: how many existing Cantonese gap-fill modules a BEGINNER could use, word by word, for the first 200 words (the beginner teaching order).

For every word of the first 200 positions, take a learner who knows exactly the words BEFORE it plus that word (the list's first p words) plus the free words (free-words.csv) plus the framing
lines (framing-lines.csv), and count the modules of drafts/ALL-modules.csv that
  (1) FIT the word (same cell, module tier at least the word's tier, word not excluded: yue_check.fits), and
  (2) are USABLE: every fixed word of all three lines is a word that learner knows. A line is cut into words with the same dynamic-programming cut the module checker uses, but against the
      learner's words only (the fixed text between the {W} / {M} slots); a module whose line has a stretch the learner cannot read is not usable. A module with {M} also needs the word's classifier
      to be known. (Several cuts can read a stretch, e.g. 好食 or 好 + 食: the cut that needs the earliest-taught words wins, so a stretch counts as readable when ANY cut is.)
Target (stage B): every word of the first 200 has at least 3 usable modules for the learner who knows only the earlier words.

Also written: starter-needs.csv, the exact starter-module needs. A starter module is a module of the same cell whose fixed text uses only words taught by the word's position; it serves every LATER
word of its cell, so the number to write is found cell by cell, word by word in teaching order: a word that has fewer than 3 usable modules (existing + starters already planned) adds the missing ones,
anchored at its position.

Usage:  python3 tools/yue_stage_fit.py                 print the report
        python3 tools/yue_stage_fit.py --write-md      also write starter-needs.csv and the stage-fit block of BEGINNER-ORDER.md
"""
import csv, os, re, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
sys.path.insert(0, HERE)
_argv = sys.argv; sys.argv = ['x']
import yue_check as Z
sys.argv = _argv

N = 200
PUNCT = re.compile(r'[，。？！、；：…\s,.?!"“”「」（）()\-—·]')
INF = 10 ** 9
MARKER_BEGIN, MARKER_END = '<!-- STAGE-FIT BEGIN -->', '<!-- STAGE-FIT END -->'


def rd(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))


def first_positions():
    """surface -> earliest position at which the learner can read it (0 = free word or framing line)."""
    live = [r for r in rd(f'{ROOT}/cantonese-word-tags.csv') if not r['skip']]
    pos = {}
    for r in live:
        k = int(r['rank'])
        if r['word'] not in pos or k < pos[r['word']]: pos[r['word']] = k
    for r in rd(f'{ROOT}/free-words.csv'): pos[r['word']] = 0
    for r in rd(f'{ROOT}/framing-lines.csv'): pos[r['text']] = 0
    return live, pos


def need_position(chunk, pos, maxlen):
    """smallest p such that `chunk` can be read with the words known at position p (bottleneck cut); INF when some stretch is no word of the list."""
    n = len(chunk); best = [INF] * (n + 1); best[0] = 0
    for i in range(n):
        if best[i] == INF: continue
        if PUNCT.match(chunk[i]):
            best[i + 1] = min(best[i + 1], best[i]); continue
        for L in range(1, min(maxlen, n - i) + 1):
            p = pos.get(chunk[i:i + L])
            if p is not None: best[i + L] = min(best[i + L], max(best[i], p))
    return best[n]


def analyse():
    live, pos = first_positions()
    maxlen = max(len(k) for k in pos)
    words = {r['id']: r for r in live}
    mods = [r for r in rd(f'{ROOT}/drafts/ALL-modules.csv') if r.get('status', 'ready') == 'ready']
    bycell = collections.defaultdict(list)
    for w in live: bycell[w.get('subgroup') or w.get('group')].append(w)
    TI = Z.TIERS.index
    need, fit_ids = [], []
    for m in mods:
        req, uses_m = 0, False
        for f in ('A1', 'B', 'A2'):
            zh = m[f + '_yue']
            if '{M}' in zh: uses_m = True
            for ch in re.split(r'\{W\}|\{M\}', zh):
                if ch.strip(): req = max(req, need_position(ch, pos, maxlen))
        ex = {x for x in (m.get('exclude_ids') or '').replace(',', ';').split(';') if x}
        fit = [w['id'] for w in bycell.get(m['group'], []) if TI(w['tier']) <= TI(m['tier']) and w['id'] not in ex]
        need.append((req, uses_m)); fit_ids.append(set(fit))
    return live, pos, words, mods, need, fit_ids, bycell


def main():
    write = '--write-md' in sys.argv
    live, pos, words, mods, need, fit_ids, bycell = analyse()
    first = sorted(live, key=lambda r: int(r['rank']))[:N]
    usable = {}
    byword = collections.defaultdict(list)
    for mi, ids in enumerate(fit_ids):
        for i in ids: byword[i].append(mi)
    for w in first:
        p = int(w['rank']); n = 0
        for mi in byword[w['id']]:
            req, uses_m = need[mi]
            if req > p: continue
            if uses_m and (not w['classifier'] or pos.get(w['classifier'], INF) > p): continue
            n += 1
        usable[w['id']] = n
    # per day table
    days = collections.OrderedDict()
    for w in first:
        d = (int(w['rank']) - 1) // 5 + 1
        c = days.setdefault(d, [0, 0, 0, 0]); c[min(usable[w['id']], 3)] += 1
    tot = [sum(c[i] for c in days.values()) for i in range(4)]
    print('words with 0 / 1 / 2 / 3+ usable modules:', tot, '· all modules', len(mods), '· modules usable with ALL 200 words known:', sum(1 for r, _ in need if r <= N))
    # starter needs, cell by cell in teaching order
    orderrows = {r['id']: r for r in rd(f'{ROOT}/beginner-order.csv')}
    needs = []
    planned = collections.defaultdict(list)                     # cell -> anchors (positions) of starter modules planned
    for w in first:
        p = int(w['rank']); cell = w.get('subgroup') or w.get('group')
        have = usable[w['id']] + sum(1 for a in planned[cell] if a <= p)
        add = max(0, 3 - have)
        planned[cell] += [p] * add
        sent = orderrows.get(w['id'], {}).get('unlocks', '')
        needs.append({'position': p, 'id': w['id'], 'word': w['word'], 'yale': w['yale'], 'tier': w['tier'], 'cell': cell, 'classifier': w['classifier'], 'usable_now': usable[w['id']],
                      'starter_modules_to_write': add, 'unlocks': sent})
    tot_new = sum(n['starter_modules_to_write'] for n in needs)
    short = sum(1 for n in needs if n['usable_now'] < 3)
    short_sum = sum(max(0, 3 - n['usable_now']) for n in needs)
    cells_need = collections.Counter()
    for n in needs:
        if n['starter_modules_to_write']: cells_need[n['cell']] += n['starter_modules_to_write']
    print(f'words below 3: {short} · missing module slots (sum of 3 - usable): {short_sum} · starter modules to write once cell by cell (a starter serves every later word of its cell): {tot_new} in {len(cells_need)} cells')
    for d, c in days.items(): print('day %2d  0:%d 1:%d 2:%d 3+:%d' % (d, *c))
    if write: write_outputs(needs, days, tot, tot_new, cells_need, short, short_sum, mods, need, pos, words, first)


def lean_words(day_sentences, pos, w, p):
    """the earlier words a starter module for `w` (position p) can lean on: the words of the proof sentences of its day that contain it (every one is taught by p), other than w itself and the free words."""
    out = []
    for s in day_sentences:
        if w in s['tokens']:
            for t in s['tokens']:
                if t != w and t not in out and 0 < pos.get(t, INF) <= p: out.append(t)
    return out


DAYSENT = {}


def write_outputs(needs, days, tot, tot_new, cells_need, short, short_sum, mods, need, pos, words, first):
    import yue_beginner_order as O
    days_, order_, _free = O.build(check_only=True)
    for o in order_: DAYSENT[o['id']] = next(d for d in days_ if d['day'] == o['day'])['sentences']
    rows = []
    for n in needs:
        n['leans_on'] = ' '.join(lean_words(DAYSENT.get(n['id'], []), pos, n['word'], n['position'])[:14])
        rows.append({k: n[k] for k in ('position', 'id', 'word', 'yale', 'tier', 'cell', 'classifier', 'usable_now', 'starter_modules_to_write', 'leans_on')})
    with open(f'{ROOT}/starter-needs.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    md = lambda *c: '| ' + ' | '.join(str(x) for x in c) + ' |'
    L = [MARKER_BEGIN,
         '(generated by `python3 tools/yue_stage_fit.py --write-md`; the exact list is `starter-needs.csv`)', '',
         f'For every word of the first 200 positions: a learner who knows exactly the earlier words + that word + the free words + the framing lines; a module is **usable** when it fits the word (same cell, tier, not excluded) and every fixed word of its three lines is a word that learner knows (a {{M}} module also needs the word\'s classifier). The table counts the {len(mods)} modules of `drafts/ALL-modules.csv`.', '',
         md('Day', 'Words', '0 usable', '1 usable', '2 usable', '3+ usable'), md('---', '---', '---', '---', '---', '---')]
    for d, c in days.items(): L.append(md(d, sum(c), *c))
    L.append(md('**All 40 days**', 200, *[f'**{x}**' for x in tot]))
    white = sum(n['starter_modules_to_write'] for n in needs if n['position'] <= 100)
    one = 0
    seen1 = collections.defaultdict(int)
    for n in needs:                                             # modules needed for the weaker target "at least 1 usable module per word"
        cell = n['cell']; have = n['usable_now'] + (1 if seen1[cell] else 0)
        if have < 1: one += 1; seen1[cell] += 1
    L += ['',
          f'**Summary.** {tot[3]} of the 200 words already have 3 or more usable modules; {tot[0]} have none, {tot[1]} one, {tot[2]} two. The shortfall (3 minus usable, summed over the {short} words that are short) is {short_sum} module slots, but a starter module of a cell serves every LATER word of that cell, so planned cell by cell in teaching order the number of starter modules to WRITE is **{tot_new}**, in {len(cells_need)} cells ({white} of them are needed by White, positions 1-100, and {tot_new - white} by Orange, 101-200; that is {tot_new * 3} lines to write). For the weaker target of ONE usable module per word, {one} starter modules would do.',
          '', 'A starter module is a normal gap-fill module (3 lines A / B / A, one `{W}` slot) of the word\'s cell whose fixed text uses only words taught by the word\'s position (plus free words and framing lines). It must carry a tier at least as high as the words it serves (a T2 word such as 再見 can only fill a T2-or-higher module), however simple its text. It then serves every later word of the cell with that tier or lower.', '',
          'Cells that need starter modules (modules to write, in teaching order of the first word that needs them):', '',
          md('Cell', 'Starter modules', 'First word that needs them (position)', 'Words of the cell in the first 200 (position)'), md('---', '---', '---', '---')]
    firstneed = {}
    for n in needs:
        if n['starter_modules_to_write']: firstneed.setdefault(n['cell'], n)
    bycell = collections.defaultdict(list)
    for n in needs: bycell[n['cell']].append(n)
    for cell, k in sorted(cells_need.items(), key=lambda kv: firstneed[kv[0]]['position']):
        fn = firstneed[cell]
        L.append(md(cell, k, f'{fn["word"]} ({fn["position"]})', ' '.join(f'{x["word"]}({x["position"]})' for x in bycell[cell][:12]) + (' ...' if len(bycell[cell]) > 12 else '')))
    L += ['', 'Per word (only the words below 3 usable modules): what a starter module for it can lean on. `leans on` = the words of the proof sentences of that word in this file (all taught by its position), other than the word itself; the free words (names, OK, particles) and the framing lines are always allowed as well. "Starters to write" 0 with 0 usable means an earlier word of the same cell already carries the starters that serve this word too.', '',
          md('Pos', 'Word', 'Cell', 'Tier', 'Usable now', 'Starters to write', 'Can lean on (earlier words)'), md('---', '---', '---', '---', '---', '---', '---')]
    for r in rows:
        if r['usable_now'] < 3: L.append(md(r['position'], r['word'], r['cell'], r['tier'], r['usable_now'], r['starter_modules_to_write'], r['leans_on']))
    L += ['', MARKER_END]
    p = f'{ROOT}/BEGINNER-ORDER.md'
    s = open(p, encoding='utf-8').read()
    assert MARKER_BEGIN in s and MARKER_END in s, 'run tools/yue_beginner_order.py first'
    s = s[:s.index(MARKER_BEGIN)] + '\n'.join(L) + s[s.index(MARKER_END) + len(MARKER_END):]
    open(p, 'w', encoding='utf-8').write(s)
    print('starter-needs.csv and the stage-fit block of BEGINNER-ORDER.md written')


if __name__ == '__main__':
    main()
