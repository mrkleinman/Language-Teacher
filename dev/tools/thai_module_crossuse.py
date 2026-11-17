#!/usr/bin/env python3
"""Cross-use of the Thai gap-fill modules: find, for every module, the bank words OTHER than its own cell that it would also suit.

THE IDEA. A module is written for one cell (a subgroup of words of one type: N_BODY.UPPER = arm, hand, neck ...). Its three lines are
natural for every word of that cell. Many other words would read just as naturally in the same three lines (a shin or an elbow in a
"my {E} hurts" module) but sit in another cell, or in no cell with modules yet, so they never get it. This tool finds those pairs and
writes them to thai-modules/thai-module-word-links.csv, the sibling of thai-module-links.csv (which carries scene / job per module):
  module_id, word_id  = "this module may also be used for this word"
The app (thaiModuleCandidates) adds the linked modules to the word's own cell modules; exclude_ids still win.

WHAT "SAFE" MEANS. A link is applied automatically ONLY when ALL of these hold; everything else is only LISTED for review, never applied:
  1  a noun twin         the word is a NOUN (an N_ group) with the SAME English slot as a noun the module already serves (the module's own
                        cell, not excluded, tier up to the module's), in the same group (so the same slot kind): a synonym or a variant
                        spelling, e.g. แชมป์ and ผู้ชนะเลิศ "champion", ออฟฟิศ and สำนักงาน "office". The module was written, read and reviewed for
                        that twin and the English the learner sees is word for word the same; only the Thai surface changes. Verbs and
                        adjectives are NOT trusted this way (the English slot "call" / "know" / "tell" hides different Thai collocations:
                        เรียก is not โทรหา, รู้ is not รู้จัก), and neither are abbreviations (ด.ช.)
  2  not already served   the module is not in one of the word's own cells (coverage.py keys) and the word is not in its exclude_ids
                        (an exclusion written by the module's author is never overridden)
  3  tier                the module's tier is the word's tier or higher (the app's rule: never below the word's tier)
  4  slot kind           {CLF} only when the word has a classifier; {Es} only when it has an English plural; no English "{E} is / are" frame
                        for a pair / mass word, and the word's own Thai is not already in the module's fixed text
  5  closed vocabulary   the word is not a skipped word and not one of the banned written-style words; the app still re-checks every filled
                        module against THE LEARNER'S own vocabulary before it is offered
  6  render              the English fills without a leftover token (render.py rules: {E} {Es} {a})
The REVIEW class is everything that merely LOOKS natural by evidence, ranked and annotated so a native reader can approve rows quickly (set
status to `applied` by hand, then re-embed): the module uses, around {W}, only neighbours that reviewed modules already use with the word, its cell
or its declared peers (thai-module-peers.csv), in the same group or a peer's group ("frames"); `strong` = all three lines attested and the module
is scene-neutral (every content word of its fixed text is used in at least SPREAD_MIN cells). Frame evidence alone is NOT trusted for automatic use:
sampled by hand it still lets through lines such as "the car will punch someone" or "the sugar will break" (a frame fits, the scene does not).
Every row carries a note: the three frames and their verdict, scene words, number / classifier flags.

Usage (from dev/):
  python3 tools/thai_module_crossuse.py report              what would be linked and the coverage gain; writes nothing
  python3 tools/thai_module_crossuse.py apply               writes thai-module-word-links.csv (applied = SAFE only) + thai-module-word-links-review.csv
  python3 tools/thai_module_crossuse.py apply --promote review-strong
                                                            also applies the strong review rows (an owner / native-reader decision, not the default)
  python3 tools/thai_module_crossuse.py why MODULE_ID WORD_ID    the frames and the verdict for one pair
  python3 tools/thai_module_crossuse.py need [--topic FILE]      per-word module need table (the 60 Muay Thai words or any CSV of word ids)
"""
import csv, os, re, sys
from collections import defaultdict, Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from thai_modules_lib import Data, SRC, TIERS, COMFORT, clean, keys_of, need_of, tier_i

CAP_PER_WORD = 10     # automatic links added to one word at most (best score first)
SPREAD_MIN = 8        # a fixed content word of a module must be used in this many different cells for the module to count as scene-neutral
FUNC_MIN_LEN = 2
WILD_L = {'^'}
WILD_R = {'$', 'ก็', 'ด้วย', 'เลย', 'แล้ว', 'อีก', 'นี้', 'นั้น', 'ไหม', 'เหรอ', 'บ้าง', 'ล่ะ', 'หรือยัง', 'หรือเปล่า', 'จัง', 'สิ', 'นะ'}
END = ('ครับ', 'ค่ะ', 'คะ', 'นะ', 'สิ')
BANNED = ['ดิฉัน', 'กรุณา', 'มั้ย', 'รึเปล่า', 'เค้า', 'จ้ะ', 'จ้า', 'ซึ่ง', 'จึง', 'ดังนั้น', 'เนื่องจาก', 'สามารถ', 'ต้องการ', 'อย่างไร', 'ปัจจุบัน', 'ภาพยนตร์',
          'สัปดาห์', 'ห้างสรรพสินค้า', 'รับประทาน', 'อาศัยอยู่', 'สวม', 'เพียง', 'หรือไม่', 'ขณะที่', 'แล้วไหม', 'กู', 'มึง']
_tok = None


def norm_slot(x):
    """English slot compared loosely: case, 'practise' / 'practice', trailing s"""
    x = re.sub(r'[^a-z ]', '', (x or '').lower()).replace('ise', 'ice').strip()
    return x


def tokenize(s):
    global _tok
    if _tok is None:
        from pythainlp.tokenize import word_tokenize
        _tok = lambda x: [t for t in word_tokenize(x, engine='newmm') if t.strip()]
    return _tok(s)


def frames_of(m):
    """[(left, right, has_clf)] for the three lines of a module."""
    out = []
    for f in ('A1', 'B', 'A2'):
        th = m[f + '_thai']
        i = th.find('{W}')
        left, right = th[:i], th[i + 3:]
        clf = right.startswith('{CLF}')
        right = right.replace('{CLF}', '', 1) if clf else right
        lt = tokenize(left.replace('{CLF}', '').replace('{W}', ' '))
        rt = tokenize(right.replace('{CLF}', '').replace('{W}', ' '))
        l = lt[-1] if lt else '^'
        r = '$'
        for t in rt:
            if t in END:
                continue
            r = t
            break
        out.append((l, r, clf))
    return out


class Cross:
    def __init__(self, data=None):
        self.d = data or Data()
        self.fr = {}                                   # module id -> frames
        self._att = {}                                 # cell key -> (L set, R set, LR set) over that cell's modules
        self.thai_of = {t['id']: clean(t['thai']) for t in self.d.tags}
        self._spread = None
        self._cellwords = None
        self._scene = {}

    def spread(self):
        """token -> number of distinct cells whose modules use it in their fixed text"""
        if self._spread is None:
            cells = defaultdict(set)
            for m in self.d.mods:
                for f in ('A1', 'B', 'A2'):
                    for t in tokenize(m[f + '_thai'].replace('{W}', ' ').replace('{CLF}', ' ')):
                        if len(t) >= FUNC_MIN_LEN and re.search('[฀-๿]', t):
                            cells[t].add(m['group'])
            self._spread = {t: len(c) for t, c in cells.items()}
        return self._spread

    def scene_words(self, m):
        """content words of the module's fixed text that fewer than SPREAD_MIN cells use (its scene)"""
        k = m['module_id']
        if k not in self._scene:
            sp = self.spread(); out = []
            for f in ('A1', 'B', 'A2'):
                for t in tokenize(m[f + '_thai'].replace('{W}', ' ').replace('{CLF}', ' ')):
                    if len(t) >= FUNC_MIN_LEN and re.search('[฀-๿]', t) and sp.get(t, 0) < SPREAD_MIN and t not in out:
                        out.append(t)
            self._scene[k] = out
        return self._scene[k]

    def frames(self, m):
        k = m['module_id']
        if k not in self.fr:
            self.fr[k] = frames_of(m)
        return self.fr[k]

    def attest(self, w):
        """Frames reviewed modules already use with this word: its own cell modules that do not exclude it, and its peers' modules."""
        L, R, LR = set(), set(), set()
        words = [w] + [self.d.byid[p] for p in self.d.peers.get(w['id'], []) if p in self.d.byid]
        for x in words:
            for m in self.d.direct(x):
                for l, r, _ in self.frames(m):
                    L.add(l); R.add(r); LR.add((l, r))
        return L, R, LR

    def pool(self, w):
        groups = {w['group']} | {self.d.byid[p]['group'] for p in self.d.peers.get(w['id'], []) if p in self.d.byid}
        out = []
        for g in groups:
            for m in self.d.mods:
                if m['group'].split('.')[0] == g:
                    out.append(m)
        return out

    def twins(self, m, w):
        """words the module already serves (its own cell, tier up to the module's, not excluded) whose English slot equals the word's"""
        if self._cellwords is None:
            self._cellwords = defaultdict(list)
            for x in self.d.tags:
                for k in keys_of(x):
                    self._cellwords[k].append(x)
        key = norm_slot(w['english_slot'])
        if not key:
            return []
        out = []
        for x in self._cellwords.get(m['group'], []):
            if x['id'] != w['id'] and x['group'] == w['group'] and tier_i(x['tier']) <= m['_t'] and x['id'] not in m['_ex'] and norm_slot(x['english_slot']) == key \
                    and x['id'] not in self.d.skipped:
                out.append(x)
        return out

    def judge(self, m, w, att):
        """-> (class, score, note). class: safe | review | no"""
        if w['id'] in self.d.skipped:
            return 'no', 0, 'skipped word'
        if w['id'] in m['_ex']:
            return 'no', 0, 'excluded by the module'
        if m['_t'] < tier_i(w['tier']):
            return 'no', 0, 'module tier below the word'
        th = self.thai_of[w['id']]
        if any(b in th for b in BANNED):
            return 'no', 0, 'written-style word'
        fx = ''.join(m[f + '_thai'].replace('{W}', '').replace('{CLF}', '') for f in ('A1', 'B', 'A2'))
        if th and th in fx:
            return 'no', 0, 'word already in the fixed text'
        uses_clf = any('{CLF}' in m[f + '_thai'] for f in ('A1', 'B', 'A2'))
        en = ' '.join(m[f + '_english'] + ' ' + m[f + '_prompt'] for f in ('A1', 'B', 'A2'))
        if uses_clf and w['classifier'] in ('', '-'):
            return 'no', 0, 'needs a classifier'
        if '{Es}' in en and not w['english_plural']:
            return 'no', 0, 'needs an English plural'
        if not w['english_slot']:
            return 'no', 0, 'no English slot'
        flags = []
        syn = self.twins(m, w) if (w['group'].startswith('N_') and '.' not in w['thai']) else []
        plural_same = bool(w['english_plural']) and w['english_plural'] == w['english_slot']
        if plural_same and re.search(r'\{E\}\s+(is|was|has|does|isn\'t|doesn\'t|wasn\'t)\b|\b(this|that)\s+\{E\}', en):
            flags.append('English "{E} is" frame with a pair / mass word')
        L, R, LR = att
        fr = self.frames(m)
        ok = pos = full = 0
        parts = []
        for k, (f, (l, r, _)) in enumerate(zip(('A1', 'B', 'A2'), fr)):
            lok = l in WILD_L or l in L
            rok = r in WILD_R or r in R
            lpos = l in L and l not in WILD_L
            rpos = r in R and r not in WILD_R
            if lok and rok:
                ok += 1
            if lpos or rpos:
                pos += 1
            if (l, r) in LR:
                full += 1
            parts.append('%s %s_%s %s' % (f, l if l != '^' else '·', r if r != '$' else '·', ('exact' if (l, r) in LR else 'ok') if lok and rok else ('LEFT?' if not lok else '') + ('RIGHT?' if not rok else '')))
        score = 3 * full + pos + (2 if m['tier'] == w['tier'] else 0)
        note = '; '.join(parts) + ' | ' + ('same-group' if m['group'].split('.')[0] == w['group'] else 'via peer group') + (' | ' + '; '.join(flags) if flags else '')
        scene = self.scene_words(m)
        if scene:
            flags.append('scene words: ' + ' '.join(scene[:6]))
        note = '; '.join(parts) + ' | ' + ('same-group' if m['group'].split('.')[0] == w['group'] else 'via peer group') + (' | ' + '; '.join(flags) if flags else '')
        bad = [x for x in flags if not x.startswith('scene words')]
        if syn and not bad:
            return 'safe', 20 + score, 'noun twin of %s (same English "%s") which this module already serves; module %s%s; frames attested in %d of 3 lines%s' % (
                ' / '.join(self.thai_of[x['id']] for x in syn[:3]), w['english_slot'], m['tier'], '' if m['tier'] == w['tier'] else ' for a %s word' % w['tier'], pos,
                '; scene words: ' + ' '.join(self.scene_words(m)[:5]) if self.scene_words(m) else '')
        if ok == 3 and pos >= 2 and full >= 2 and not flags:
            return 'review-strong', score, note
        if ok == 3 and pos >= 2:
            return 'review', score, note
        if ok >= 2 and pos >= 1:
            return 'review-weak', score, note + (' | thin evidence (%d positive lines)' % pos if ok == 3 else ' | one unattested frame')
        return 'no', score, note

    def run(self):
        """-> {word id: [(cls, score, module, note)]} for every word with at least one safe or review candidate."""
        res = {}
        for w in self.d.tags:
            att = self.attest(w)
            own = {m['module_id'] for k in keys_of(w) for m in self.d.by_cell.get(k, [])}
            cands = []
            for m in self.pool(w):
                if m['module_id'] in own:
                    continue
                cls, score, note = self.judge(m, w, att)
                if cls != 'no':
                    cands.append((cls, score, m, note))
            if cands:
                res[w['id']] = cands
        return res


def choose(d, res, promote=()):
    """The applied set: per word the best safe links (score desc, module id) until the word has COMFORT usable modules, at most CAP_PER_WORD."""
    applied = {}
    for wid, cands in res.items():
        w = d.byid[wid]
        have = len(d.direct(w))
        room = max(0, min(CAP_PER_WORD, COMFORT - have))
        safe = sorted([c for c in cands if c[0] == 'safe' or c[0] in promote], key=lambda c: (-(c[0] == 'safe'), -c[1], c[2]['module_id']))
        if room:
            applied[wid] = safe[:room]
    return applied


def gain(d, applied, thr=None):
    """words that move from below to at-or-above their need; own-tier rule (coverage.py) and tier-or-above rule (the app)."""
    g = {'own': 0, 'app': 0, 'short_before': 0, 'short_after': 0}
    rows = []
    for w in d.tags:
        if w['id'] in d.skipped:
            continue
        need = need_of(w)
        own0, app0 = d.counts(w, with_links=False)
        extra = [c[2] for c in applied.get(w['id'], [])]
        own1 = own0 + sum(1 for m in extra if m['tier'] == w['tier'])
        app1 = app0 + len(extra)
        if own0 < need:
            g['short_before'] += 1
            if own1 >= need:
                g['own'] += 1
            else:
                g['short_after'] += 1
        if app0 < need and app1 >= need:
            g['app'] += 1
        if own0 < need or app0 < need:
            rows.append((w['id'], w['thai'], w['tier'], w['subgroup'] or w['group'], need, own0, app0, own1, app1))
    return g, rows


def kept_author_rows():
    """rows an earlier run or the draft merge wrote with class `author` (declared by the module's writer): never regenerated, never dropped"""
    try:
        return [r for r in csv.DictReader(open(os.path.join(SRC, 'thai-module-word-links.csv'), encoding='utf-8-sig')) if r.get('class') == 'author']
    except FileNotFoundError:
        return []


def write_links(d, res, applied):
    keep = kept_author_rows()
    app_rows, rev_rows = [], []
    for wid, cands in sorted(res.items(), key=lambda x: int(x[0])):
        w = d.byid[wid]
        chosen = {c[2]['module_id'] for c in applied.get(wid, [])}
        thin = len(d.direct(w)) < COMFORT
        for cls, score, m, note in sorted(cands, key=lambda c: (-c[1], c[2]['module_id'])):
            row = [m['module_id'], wid, w['thai'], m['group'], w['subgroup'] or w['group'], m['tier'], w['tier'], 'applied', cls, score, note]
            if m['module_id'] in chosen:
                app_rows.append(row)
            elif cls == 'safe':
                rev_rows.append(row[:7] + ['safe-spare'] + row[8:])
            elif thin and cls in ('review-strong', 'review'):
                rev_rows.append(row[:7] + ['review'] + row[8:])
    for r in keep:
        app_rows.append([r['module_id'], r['word_id'], r['thai'], r['module_cell'], r['word_cell'], r['module_tier'], r['word_tier'], 'applied', 'author', r['score'], r['note']])
    app_rows.sort(key=lambda r: (int(r[1]), r[0]))
    hdr = ['module_id', 'word_id', 'thai', 'module_cell', 'word_cell', 'module_tier', 'word_tier', 'status', 'class', 'score', 'note']
    for name, rows in (('thai-module-word-links.csv', app_rows), ('thai-module-word-links-review.csv', rev_rows)):
        with open(os.path.join(SRC, name), 'w', encoding='utf-8-sig', newline='') as fh:
            wr = csv.writer(fh); wr.writerow(hdr); wr.writerows(rows)
    return len(app_rows), len(rev_rows)


def need_table(d, ids):
    rows = []
    for i in ids:
        w = d.byid.get(i)
        if not w:
            rows.append((i, '?', '', '', 0, 0, 0, 0, 0)); continue
        need = need_of(w)
        own, app = d.counts(w, with_links=False)
        own_l, app_l = d.counts(w, with_links=True)
        rows.append((i, w['thai'], w['tier'], w['subgroup'] or w['group'], need, own, app, own_l, app_l))
    return rows


def main(argv):
    cmd = argv[0] if argv else 'report'
    d = Data()
    if cmd == 'why':
        c = Cross(d); m = d.bymod[argv[1]]; w = d.byid[argv[2]]
        att = c.attest(w)
        print(m['module_id'], '->', w['thai'], w['id'])
        print(c.judge(m, w, att))
        for f in ('A1', 'B', 'A2'):
            print(' ', m[f + '_thai'], '|', m[f + '_english'])
        return
    if cmd == 'need':
        ids = None
        if '--topic' in argv:
            ids = [r['word_id'] for r in csv.DictReader(open(argv[argv.index('--topic') + 1], encoding='utf-8-sig'))]
        rows = need_table(d, ids or [t['id'] for t in d.tags])
        print('id\tthai\ttier\tcell\tneed\town-tier now\ttier+ now\town-tier with links\ttier+ with links')
        for r in rows:
            print('\t'.join(str(x) for x in r))
        return
    c = Cross(d)
    res = c.run()
    promote = tuple(argv[argv.index('--promote') + 1].split(',')) if '--promote' in argv else ()
    applied = choose(d, res, promote)
    g, rows = gain(d, applied)
    if not promote:
        g2, _ = gain(d, choose(d, res, ('review-strong',)))
        print('(if every review-strong row were approved too: %d words lifted to the need by the own-tier rule, %d by the tier-or-above rule, %d still short)' % (g2['own'], g2['app'], g2['short_after']))
    nsafe = sum(1 for v in res.values() for x in v if x[0] == 'safe')
    nrev = sum(1 for v in res.values() for x in v if x[0].startswith('review'))
    nstrong = sum(1 for v in res.values() for x in v if x[0] == 'review-strong')
    napp = sum(len(v) for v in applied.values())
    print('words with candidates %d · safe pairs %d · review pairs %d (strong %d) · applied %d (cap %d per word, comfort %d)' % (len(res), nsafe, nrev, nstrong, napp, CAP_PER_WORD, COMFORT))
    print('words below their need (own-tier rule, coverage.py): %d before -> %d after links (%d lifted to the need)' % (g['short_before'], g['short_after'], g['own']))
    print('words lifted to the need counting every tier the app may use (tier or higher): %d' % g['app'])
    if cmd == 'apply':
        a, r = write_links(d, res, applied)
        print('wrote thai-module-word-links.csv (%d applied) and thai-module-word-links-review.csv (%d rows)' % (a, r))


if __name__ == '__main__':
    main(sys.argv[1:])
