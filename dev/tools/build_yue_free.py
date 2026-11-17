#!/usr/bin/env python3
"""Embeds the Cantonese FREE words and FRAMING lines into tt.jsx (between the YUE_FREE markers).

Sources (nothing is typed into tt.jsx by hand):
  cantonese-modules/free-words.csv      words a lesson line may use although the learner was never taught them: loanwords (三文治 麥當勞), names (阿明 阿欣),
                                        interjections (哇 哦 噢) and sentence-final particles (呀 啦 喇). The learner-vocabulary rule (yueAllowedSet) adds them to
                                        the words the learner has been taught and to the day's own targets.
  cantonese-modules/framing-lines.csv   the opening (greeting) and closing (parting) lines of a track, with the time of day each suits. Their words are free to use
                                        from day one although some are taught later (早晨 day 2, 再見 day 2, 拜拜 day 20 ...): they sit only in the framing pairs,
                                        never in a lesson line.

Embedded:
  YUE_FREE_WORDS     [[word, yale, english, kind], ...]   kind: loanword | name | interjection | particle
  YUE_FRAMING_LINES  [{id, role:'open'|'close', text, yale, english, cue, replyCue, time:'any'|'morning'|'evening', special}, ...]
                     time 'any' = at any hour; 'morning' = only before noon; 'evening' = only in the evening and at night.
                     special = true for a line that suits only one kind of dialogue (喂: a phone call or a call across a room): the default choice never takes it.
                     cue / replyCue: the English cue the learner sees for the A line and for the B reply (kept here, in one place, so a line can never lack one).
Latin-spelled free word: OK is the only one. The line check of the app rejects Latin letters, so it accepts EXACTLY the Latin tokens listed here as free words
(whole token, written with its Yale), nothing else; no module uses OK today (tests97 proves it), so the rule only decides what a future module may write.

Run from dev/:  python3 tools/build_yue_free.py          (idempotent: rewrites only the block between the markers)
                python3 tools/build_yue_free.py --check  (only report; exits 1 if tt.jsx does not hold exactly what the CSV files give)
"""
import csv, json, os, re, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = HERE + '/cantonese-modules'
BEGIN, END = '// ══ YUE_FREE begin', '// ══ YUE_FREE end\n'
KINDS = {'loanword', 'name', 'interjection', 'particle'}
TIME = {'any time': 'any', 'morning': 'morning', 'evening / night': 'evening'}
# the English cues of the framing lines, by id (a line added to the CSV without an entry here stops the build, so no framing line can ever lack its cue)
CUES = {
    'open-nihou': ('Say hello.', 'Say hello back.'),
    'open-zousan': ('Say good morning.', 'Say good morning back.'),
    'open-halou': ('Say hello, casually.', 'Say hello back, casually.'),
    'open-wai': ('Call out to them.', 'Answer the call.'),
    'close-zoigin': ('Say goodbye.', 'Say goodbye back.'),
    'close-baaibaai': ('Say bye bye.', 'Say bye bye back.'),
    'close-tingyahtgin': ('Say see you tomorrow.', 'Say see you tomorrow back.'),
    'close-zoutau': ('Say good night.', 'Say good night back.'),
}
YALE = re.compile(r"^[a-zA-Zāēīōūáéíóúàèìòùḿńǹm̀m̄ ]+$")


def rd(name):
    return list(csv.DictReader(open(SRC + '/' + name, encoding='utf-8-sig', newline='')))


def build():
    free, seen = [], set()
    for r in rd('free-words.csv'):
        w = r['word'].strip()
        assert w and w not in seen, ('free word empty or twice', w)
        seen.add(w)
        assert r['kind'] in KINDS, ('free word kind', w, r['kind'])
        assert r['yale'].strip() and not re.search(r'[0-9]', r['yale']) and YALE.match(r['yale'].strip()), ('free word Yale', w, r['yale'])
        assert r['english'].strip(), ('free word English', w)
        free.append([w, r['yale'].strip(), r['english'].strip(), r['kind']])
    lines, ids = [], set()
    for r in rd('framing-lines.csv'):
        i = r['id'].strip()
        assert i and i not in ids, ('framing id empty or twice', i)
        ids.add(i)
        assert r['role'] in ('open', 'close'), ('framing role', i)
        assert r['time_of_day'] in TIME, ('framing time of day', i, r['time_of_day'])
        assert i in CUES, ('add the English cues of this framing line to CUES in tools/build_yue_free.py', i)
        text = r['text'].strip()
        assert text and not re.search(r'[A-Za-z0-9]', text), ('a framing line is written in characters', i, text)
        assert YALE.match(r['yale'].strip()) and not re.search(r'[0-9]', r['yale']), ('framing Yale', i, r['yale'])
        assert r['english'].strip(), ('framing English', i)
        assert ('open' if i.startswith('open-') else 'close') == r['role'], ('framing id prefix does not match its role', i)
        lines.append({'id': i, 'role': r['role'], 'text': text, 'yale': r['yale'].strip(), 'english': r['english'].strip(), 'cue': CUES[i][0], 'replyCue': CUES[i][1],
                      'time': TIME[r['time_of_day']], 'special': 'phone call' in r['suits']})
    assert set(CUES) == ids, ('CUES holds an id that is not in framing-lines.csv', sorted(set(CUES) - ids))
    assert [l for l in lines if l['role'] == 'open' and l['time'] == 'any' and not l['special']], 'a track needs an opener for any hour'
    assert [l for l in lines if l['role'] == 'close' and l['time'] == 'any'], 'a track needs a closer for any hour'
    return free, lines


def block(free, lines):
    fw = ',\n'.join('  ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in free)
    fl = ',\n'.join('  ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in lines)
    return (BEGIN + ' (generated by tools/build_yue_free.py from cantonese-modules/free-words.csv and framing-lines.csv — do not edit by hand)\n'
            '// free words: a lesson line may use them although the learner was never taught them (loanwords, names, interjections, sentence-final particles)\n'
            'const YUE_FREE_WORDS = [\n%s\n]\n'
            '// framing lines: the opening (greeting) and closing (parting) lines of a track; time: any | morning (before noon) | evening (evening and night); special: suits only one kind of dialogue\n'
            'const YUE_FRAMING_LINES = [\n%s\n]\n' % (fw, fl) + END)


def splice(s, blk):
    rx = re.compile(re.escape(BEGIN) + r'.*?' + re.escape(END), re.S)
    if rx.search(s):
        return rx.sub(lambda m: blk, s)
    anchor = '// ══ YUE_BANK end\n'
    assert anchor in s, 'anchor not found'
    return s.replace(anchor, anchor + blk, 1)


if __name__ == '__main__':
    free, lines = build()
    print('free words', len(free), '· framing lines', len(lines), '(%d open, %d close)' % (sum(l['role'] == 'open' for l in lines), sum(l['role'] == 'close' for l in lines)))
    p = HERE + '/tt.jsx'
    s = open(p, encoding='utf-8').read()
    new = splice(s, block(free, lines))
    if '--check' in sys.argv:
        if new != s:
            print('tt.jsx does NOT match the CSV files: run python3 tools/build_yue_free.py')
            sys.exit(1)
        print('tt.jsx matches the CSV files')
    else:
        open(p, 'w', encoding='utf-8').write(new)
        print('tt.jsx updated' if new != s else 'tt.jsx already up to date')
