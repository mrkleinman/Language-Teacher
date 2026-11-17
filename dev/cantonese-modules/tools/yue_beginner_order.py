#!/usr/bin/env python3
"""The beginner teaching order of the first 200 Cantonese words: check it, and write beginner-order.csv, framing-lines.csv and BEGINNER-ORDER.md.

Source (the only thing edited by hand): beginner-order-src.txt  (40 days of five words, each day with the sentences that prove the day works).
Checked here, any failure stops the run:
  - every word is a live row of cantonese-word-tags.csv (a spelling with two rows needs `word@id`), no word twice, exactly 200 words;
  - a day's sentences use only that day's words, earlier days' words and free words (free-words.csv): the sentence is cut into words with the same dynamic-programming cut the
    module checker uses, against the learner's vocabulary of that day (so a word taught later is an error);
  - every day has at least 4 distinct sentences, every sentence uses at least one new word of its day, every new word of the day appears in some sentence of its day;
  - every Yale (words and sentences) passes the Yale rules the app uses (validate_yale of dev/tools/build_yue_modules.py).
Writes:  beginner-order.csv     position,id,word,yale,day,unlocks   (unlocks = the day's sentences whose LAST-taught word is this word: `中文 [yale] = English`, joined by ` | `)
         framing-lines.csv      the opening and closing lines of a track (written here: the day each word becomes a taught word is read from the ranks of the word list)
         BEGINNER-ORDER.md      the order and the proof (keeps the stage-fit block that tools/yue_stage_fit.py writes between its markers)
Usage:   python3 tools/yue_beginner_order.py            check + write everything
         python3 tools/yue_beginner_order.py --check    check only
"""
import csv, os, re, sys, collections, math
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, '..', 'tools'))
_argv = sys.argv; sys.argv = ['x']
import build_yue_modules as B
sys.argv = _argv

PUNCT = '，。？！、；：…'
MARK = {'，': ',', '。': '.', '？': '?', '！': '!', '、': ',', '；': ';', '：': ':', '…': '…'}
MARKER_BEGIN, MARKER_END = '<!-- STAGE-FIT BEGIN -->', '<!-- STAGE-FIT END -->'


def rd(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))


def load_live():
    rows = [r for r in rd(f'{ROOT}/cantonese-word-tags.csv') if not r['skip']]
    by_id = {r['id']: r for r in rows}
    by_word = collections.defaultdict(list)
    for r in rows: by_word[r['word']].append(r)
    return rows, by_id, by_word


def parse_src(by_word):
    days, cur = [], None
    for ln, line in enumerate(open(f'{ROOT}/beginner-order-src.txt', encoding='utf-8'), 1):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'): continue
        m = re.fullmatch(r'day (\d+)', line.strip())
        if m:
            cur = {'day': int(m.group(1)), 'words': [], 'sentences': [], 'line': ln}; days.append(cur); continue
        if line.startswith('words:'):
            for t in line[6:].split():
                w, _, i = t.partition('@')
                cands = by_word.get(w, [])
                if not cands: raise SystemExit(f'line {ln}: {w} is not a live word')
                if i:
                    row = next((r for r in cands if r['id'] == i), None)
                    if not row: raise SystemExit(f'line {ln}: {w} has no live row with id {i}')
                elif len(cands) > 1: raise SystemExit(f'line {ln}: {w} has {len(cands)} rows ({", ".join(r["id"] for r in cands)}): write {w}@id')
                else: row = cands[0]
                cur['words'].append(row)
            continue
        if ' = ' not in line: raise SystemExit(f'line {ln}: not a sentence (need `Cantonese = English`): {line}')
        zh, en = line.split(' = ', 1)
        cur['sentences'].append({'zh': zh.strip(), 'en': en.strip(), 'line': ln})
    return days


def load_free():
    return {r['word']: r for r in rd(f'{ROOT}/free-words.csv')}


def cut(text, vocab):
    """Cut `text` into known words: fewest unknown characters, then fewest words (the longest words win). vocab: surface -> yale. Returns (tokens, unknown spans)."""
    n = len(text); INF = 10 ** 9; best = [(INF, INF)] * (n + 1); back = [None] * (n + 1); best[0] = (0, 0)
    ml = max(len(k) for k in vocab)
    for i in range(n):
        if best[i][0] == INF: continue
        c = text[i]
        if c in PUNCT or c.isspace():
            if best[i] < best[i + 1]: best[i + 1], back[i + 1] = best[i], (i, 'p')
            continue
        for L in range(1, min(ml, n - i) + 1):
            w = text[i:i + L]
            if w in vocab:
                cand = (best[i][0], best[i][1] + 1)
                if cand < best[i + L]: best[i + L], back[i + L] = cand, (i, 'w')
        cand = (best[i][0] + 1, best[i][1])
        if cand < best[i + 1]: best[i + 1], back[i + 1] = cand, (i, 'u')
    toks, unk, j, cur = [], [], n, []
    while j > 0:
        i, k = back[j]
        if k == 'u': cur.append(text[i])
        else:
            if cur: unk.append(''.join(reversed(cur))); cur = []
            if k == 'w': toks.append(text[i:j])
            elif k == 'p' and text[i] in PUNCT: toks.append(text[i])
        j = i
    if cur: unk.append(''.join(reversed(cur)))
    return list(reversed(toks)), list(reversed(unk))


def yale_of(tokens, ymap):
    out = []
    for t in tokens:
        if t in PUNCT:
            if out: out[-1] += MARK[t]
            continue
        out.append(ymap[t])
    return ' '.join(out)


def build(check_only=False):
    rows, by_id, by_word = load_live()
    free = load_free()
    days = parse_src(by_word)
    errors = []
    err = lambda m: errors.append(m)
    # structure
    if [d['day'] for d in days] != list(range(1, len(days) + 1)): err('days are not 1..N in order')
    seen = {}
    pos = 0; order = []
    for d in days:
        if len(d['words']) != 5: err(f'day {d["day"]}: {len(d["words"])} words (need 5)')
        for r in d['words']:
            pos += 1
            if r['id'] in seen: err(f'day {d["day"]}: {r["word"]} (id {r["id"]}) already taught on day {seen[r["id"]]}')
            seen[r['id']] = d['day']
            order.append({'position': pos, 'id': r['id'], 'word': r['word'], 'yale': r['yale'], 'day': d['day'], 'row': r, 'unlocks': []})
    if pos != 200: err(f'{pos} words (need exactly 200)')
    posof = {o['id']: o['position'] for o in order}
    # vocabulary per day, sentences
    ymap_free = {w: r['yale'] for w, r in free.items()}
    taught = {}                                                    # surface -> list of order rows, grows day by day
    all_sent = []
    for d in days:
        newrows = [o for o in order if o['day'] == d['day']]
        for o in newrows: taught.setdefault(o['word'], []).append(o)
        vocab = dict(ymap_free)
        for w, os_ in taught.items(): vocab[w] = os_[0]['yale']       # a spelling with two rows taught has the same Yale (checked below)
        for w, os_ in taught.items():
            if len({o['yale'] for o in os_}) > 1: err(f'{w} has two taught rows with different Yale')
        used_new, distinct = set(), set()
        for s in d['sentences']:
            toks, unk = cut(s['zh'], vocab)
            if unk: err(f'day {d["day"]} line {s["line"]}: {s["zh"]} uses words not taught by day {d["day"]} or free: {" ".join(unk)}'); continue
            words = [t for t in toks if t not in PUNCT]
            listed = [taught[t][0] for t in words if t in taught]
            new = [o for o in listed if o['day'] == d['day']]
            if not new: err(f'day {d["day"]} line {s["line"]}: {s["zh"]} uses no new word of the day'); continue
            for o in new: used_new.add(o['id'])
            last = max(listed, key=lambda o: o['position'])
            y = yale_of(toks, {**vocab})
            ok, why = B.validate_yale(y)
            if not ok: err(f'day {d["day"]} line {s["line"]}: Yale of {s["zh"]}: {why}')
            if s['zh'] in distinct: err(f'day {d["day"]}: {s["zh"]} twice')
            distinct.add(s['zh'])
            s.update({'tokens': words, 'yale': y, 'last': last})
            last['unlocks'].append(s)
            all_sent.append((d['day'], s))
        if len(distinct) < 4: err(f'day {d["day"]}: only {len(distinct)} distinct sentences (need 4)')
        for o in newrows:
            if o['id'] not in used_new: err(f'day {d["day"]}: {o["word"]} is in no sentence of its day')
    # words and the Yale rules
    for o in order:
        ok, why = B.validate_yale(o['yale'])
        if not ok: err(f'{o["word"]}: Yale {why}')
    if errors:
        print('\n'.join(errors)); raise SystemExit(f'{len(errors)} problem(s)')
    n_s = len(all_sent)
    print(f'order ok: 200 words, {len(days)} days, {n_s} sentences ({min(len(d["sentences"]) for d in days)}-{max(len(d["sentences"]) for d in days)} a day), tiers {dict(collections.Counter(o["row"]["tier"] for o in order))}')
    if check_only: return days, order, free
    write_csv(order)
    write_framing(by_id, by_word, posof)
    write_md(days, order, free, by_id)
    return days, order, free


def write_csv(order):
    with open(f'{ROOT}/beginner-order.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(['position', 'id', 'word', 'yale', 'day', 'unlocks'])
        for o in order:
            w.writerow([o['position'], o['id'], o['word'], o['yale'], o['day'], ' | '.join(f'{s["zh"]} [{s["yale"]}] = {s["en"]}' for s in o['unlocks'])])


# ── the opening and closing lines of a track (the Cantonese twin of MANDARIN_CONVERSATION_BASICS: hello / mm / goodbye) ───────────────────────────────────────────────────────
# (id, role, text, Jyutping for a free word or '' for a list word, English, context, time of day, suits)
FRAMING = [
    ('open-nihou', 'open', '你好', '', 'hello', 'greeting', 'any time', 'the plain hello: every learner meets it on day 1'),
    ('open-zousan', 'open', '早晨', '', 'good morning', 'greeting', 'morning', 'only before noon: a morning track opens with it, an afternoon one with 你好'),
    ('open-halou', 'open', '哈囉', 'haa1 lou1', 'hello (casual)', 'greeting', 'any time', 'the casual English-style hello; free from day 1 (a loanword)'),
    ('open-wai', 'open', '喂', '', 'hey; hello (calling someone, or on the phone)', 'greeting', 'any time', 'for a dialogue that is a phone call or a call across a room'),
    ('close-zoigin', 'close', '再見', '', 'goodbye', 'parting', 'any time', 'the plain goodbye'),
    ('close-baaibaai', 'close', '拜拜', '', 'bye bye', 'parting', 'any time', 'the casual goodbye between friends'),
    ('close-tingyahtgin', 'close', '聽日見', '', 'see you tomorrow', 'parting', 'any time', 'a track that is studied daily: tomorrow there is another one'),
    ('close-zoutau', 'close', '早唞', '', 'good night', 'parting', 'evening / night', 'only for an evening track (the last words of the day)'),
]


def write_framing(by_id, by_word, posof):
    rank = {r['word']: int(r['rank']) for r in rd(f'{ROOT}/cantonese-word-tags.csv') if not r['skip']}
    free = load_free()
    out = []
    for fid, role, text, jp, en, ctx, tod, suits in FRAMING:
        if text in free and text not in rank:
            y = free[text]['yale']; day = ''; pos = ''; note = 'free word: never taught, usable from day 1'
        elif text in free:                                             # a free word that is also a list word (喂): free from day 1, and taught at its own position
            y = by_word[text][0]['yale']; pos = rank[text]; day = math.ceil(pos / 5)
            note = ('free from day 1; also a list word, taught on day %d (position %d)' % (day, pos))
        else:
            row = by_word[text][0]; y = row['yale']
            pos = int(row['rank']); day = math.ceil(pos / 5); note = ('taught on day %d (position %d)' % (day, pos)) + ('' if day <= 40 else ' (after the first 200 words)') + '; usable as framing from day 1 even before it is a target'
        out.append({'id': fid, 'role': role, 'text': text, 'yale': y, 'english': en, 'context': ctx, 'time_of_day': tod, 'suits': suits, 'taught_day': day, 'taught_position': pos, 'note': note})
    with open(f'{ROOT}/framing-lines.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
    print('framing lines:', len(out), '·', sum(1 for r in out if r['role'] == 'open'), 'openers,', sum(1 for r in out if r['role'] == 'close'), 'closers')


def md_row(*cells): return '| ' + ' | '.join(str(c).replace('|', '/') for c in cells) + ' |'


def write_md(days, order, free, by_id):
    p = f'{ROOT}/BEGINNER-ORDER.md'
    keep = ''
    if os.path.exists(p):
        old = open(p, encoding='utf-8').read()
        if MARKER_BEGIN in old and MARKER_END in old: keep = old[old.index(MARKER_BEGIN):old.index(MARKER_END) + len(MARKER_END)]
    if not keep: keep = MARKER_BEGIN + '\n(run `python3 tools/yue_stage_fit.py --write-md` to fill this block)\n' + MARKER_END
    tiers = collections.Counter(o['row']['tier'] for o in order)
    L = ['# Cantonese: the beginner teaching order of the first 200 words', '',
         'Source of truth: `beginner-order-src.txt` (hand-edited), checked and expanded by `tools/yue_beginner_order.py` into `beginner-order.csv` (position, id, word, yale, day, unlocks), `framing-lines.csv` and this page.',
         'Applied by `tools/build_base.py`: the first 200 positions of the word list follow `beginner-order.csv`; every other word keeps its present relative order after them; ids and tiers are untouched.', '',
         '## Why', '',
         'A real day-one track taught 嘅 我 想 巴士 係 (the 80/20 usage order: function words first) and its lines used 狗 名字 乜嘢 多士 鍾意 今日 超市 買咗 ... none of them taught yet, with no greeting and no goodbye.',
         'Usage order is the wrong order for a beginner: a learner needs the words that let them BUILD sentences. So the first 200 words (White 1-100 and Orange 101-200, five new words a day, 40 days) are chosen and ordered by hand:', '',
         '1. Day 1-3: hello, I / you / be / not, thanks, sorry, goodbye, he / she, friend, never mind: a learner can greet, say who they are and be polite on day 1.',
         '2. Day 4-14: feeling, want / eat / drink / need, this / that / what, go / come / home / where, have / not have, numbers and prices: the words of a first meal, a first shop and a first "where is ...".',
         '3. Day 15-21: today / tomorrow / now / what time, family, jobs, Hong Kong, places, transport, parting phrases, we / you (plural) / they and "together".',
         '4. Day 22-28: the learner\'s own survival lines: "I speak a little Cantonese", "I do not understand", "say it again, slowly", "I do not know", "what is your name", "can I", buy / wait / ask / look for, live / work / learn / sleep, the day and the clock.',
         '5. Day 29-40: breakfast and food, drinks, likes, phone and books, clothes, "already / not yet / still", "first / also / again", "why / when / how many", left / right / in front, fast / slow and the stations.', '',
         f'Tiers are untouched (a word keeps the tier of the first release): the 200 words are {tiers["T1"]} T1, {tiers["T2"]} T2 and {tiers["T3"]} T3 words; the other {sum(1 for r in by_id.values() if r["tier"] == "T1") - tiers["T1"]} T1 words (茶餐廳 巴士 嘩 常餐 ...: real words a beginner does not need first) now follow the 200, from rank 201, in their old order.',
         'Words used by a sentence that are NOT yet taught can only be **free words** (`free-words.csv`: names, loanwords, interjections and sentence-final particles) or the **framing lines** (`framing-lines.csv`: opening and closing lines).', '',
         '## The proof: what each day lets a learner say', '',
         'Rule checked by the tool for every day: the learner\'s vocabulary (the words of that day and the days before, plus the free words) can say at least 4 distinct useful sentences that use the day\'s new words, and every new word of the day is in at least one of them.', '']
    for d in days:
        newrows = [o for o in order if o['day'] == d['day']]
        a, b = newrows[0]['position'], newrows[-1]['position']
        belt = 'White' if b <= 100 else 'Orange'
        L += [f'### Day {d["day"]} ({belt}, positions {a}-{b})', '',
              md_row('New word', 'Yale', 'Meaning'), md_row('---', '---', '---')]
        for o in newrows: L.append(md_row(f'{o["position"]} {o["word"]}', o['yale'], o['row']['meaning'].split(';')[0][:50] + ('' if o['row']['tier'] == 'T1' else f' ({o["row"]["tier"]})')))
        L += ['', md_row('Sentence', 'Yale', 'English'), md_row('---', '---', '---')]
        for s in d['sentences']: L.append(md_row(s['zh'], s['yale'], s['en']))
        L.append('')
    L += ['## Free words (`free-words.csv`)', '',
          f'{len(free)} words a sentence may use without the learner having been taught them. Kinds: ' + ', '.join(f'{k} {v}' for k, v in collections.Counter(r['kind'] for r in free.values()).items()) + '. Each row says why a beginner already has it; the Yale is checked with the app\'s Yale rules (`tools/yue_free_words.py`).', '',
          md_row('Word', 'Yale', 'English', 'Kind', 'Why'), md_row('---', '---', '---', '---', '---')]
    for r in free.values(): L.append(md_row(r['word'], r['yale'], r['english'], r['kind'] + (' (also list word %s)' % r['in_list_id'] if r['in_list_id'] else ''), r['source']))
    L += ['', 'Left out on purpose: MTR, app, WhatsApp, Wi-Fi, sorry (no single standard spoken reading), bye bye / taxi / bus (they are the list words 拜拜 的士 巴士). The only Latin-spelled free word is `OK`: the app\'s line check rejects Latin letters, so stage B must let a free word through it.', '',
          '## Framing lines (`framing-lines.csv`)', '',
          'The opening and closing lines of a track, like Mandarin\'s hello / mm / goodbye. They are free as framing from day 1 even before they are targets; `taught_day` is the day the word becomes a taught word.', '',
          md_row('Role', 'Line', 'Yale', 'English', 'Time of day', 'Taught on day'), md_row('---', '---', '---', '---', '---', '---')]
    for r in rd(f'{ROOT}/framing-lines.csv'): L.append(md_row(r['role'], r['text'], r['yale'], r['english'], r['time_of_day'], r['taught_day'] or 'free (never taught)'))
    L += ['', '## Stage fit: how many starter modules stage B must write', '', keep, '']
    open(p, 'w', encoding='utf-8').write('\n'.join(L))
    print('BEGINNER-ORDER.md written')


if __name__ == '__main__':
    build(check_only='--check' in sys.argv)
