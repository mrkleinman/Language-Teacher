#!/usr/bin/env python3
"""Checker / renderer for the Cantonese gap-fill modules (colloquial spoken Cantonese, traditional characters, Yale).

Usage:  python3 tools/zh_check.py FILE.csv [--group CELL] [--quiet]
        python3 tools/zh_check.py render FILE.csv MODULE_ID [WORD_ID]
        python3 tools/zh_check.py words CELL [TIER]      python3 tools/zh_check.py allowed T1
        python3 tools/yue_check.py starter-allowed MODULE_ID_OR_WORD_ID [WORD_ID ...] [--tier T2]     (starter modules, see below)
        python3 tools/yue_check.py FILE.csv --quiet --against drafts/ALL-modules.csv                 (also compare the opening of every A1 with the rows of the other file)

Module CSV columns: module_id,group,tier,belts,status,job,scene,exclude_ids,fits_words,cell_words,A1_yue,A1_english,A1_prompt,B_yue,B_english,B_prompt,A2_yue,A2_english,A2_prompt
Cantonese slot tokens: {W} the word (never changes form); {M} its classifier (only when every fitting word has one).
English slot tokens: {E} {Es} {a}.
There is no tokeniser: a line is segmented against the closed word list (the same dynamic-programming method the Thai checker uses): every
character must be covered by an allowed word at the module's tier or by a free grammar word.

STARTER MODULES (stage B of the beginner order): a module whose id has the segment `-S<nn>` (`N_DRINK.WATER-T1-S03`, id = <CELL>-<tier>-S<nn>) is a starter module. Its vocabulary is NOT
the tier list. The learner who meets it knows only the words taught before its target word, so the allowed vocabulary of a starter module is
  (a) the words at curriculum positions STRICTLY BEFORE the first position among the words the module fits (position = `rank` of cantonese-word-tags.csv = beginner-order.csv for the
      first 200; a spelling with two rows counts from its earliest row, the same rule tools/yue_stage_fit.py uses for the learner),
  (b) the free words of free-words.csv (names, loanwords, interjections, particles) written in CHARACTERS (阿明, not Latin letters: the app rejects Latin letters in a line, so `OK` is
      not usable), plus the checker's own free particles,
  (c) the module's own target word(s) in the {W} slot (and its classifier in {M}, which must be taught by the target's own position).
Everything else is checked as for any module (slots, English, prompts, particles, Mandarin forms, A man / B woman wording, the opening clash), with these differences:
  - length: a starter line may be as short as 2 words AND 3 characters (counting the slot as its shortest fitting word), because a day-one learner has almost no words; the maximum of the
    tier stays (T1 5 words ...). Longer is allowed up to the maximum, but the point is a short, natural beginner exchange.
  - fits_words must be explicit and small: a starter module may fit only words of the first 200 positions (the words the beginner order teaches); every other word of the cell up to the
    tier (the words beyond position 200, and any word the lines do not suit) goes into exclude_ids, exactly as the TV top-up writers did. `starter-allowed` prints that list.
  - the module tier may be higher than the lowest fitting word (a T2 target needs a T2-or-higher module) but never lower: a module only fits words of its own tier or below.
  - no Latin letters in a line.
`starter-allowed` prints the exact vocabulary a writer may use for a target (a word id) or for an existing starter module (its id).
Tools that cut a module's lines into words (the app's build) should call module_cut(row, chunk): it uses this rule for a starter module and the tier list for every other module.
"""
import csv, re, sys, os, collections
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TIERS = ['T1', 'T2', 'T3', 'T4', 'T5']
RANGE = {'T1': (2, 5), 'T2': (4, 8), 'T3': (6, 10), 'T4': (7, 12), 'T5': (8, 14)}
# free grammar words (not in the list as teachable words, always allowed) - sentence particles and aspect/structural particles
FREE = ['呀', '啊', '啦', '喇', '囉', '嘛', '喎', '啩', '噃', '咯', '吖', '啫', '哦', '噢', '嗯', '喂', '哎', '哇', '嘿', '哈']   # sentence-final and calling particles only; every other word must be a word of the list
FINAL_PARTICLES = ('呢', '啊', '呀', '嘛', '啦', '喇', '囉', '喎', '啩', '噃', '咯', '吖', '啫', '咩', '㗎', '架', '哦', '噢')
BANNED = ['屌', '𨳒', '撚', '柒頭', '仆街', '冚家', '死', 'on9', '您', '貴姓', '敬請', '幸會']                                     # rude / stiff
MANDARIN = ['的', '了', '是', '不', '在', '他', '她', '它', '們', '這', '那', '什麼', '什么', '怎麼', '怎么', '沒', '嗎', '吧', '為什麼', '為甚麼', '還是', '很', '都是', '吃', '看', '說', '沒有', '現在', '今天', '明天', '昨天', '喜歡', '謝謝']   # Mandarin forms: a Cantonese line never uses them (唔 係 喺 佢 哋 呢 嗰 乜嘢 點樣 冇 啩 仲 好 食 睇 講 而家 今日 聽日 琴日 鍾意 多謝 …)
FORMAL = ['並且', '然而', '因此', '因而', '以及', '從而', '之間', '所以說', '故此', '亦即', '乃是', '倘若']
ENDS = ('。', '？', '！', '…', '?', '!')

def load_words():
    return {r['id']: r for r in csv.DictReader(open(f'{HERE}/cantonese-word-tags.csv', encoding='utf-8-sig'))}
WORDS = load_words()
ALLOWED = {}      # form -> first tier index
for w in WORDS.values():
    if w.get('skip'): continue                      # a skipped word (written-style, Mandarin-only, exam-only ...) is not vocabulary a line may use
    ti = TIERS.index(w['tier'])
    forms = {w['word']}
    for f in forms:
        if f not in ALLOWED or ALLOWED[f] > ti: ALLOWED[f] = ti
MAXLEN = max(len(k) for k in ALLOWED)
FREE_SET = set(FREE)

def segment(chunk, tier_i, vocab=None, free=None):
    """DP: cover chunk with allowed words (tier <= tier_i) or free grammar words; punctuation and spaces are free. Returns (ok, uncovered spans, tokens).
    vocab (a set of surfaces) replaces the tier list (starter modules); free (a set) replaces FREE_SET as the uncounted free particles."""
    free_set = FREE_SET if free is None else free
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
            known = (w in vocab) if vocab is not None else (t is not None and t <= tier_i)
            if known or w in free_set:
                # a multi-character FREE word (一下) must win over its characters (一 + 下 would count 2 content units); a one-character free particle
                # still loses a tie to a real word of the same span
                cost = (-0.01 if len(w) > 1 else 0.0001) if w in free_set else 0
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
    # ok = nothing uncovered. (It used to be `best[n] < 1`: the -0.01 bonus of the free word 一下 let ONE uncovered character through in a line that contained 一下.)
    spans = list(reversed(spans))
    return not spans, spans, list(reversed(tokens))

def units(tokens, slots, free=None):
    """content units: segmented words (not free particles), slot sentinels counted by the caller"""
    fs = FREE_SET if free is None else free
    return len([t for t in tokens if t not in fs])


# ── starter modules ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
STARTER_ID = re.compile(r'-S\d\d$')
STARTER_LAST = 200                        # a starter module serves the words of the beginner order only
STARTER_MIN_UNITS, STARTER_MIN_CHARS = 2, 3
LATIN = re.compile(r'[A-Za-z]')
_STARTER = {}

def is_starter(mid): return bool(STARTER_ID.search(mid))

def starter_data():
    """(first position per surface, counted free words, uncounted free words (particles / interjections), free words that are Latin-spelled and so unusable)"""
    if not _STARTER:
        pos = {}
        for w in WORDS.values():
            if w.get('skip'): continue
            k = int(w['rank'])
            if w['word'] not in pos or k < pos[w['word']]: pos[w['word']] = k
        counted, uncounted, latin = {}, set(FREE), []
        p = f'{HERE}/free-words.csv'
        if os.path.exists(p):
            for r in csv.DictReader(open(p, encoding='utf-8-sig')):
                if LATIN.search(r['word']): latin.append(r['word']); continue
                if r['kind'] in ('particle', 'interjection'): uncounted.add(r['word'])
                else: counted[r['word']] = r
        _STARTER.update(pos=pos, counted=counted, uncounted=uncounted, latin=latin)
    return _STARTER['pos'], _STARTER['counted'], _STARTER['uncounted'], _STARTER['latin']

def starter_first(fw):
    """the first position among the module's fitting words (the learner knows only the words before it)"""
    return min(int(w['rank']) for w in fw)

def starter_vocab(first):
    pos, counted, uncounted, _ = starter_data()
    return {s for s, p in pos.items() if p < first} | set(counted), uncounted

def module_cut(r, chunk):
    """cut a stretch of fixed text of module row r into words: the starter rule for a starter module, the tier list for any other. (ok, uncovered spans, tokens)"""
    if is_starter(r['module_id']):
        fw = [w for w in fits(r) if int(w['rank']) <= STARTER_LAST]
        if fw:
            vocab, unc = starter_vocab(starter_first(fw))
            return segment(chunk, 0, vocab, unc)
    return segment(chunk, TIERS.index(r['tier']))

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
    return line.replace('{W}', w['word']).replace('{M}', w.get('classifier', '') or '？M')

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
    st = is_starter(mid); vocab = unc = None
    if st:
        lo = STARTER_MIN_UNITS
        if not mid.startswith(f"{r['group']}-{tier}-S"): problems.append((mid, '-', f"starter module id must be <CELL>-<tier>-S<nn> = {r['group']}-{tier}-S<nn>"))
        late = [f"{w['word']}({w['id']}, position {w['rank']})" for w in fw if int(w['rank']) > STARTER_LAST]
        if late: problems.append((mid, '-', f'starter module fits words beyond position {STARTER_LAST}: put their ids in exclude_ids: ' + ' '.join(late)))
        fw = [w for w in fw if int(w['rank']) <= STARTER_LAST]
        if fw:
            first = starter_first(fw); vocab, unc = starter_vocab(first)
            if any('{M}' in r[f + '_yue'] for f in ('A1', 'B', 'A2')):
                pos = starter_data()[0]
                for w in fw:
                    c = w.get('classifier')
                    if c and pos.get(c, 10 ** 9) > int(w['rank']): problems.append((mid, '-', f"classifier {c} of {w['word']} is taught at position {pos.get(c, 'never')}, after the word ({w['rank']}): exclude {w['word']}"))
    for f in ('A1', 'B', 'A2'):
        zh, en, pr = r[f + '_yue'].strip(), r[f + '_english'], r[f + '_prompt']
        if '{W}' not in zh: problems.append((mid, f, 'no {W} in Mandarin'))
        if '{M}' in zh and any(not w.get('classifier') for w in fw): problems.append((mid, f, '{M} used but some fitting word has no classifier'))
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
        for b in MANDARIN:
            if b in zh.replace('{W}', '').replace('{M}', ''): problems.append((mid, f, 'Mandarin form (a Cantonese line says it differently): ' + b))
        if not zh.endswith(ENDS): problems.append((mid, f, 'line must end with 。？！…'))
        if ('？' in zh or '?' in zh) != ('?' in en): problems.append((mid, f, 'question mark mismatch between Mandarin and English'))
        if f in ('A1', 'A2') and re.search(r'\bhim\b', pr): problems.append((mid, f, 'A prompt says him'))
        if f == 'B' and re.search(r'\bher\b', pr): problems.append((mid, f, 'B prompt says her'))
        finals = [c for c in zh if c in FINAL_PARTICLES]
        if len(re.findall(r'[吗呢吧啊呀嘛啦哦噢]', re.sub(r'[^吗呢吧啊呀嘛啦哦噢，。？！、]', '', zh))) and sum(1 for k in re.split(r'[，。？！、]', zh) if k and k[-1] in FINAL_PARTICLES) > 2:
            problems.append((mid, f, 'too many sentence-final particles'))
        probe = zh.replace('{W}', '\x01').replace('{M}', '\x01')
        if st:
            if LATIN.search(re.sub(r'\{[WM]\}', '', zh)): problems.append((mid, f, 'Latin letters in a line (write the free word in characters): ' + zh))
            ok, spans, toks = segment(probe, ti, vocab, unc) if vocab is not None else (True, [], [])
            if not ok: problems.append((mid, f, f'NOT ALLOWED before position {starter_first(fw)} (starter vocabulary: `starter-allowed {mid}`): ' + ' · '.join(spans)))
            short = [w['word'] for w in fw if len(re.sub(r'[，。？！、；：…\s,.?!]', '', fill_zh(zh, w))) < STARTER_MIN_CHARS]
            if short: problems.append((mid, f, f'fewer than {STARTER_MIN_CHARS} characters for ' + ' '.join(short[:3]) + ': ' + zh))
        else:
            ok, spans, toks = segment(probe, ti)
            if not ok: problems.append((mid, f, 'NOT ALLOWED at ' + tier + ': ' + ' · '.join(spans)))
        n = units(toks, 0, unc) + probe.count('\x01')
        if n < lo or n > hi: problems.append((mid, f, f'{n} units (range {lo}-{hi}): ' + zh))
        for w in fw[:6]:
            rz = fill_zh(zh, w)
            if '？M' in rz and '{M}' in zh: problems.append((mid, f, f'word {w["word"]} has no classifier')); break
    k = (r['group'], tier, r['A1_yue'].strip()[:2])
    if k in seen_open: problems.append((mid, 'A1', 'same opening as ' + seen_open[k]))
    else: seen_open[k] = mid

def read_rows(p): return list(csv.DictReader(open(p, encoding='utf-8-sig')))

def starter_allowed(args):
    """starter-allowed MODULE_ID | WORD_ID [WORD_ID ...] [--tier T2]: print the vocabulary a starter module may use, the words it fits and the exclude_ids that make it fit exactly them."""
    import glob
    tier = args[args.index('--tier') + 1] if '--tier' in args else None
    args = [x for i, x in enumerate(args) if x != '--tier' and (i == 0 or args[i - 1] != '--tier')]
    if not args: sys.exit('usage: starter-allowed MODULE_ID_OR_WORD_ID [WORD_ID ...] [--tier T2]')
    if all(x.isdigit() for x in args):
        ws = []
        for x in args:
            if x not in WORDS: sys.exit(f'unknown word id {x}')
            ws.append(WORDS[x])
        cells = {(w.get('subgroup') or w.get('group')) for w in ws}
        if len(cells) > 1: sys.exit('the words are in different cells: ' + ' '.join(sorted(cells)))
        cell = cells.pop(); tier = tier or max((w['tier'] for w in ws), key=TIERS.index)
        if TIERS.index(tier) < max(TIERS.index(w['tier']) for w in ws): sys.exit('tier lower than a target word')
        where = 'a new module for ' + ' '.join(w['word'] for w in ws)
        fw = ws
    else:
        row = None
        for f in sorted(glob.glob(f'{HERE}/drafts/STARTER-*-modules.csv')):
            for r in read_rows(f):
                if r['module_id'] == args[0]: row = r
        if not row: sys.exit(f'module {args[0]} is in no drafts/STARTER-*-modules.csv (give a word id instead)')
        cell, tier = row['group'], row['tier']; fw = fits(row); where = 'module ' + args[0]
        late = [w for w in fw if int(w['rank']) > STARTER_LAST]
        if late: print('WARNING fits words beyond position', STARTER_LAST, ':', ' '.join(w['word'] for w in late))
        fw = [w for w in fw if int(w['rank']) <= STARTER_LAST]
        if not fw: sys.exit('the module fits no word of the first 200')
    first = starter_first(fw)
    pos, counted, unc, latin = starter_data()
    print(f"{where} | cell {cell} | tier {tier} | fits: " + ' '.join(f"{w['word']}({w['id']}, position {w['rank']}, day {(int(w['rank']) - 1) // 5 + 1})" for w in fw))
    print(f'The learner knows the words at positions 1-{first - 1} (all words taught STRICTLY BEFORE position {first}), plus the free words. The line text may use ONLY:' if first > 1 else 'Nothing is taught before position 1: the line text may use ONLY the free words:')
    seen = {}
    for w in sorted(WORDS.values(), key=lambda w: int(w['rank'])):
        if w.get('skip') or int(w['rank']) >= first or w['word'] in seen: continue
        seen[w['word']] = w
    if seen: print('  taught words (position word=meaning):  ' + '  '.join(f"{w['rank']} {k}={w['meaning'].split('/')[0].strip()}" for k, w in seen.items()))
    else: print('  taught words: none (this is the very first word)')
    names = [f"{k}={r['english']}" for k, r in counted.items()]
    print('  free words (written in characters):  ' + '  '.join(names))
    print('  free particles and interjections (not counted as words):  ' + ' '.join(sorted(unc)))
    cl = [(w['word'], w.get('classifier'), pos.get(w.get('classifier') or '', None)) for w in fw]
    if all(c and p is not None and p <= int(w['rank']) for (_, c, p), w in zip(cl, fw)):
        mnote = '   {M} = ' + ' / '.join(c for _, c, _ in cl) + ' (taught in time: {M} may be used)'
    else:
        mnote = '   {M}: do NOT use it (' + '; '.join(f"{n}: " + (f"classifier {c} taught at position {p}" if c and p else 'no classifier' if not c else f'classifier {c} is not a taught word') for n, c, p in cl) + ')'
    print('  the {W} slot = ' + ' / '.join(w['word'] for w in fw) + mnote)
    if latin: print('  NOT usable (Latin letters in a line are rejected): ' + ' '.join(latin))
    ti = TIERS.index(tier); fid = {w['id'] for w in fw}
    ex = sorted((w['id'] for w in WORDS.values() if not w.get('skip') and (w.get('subgroup') or w.get('group')) == cell and TIERS.index(w['tier']) <= ti and w['id'] not in fid), key=int)
    print(f'exclude_ids so that the module fits exactly these words ({len(ex)} other words of the cell up to {tier}):')
    print('  ' + ';'.join(ex))
    print('Words of the cell it could ALSO fit if the lines read naturally for them (take them out of exclude_ids): ' + (' '.join(f"{WORDS[i]['word']}({i}, position {WORDS[i]['rank']})" for i in ex if int(WORDS[i]['rank']) <= STARTER_LAST and int(WORDS[i]['rank']) >= first) or 'none'))

def main():
    a = sys.argv[1:]
    if a and a[0] == 'render':
        rows = {r['module_id']: r for r in read_rows(a[1])}; r = rows[a[2]]
        ws = [WORDS[a[3]]] if len(a) > 3 else fits(r)[:5]
        for w in ws:
            print(f"-- {w['word']} {w['yale']} ({w['meaning']}) [{w.get('english_slot')}]")
            for f, who in (('A1', 'A'), ('B', 'B'), ('A2', 'A')):
                print(f"  {who}: {fill_zh(r[f + '_yue'], w)}   | {fill_en(r[f + '_english'], w)}   | {fill_en(r[f + '_prompt'], w)}")
        return
    if a and a[0] == 'allowed':
        ti = TIERS.index(a[1]); print(' '.join(w['word'] + '=' + w['meaning'].split('/')[0].strip() for w in WORDS.values() if TIERS.index(w['tier']) <= ti)); return
    if a and a[0] == 'starter-allowed':
        starter_allowed(a[1:]); return
    if a and a[0] == 'words':
        g = a[1]; ti = TIERS.index(a[2]) if len(a) > 2 else 4
        for w in WORDS.values():
            if (w.get('subgroup') or w.get('group')) == g and TIERS.index(w['tier']) <= ti and not w.get('skip'):
                print(w['id'], w['word'], w['yale'], w['meaning'], '|', w.get('english_slot'), '|', w['tier'], w['pos'], '|', w.get('frame', ''), '|', w.get('classifier', ''), '|', w.get('register_note', ''))
        return
    path = a[0]; only = a[a.index('--group') + 1] if '--group' in a else None; quiet = '--quiet' in a
    rows = [r for r in read_rows(path) if r.get('status', 'ready') == 'ready' and (not only or r['group'] == only)]
    problems = []; seen = {}
    mine = {r['module_id'] for r in rows}
    for i, x in enumerate(a):                       # --against FILE: the openings of FILE's modules count as taken (a module of the checked file with the same id is not compared with itself)
        if x == '--against':
            for o in read_rows(a[i + 1]):
                if o.get('status', 'ready') != 'ready' or o['module_id'] in mine: continue
                seen.setdefault((o['group'], o['tier'], o['A1_yue'].strip()[:2]), o['module_id'])
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
