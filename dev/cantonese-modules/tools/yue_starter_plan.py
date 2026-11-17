#!/usr/bin/env python3
"""Turn the stage-fit result (yue_stage_fit.py, starter-needs.csv) into the eight writer batches drafts/starter/SS01.csv ... SS08.csv.

A starter module (id `<CELL>-<tier>-S<nn>`, checked by yue_check.py's starter rule) uses only the words taught BEFORE the first word it fits, the free words and its own {W} word.
It serves every word of its cell that comes at or after that word, with a tier at or below the module's own tier.

Plan, cell by cell in teaching order (the same greedy as yue_stage_fit.py, but TIER-AWARE: a T1 starter cannot fit a T2 word, so a T2 word after T1 starters needs its own T2 modules):
  have(word) = existing usable modules + planned starters that start at or before the word and have a tier at least the word's tier;  add = max(0, 3 - have), anchored at the word.
A line of a batch is one (cell, tier): `modules` is the MINIMUM number to write (the number the greedy needs when every module fits every later word of the cell it can); a cell whose words
cannot share one frame (greetings, polite phrases, pronouns) will need more: yue_starter_cov.py says which words are still below 3, and a writer keeps going until none is.

Columns of a batch line
  cell, tier            the cell and the tier of the modules to write (a module of this tier fits the cell's words of this tier or below)
  modules               minimum number of modules for this line (ids <cell>-<tier>-S<nn>, nn running over the whole file for that cell and tier from 01)
  up_to                 the most that can be needed: the sum of (3 - existing usable) over the anchors and `serve` words, i.e. if no module could fit more than one of them
  anchors               the words that create the need: `word(id) p<position> d<day>` (a module must fit the first of them; its vocabulary is the words BEFORE its first fitting word)
  anchor_ids            their ids, `;`-separated
  serve                 the later words of the cell (first 200, tier at most the line tier) that still have fewer than 3 usable modules: a module should fit as many as read naturally
  serve_ids
  vocab                 what the first anchor allows: the taught words before it (count) and the lean-on words of its day, the free words are always allowed
  exclude_anchors_only  exclude_ids that make a module fit exactly the anchors; exclude_anchors_plus_serve: fit the anchors and the `serve` words. Start from the right one, trim as you test.
Usage: python3 tools/yue_starter_plan.py            writes drafts/starter/SS01.csv .. SS08.csv and prints the batch table
"""
import csv, os, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
sys.path.insert(0, HERE)
import yue_stage_fit as F
Z = F.Z
NB = 8; WANT = 3


def usable_existing():
    """per word id of the first 200: the existing NON-starter modules usable by the learner who knows exactly the earlier words (the rule of yue_stage_fit.py)"""
    live, pos, words, mods, need, fit_ids, bycell = F.analyse()
    first = sorted(live, key=lambda r: int(r['rank']))[:F.N]
    byword = collections.defaultdict(list)
    for mi, ids in enumerate(fit_ids):
        if Z.is_starter(mods[mi]['module_id']): continue
        for i in ids: byword[i].append(mi)
    usable = {}
    for w in first:
        p = int(w['rank']); n = 0
        for mi in byword[w['id']]:
            req, uses_m = need[mi]
            if req > p: continue
            if uses_m and (not w['classifier'] or pos.get(w['classifier'], F.INF) > p): continue
            n += 1
        usable[w['id']] = n
    return first, usable, pos


def exclude_for(cell, tier, keep):
    ti = Z.TIERS.index(tier)
    return ';'.join(sorted((w['id'] for w in Z.WORDS.values() if not w.get('skip') and (w.get('subgroup') or w.get('group')) == cell and Z.TIERS.index(w['tier']) <= ti and w['id'] not in keep), key=int))


def plan():
    first, usable, pos = usable_existing()
    leans = {r['id']: r['leans_on'] for r in F.rd(f'{ROOT}/starter-needs.csv')}
    TI = Z.TIERS.index
    bycell = collections.defaultdict(list)
    for w in first: bycell[w.get('subgroup') or w.get('group')].append(w)
    lines = []
    for cell, ws in bycell.items():
        planned = []                                            # (position, tier)
        anchors = collections.defaultdict(list)                 # tier -> [(word, add)]
        for w in ws:
            p = int(w['rank'])
            have = usable[w['id']] + sum(1 for (a, t) in planned if a <= p and TI(t) >= TI(w['tier']))
            add = max(0, WANT - have)
            if add: planned += [(p, w['tier'])] * add; anchors[w['tier']].append((w, add))
        for tier, an in anchors.items():
            a0 = int(an[0][0]['rank']); anchor_ids = {w['id'] for w, _ in an}
            # words that rely on these modules: later words of the cell, tier <= the line tier, still short of 3 usable existing modules, not themselves anchors
            serve = [w for w in ws if int(w['rank']) >= a0 and TI(w['tier']) <= TI(tier) and w['id'] not in anchor_ids and usable[w['id']] < WANT]
            n_before = sum(1 for q in Z.starter_data()[0].values() if q < a0)
            lean = leans.get(an[0][0]['id'], '')
            fmt = lambda w: f"{w['word']}({w['id']}) p{w['rank']} d{(int(w['rank']) - 1) // 5 + 1}"
            lines.append({
                'cell': cell, 'tier': tier, 'modules': sum(a for _, a in an), 'first': a0,
                'up_to': sum(max(0, WANT - usable[w['id']]) for w in [x for x, _ in an] + serve),
                'anchors': ' | '.join(fmt(w) + f' [existing {usable[w["id"]]}, +{a}]' for w, a in an), 'anchor_ids': ';'.join(w['id'] for w, _ in an),
                'serve': ' | '.join(fmt(w) + f' [existing {usable[w["id"]]}]' for w in serve), 'serve_ids': ';'.join(w['id'] for w in serve),
                'vocab': (f'the {n_before} words taught at positions 1-{a0 - 1}' if a0 > 1 else 'no taught word: free words only') + (f'; the words of its day sentences: {lean}' if lean else '') +
                         f'; free words; run: python3 tools/yue_check.py starter-allowed {" ".join(w["id"] for w, _ in an)}' + (' --tier ' + tier if tier != an[0][0]['tier'] else ''),
                'exclude_anchors_only': exclude_for(cell, tier, anchor_ids),
                'exclude_anchors_plus_serve': exclude_for(cell, tier, anchor_ids | {w['id'] for w in serve}),
            })
    return lines


def batches(lines):
    """contiguous groups of cells in teaching order (by the first position of the cell's first line), about equal in modules; a cell is never split"""
    cells = collections.OrderedDict()
    for l in sorted(lines, key=lambda l: (l['first'], l['cell'], l['tier'])): cells.setdefault(l['cell'], []).append(l)
    order = sorted(cells, key=lambda c: min(l['first'] for l in cells[c]))
    total = sum(l['modules'] for l in lines)
    out = [[] for _ in range(NB)]; acc = 0; b = 0
    for c in order:
        m = sum(l['modules'] for l in cells[c])
        # move to the next file when this cell would end nearer the next boundary than the current one
        while b < NB - 1 and abs(acc + m - total * (b + 1) / NB) > abs(acc - total * (b + 1) / NB) and out[b]: b += 1
        out[b] += cells[c]; acc += m
    return out


def main():
    lines = plan()
    out = batches(lines)
    cols = ['cell', 'tier', 'modules', 'up_to', 'anchors', 'anchor_ids', 'serve', 'serve_ids', 'vocab', 'exclude_anchors_only', 'exclude_anchors_plus_serve']
    os.makedirs(f'{ROOT}/drafts/starter', exist_ok=True)
    print('file   lines modules/up_to words  positions    days   first cells')
    for i, b in enumerate(out, 1):
        with open(f'{ROOT}/drafts/starter/SS{i:02d}.csv', 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(b)
        firsts = {}
        for l in b: firsts[l['cell']] = min(firsts.get(l['cell'], 999), l['first'])
        pos = list(firsts.values())
        words = len({i2 for l in b for i2 in (l['anchor_ids'] + ';' + l['serve_ids']).split(';') if i2})
        print(f'SS{i:02d}  {len(b):5d} {sum(l["modules"] for l in b):7d}/{sum(l["up_to"] for l in b):<4d} {words:5d}  {min(pos):4d}-{max(pos):<4d}  {(min(pos) - 1) // 5 + 1:2d}-{(max(pos) - 1) // 5 + 1:<2d}  ' + ' '.join(sorted({l["cell"] for l in b}, key=lambda c: min(l['first'] for l in b if l['cell'] == c))[:3]))
    print('total modules (minimum)', sum(l['modules'] for l in lines), 'up to', sum(l['up_to'] for l in lines), 'in', len(lines), 'lines,', len({l['cell'] for l in lines}), 'cells')


if __name__ == '__main__':
    main()
