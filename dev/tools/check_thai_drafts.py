#!/usr/bin/env python3
"""Check draft Thai gap-fill modules (the Muay Thai batches, or any new cell) BEFORE they are merged.

  python3 tools/check_thai_drafts.py thai-modules/drafts-muaythai/MT01-modules.csv [more files] [--quiet]
  python3 tools/check_thai_drafts.py FILE --render ID   shows the module filled in for every word it fits (read these as a learner and as a native)

It runs the repo's own row checker (thai-modules/check_modules.py: slots, English tokens, closed vocabulary at the module's tier, length per tier, particles,
banned written-style words, speaker rules) and adds what a NEW cell needs:
  * the module id is `<CELL>-<TIER>-<nn>`, unique across the draft files and the merged set; `group` is a cell that has words in thai-word-tags.csv
  * the module's tier is at least the tier of every word it fits (cell words not in exclude_ids); exclude_ids only names words of the cell
  * the fixed text uses NONE of the 33 new Muay Thai words (they are topic-only: a learner who has not met them would fail the vocabulary gate), and nothing
    from the module's own slot word twice
  * every word the module fits renders cleanly (render.py: {E} {Es} {a}; no leftover brace; {CLF} only if each fitted word has a classifier; {Es} only if
    each has an English plural) and no "{E} is / are" frame for a word whose plural equals its slot (gloves, sweat)
  * the first two tokens of A1 are not used by another module of the cell
  * optional column `serves_ids` (`;`-separated bank word ids of OTHER cells): the writer's own judgement that the module reads naturally for those words
    too. Each must exist, be a word of the same part of speech (group letter), have a tier at or below the module's, not be a skipped word, and render
    cleanly. The merge turns them into cross-use links (class `author`).
Prints, per word of the cells written, how many usable modules it has now (own cell at its own tier) against the need, and the problems. Exit 1 on a problem.
"""
import csv, os, re, sys
from collections import Counter, defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'thai-modules'))
from thai_modules_lib import Data, need_of, tier_i, TIERS, clean

COLS = ['module_id', 'group', 'tier', 'belts', 'status', 'job', 'scene', 'exclude_ids', 'fits_words', 'cell_words',
        'A1_thai', 'A1_english', 'A1_prompt', 'B_thai', 'B_english', 'B_prompt', 'A2_thai', 'A2_english', 'A2_prompt']
BELTS = {'T1': 'White;Orange', 'T2': 'Orange+Stripe;Blue;Blue+Stripe', 'T3': 'Yellow;Yellow+Stripe', 'T4': 'Green;Green+Stripe', 'T5': 'Brown;Brown+Stripe;Beyond'}
TOPIC_NEW_MIN_ID = 5500            # the new Muay Thai topic words are ids 5502-5559


def read_drafts(paths):
    rows = []
    for p in paths:
        for r in csv.DictReader(open(p, encoding='utf-8-sig')):
            r['_file'] = os.path.basename(p)
            rows.append(r)
    return rows


def render_for(r, w):
    """filled English of the module's six English / prompt fields for word w (render.py rules); (list of strings, problems)"""
    import render
    slot, plural = render.english_for(w, r['group'])
    out, probs = [], []
    if not slot:
        return out, ['no english_slot']
    for f in ('A1_english', 'A1_prompt', 'B_english', 'B_prompt', 'A2_english', 'A2_prompt'):
        t = r[f]
        if '{Es}' in t and not plural:
            probs.append(f + ': no english_plural for {Es}')
        s = render.fill(t, slot, plural)
        out.append(s)
        if re.search(r'[{}]', s) or any(render.article(m.group(2)) != m.group(1).lower() for m in re.finditer(r'\b([Aa]n?) ([A-Za-z][\w-]*)', s)):
            probs.append(f + ': ' + s)
        if plural and plural == slot and re.search(r'\{E\}\s+(is|was|has|does|isn\'t|doesn\'t|wasn\'t)\b|\b(this|that)\s+\{E\}', t):
            probs.append(f + ': "{E} is/are" with a pair / mass word')
    return out, probs


def fixed_text(r):
    return ' '.join(r[f + '_thai'].replace('{W}', ' ').replace('{CLF}', ' ') for f in ('A1', 'B', 'A2'))


def check(rows, data, quiet=False):
    import check_modules as cm
    probs = []
    P = lambda mid, f, msg: probs.append((mid, f, msg))
    new_words = [clean(t['thai']) for t in data.tags if t['id'].isdigit() and int(t['id']) >= TOPIC_NEW_MIN_ID and int(t['id']) < 6000]
    ids = Counter(r['module_id'] for r in rows)
    existing = set(data.bymod) | {m['module_id'] for m in data.mods}
    cellwords = defaultdict(list)
    for t in data.tags:
        cellwords[t['subgroup'] or t['group']].append(t)
    op = defaultdict(list)
    for r in rows:
        mid = r['module_id']
        if not all(c in r for c in COLS):
            P(mid, '-', 'the header lacks columns of the BRIEF header: ' + ', '.join(c for c in COLS if c not in r)); continue
        if ids[mid] > 1: P(mid, '-', 'duplicate module id in the drafts')
        if mid in existing: P(mid, '-', 'module id already used in thai-modules.csv')
        if not re.fullmatch(r'[A-Z_]+(\.[A-Z0-9_]+)?-T[1-5]-\d\d', mid): P(mid, '-', 'module id is not <CELL>-<TIER>-<nn>')
        if r['status'] != 'ready': P(mid, '-', 'status must be ready')
        if r['tier'] not in TIERS: P(mid, '-', 'bad tier'); continue
        if r.get('belts') and r['belts'] != BELTS[r['tier']]: P(mid, '-', 'belts should be ' + BELTS[r['tier']])
        if mid.rsplit('-', 2)[0] != r['group'] or mid.rsplit('-', 2)[1] != r['tier']: P(mid, '-', 'module id does not match group and tier')
        cw = cellwords.get(r['group'], [])
        if not cw: P(mid, '-', 'no word is tagged with the cell ' + r['group']); continue
        ex = {x for x in (r.get('exclude_ids') or '').split(';') if x}
        bad_ex = ex - {t['id'] for t in cw}
        if bad_ex: P(mid, '-', 'exclude_ids not words of the cell: ' + ';'.join(sorted(bad_ex)))
        fits = [t for t in cw if t['id'] not in ex and tier_i(t['tier']) <= tier_i(r['tier'])]
        if not fits: P(mid, '-', 'fits no word of the cell at this tier'); continue
        higher = [t['thai'] for t in cw if t['id'] not in ex and tier_i(t['tier']) > tier_i(r['tier'])]
        # (a word of a higher tier simply does not use this module: that is fine, say nothing)
        ft = fixed_text(r)
        for nw in new_words:
            if nw in ft: P(mid, '-', 'the fixed text uses the topic-only word ' + nw + ' (a learner who has not met it fails the vocabulary gate): use a bank word')
        if any('{CLF}' in r[f + '_thai'] for f in ('A1', 'B', 'A2')):
            no = [t['thai'] for t in fits if t['classifier'] in ('', '-')]
            if no: P(mid, '-', '{CLF} used but no classifier for: ' + ', '.join(no))
        for t in fits:
            _, rp = render_for(r, t)
            for x in rp: P(mid, '-', 'render ' + t['thai'] + ' ' + x)
            if clean(t['thai']) in ft: P(mid, '-', 'the fixed text already contains the fitted word ' + t['thai'])
        o = ' '.join(cm.count_words(r['A1_thai'])[1][:2])
        op[(r['group'], r['tier'])].append((mid, o))
        sv = [x for x in (r.get('serves_ids') or '').split(';') if x]
        for x in sv:
            w = data.byid.get(x)
            if not w: P(mid, '-', 'serves_ids: no word ' + x); continue
            if x in {t['id'] for t in cw}: P(mid, '-', 'serves_ids: ' + w['thai'] + ' is a word of the cell (use exclude_ids)')
            if w['group'][0] != r['group'][0] or w['group'].split('_')[0] != r['group'].split('_')[0]: P(mid, '-', 'serves_ids: ' + w['thai'] + ' is a different part of speech (' + w['group'] + ')')
            if tier_i(w['tier']) > tier_i(r['tier']): P(mid, '-', 'serves_ids: ' + w['thai'] + ' is a ' + w['tier'] + ' word, above the module')
            if x in data.skipped: P(mid, '-', 'serves_ids: ' + w['thai'] + ' is a skipped word')
            if any('{CLF}' in r[f + '_thai'] for f in ('A1', 'B', 'A2')) and w['classifier'] in ('', '-'): P(mid, '-', 'serves_ids: ' + w['thai'] + ' has no classifier')
            _, rp = render_for(r, w)
            for y in rp: P(mid, '-', 'serves_ids render ' + w['thai'] + ' ' + y)
    for (g, t), lst in op.items():
        for o, c in Counter(o for _, o in lst).items():
            if c > 1: P(g + '-' + t, 'A1', '%d modules open with %s' % (c, o))
        for m in data.by_cell.get(g, []):
            if m['tier'] == t:
                o0 = ' '.join(cm.count_words(m['A1_thai'])[1][:2])
                for mid, o in lst:
                    if o == o0: P(mid, 'A1', 'opens like the merged module ' + m['module_id'])
    # the repo's own row checks (vocabulary at the module's tier, length, particles, English tokens)
    rp = []
    for r in rows:
        if r['tier'] in TIERS: cm.check_row(r, rp)
    for mid, f, msg in rp:
        if msg.startswith('note:'):
            continue
        probs.append((mid, f, msg))
    return probs


def per_word(rows, data):
    cells = {r['group'] for r in rows}
    extra = defaultdict(list)
    for r in rows:
        extra[r['group']].append(r)
    out = []
    for t in data.tags:
        c = t['subgroup'] or t['group']
        if c not in cells: continue
        own = [m for m in data.direct(t) if m['tier'] == t['tier']]
        new = [r for r in extra[c] if r['tier'] == t['tier'] and t['id'] not in {x for x in (r.get('exclude_ids') or '').split(';') if x}]
        out.append((t['id'], t['thai'], t['tier'], c, need_of(t), len(own), len(new)))
    return out


def main(argv):
    quiet = '--quiet' in argv
    if '--render' in argv:
        i = argv.index('--render'); mid = argv[i + 1]; files = [a for a in argv[:i] if not a.startswith('--')]
        data = Data(); rows = read_drafts(files); r = next(x for x in rows if x['module_id'] == mid)
        ex = {x for x in (r.get('exclude_ids') or '').split(';') if x}
        for t in data.tags:
            if (t['subgroup'] or t['group']) == r['group'] and t['id'] not in ex and tier_i(t['tier']) <= tier_i(r['tier']):
                clf = t['classifier'] if t['classifier'] not in ('', '-') else ''
                print('---', t['thai'], t['english_slot'])
                en, _ = render_for(r, t)
                for f, e in zip(('A1', 'B', 'A2'), (en[0], en[2], en[4])):
                    print(' ', f, r[f + '_thai'].replace('{W}', t['thai']).replace('{CLF}', clf), '|', e)
        return 0
    files = [a for a in argv if not a.startswith('--')]
    data = Data(); rows = read_drafts(files)
    probs = check(rows, data, quiet)
    if not quiet:
        print('%d modules in %d file(s)' % (len(rows), len(files)))
        short = 0
        print('word\ttier\tcell\tneed\tmerged now\tin the drafts')
        for i, th, tr, c, need, own, new in per_word(rows, data):
            flag = '' if own + new >= need else '   <-- SHORT'
            short += 1 if own + new < need else 0
            print('%s %s\t%s\t%s\t%d\t%d\t%d%s' % (i, th, tr, c, need, own, new, flag))
        print('words still short:', short)
    for p in probs:
        print('PROBLEM', ' | '.join(p))
    print('%d problem(s)' % len(probs))
    return 1 if probs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
