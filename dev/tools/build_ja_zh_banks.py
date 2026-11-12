#!/usr/bin/env python3
"""Embeds the Japanese and Mandarin word lists into tt.jsx (between the JA_BANK / ZH_BANK markers).

Single sources (nothing is typed into tt.jsx by hand):
  japanese-modules/japanese-word-base.csv      the 3,085-row list  (id = curriculum position for words, 9001+ = phrases / spare words)
  japanese-modules/japanese-word-tags.csv      part of speech / conjugation class per row
  japanese-modules/japanese-legacy-bank.csv    the 200 words the app already carried: their SAVED id, reading, note ...
  japanese-modules/japanese-phrase-schedule.csv  home belt + greeting/parting kind of every phrase
  (and the same four for mandarin-modules/)

Saved progress is keyed by the word's id. The old Japanese bank numbered its words 1-200 in a different order from the new list
(old id 4 = 食べる, new row 4 = 何), so for those 200 words the app keeps the SAVED id and takes its curriculum position from the
new list (unlockOrder = row number). Nothing saved is ever re-keyed. The old Mandarin ids are identical to the new rows, so
nothing is mapped there. A word whose id/headword/meaning do not line up with the legacy file stops the build.

Run from dev/:  python3 tools/build_ja_zh_banks.py        (idempotent)
"""
import csv, json, os, re, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE + '/tools')
import ja_readings

STAGES = [('White', 100), ('Orange', 100), ('Orange + Stripe', 200), ('Blue', 200), ('Blue + Stripe', 200), ('Yellow', 200),
          ('Yellow + Stripe', 200), ('Green', 325), ('Green + Stripe', 325), ('Brown', 325), ('Brown + Stripe', 325)]


def belt_for(i):
    at = 0
    for n, sz in STAGES:
        if at < i <= at + sz:
            return n
        at += sz
    return 'Beyond curriculum'


def rd(path):
    return list(csv.DictReader(open(HERE + '/' + path, encoding='utf-8-sig', newline='')))


JA_POS = {'noun': 'noun', 'verb': 'verb', 'adverb': 'adverb', 'adj-i': 'i-adjective', 'adj-na': 'na-adjective', 'pronoun': 'pronoun',
          'phrase': 'expression', 'interjection': 'expression', 'conjunction': 'conjunction'}
# the app's conjugator knows these classes (godan is worked out from the dictionary form's last kana)
JA_CONJ = {'ichidan': 'ichidan', 'suru': 'irregular-suru', 'kuru': 'irregular-kuru', 'iku': 'godan-iku', 'aru': 'irregular-aru', 'ii': 'irregular-ii'}
ZH_POS = {'noun': 'noun', 'verb': 'verb', 'adj': 'adjective', 'adverb': 'adverb', 'conjunction': 'conjunction', 'proper': 'proper noun',
          'measure': 'measure word', 'phrase': 'expression', 'pronoun': 'pronoun', 'preposition': 'preposition', 'number': 'numeral',
          'particle': 'particle', 'question': 'question', 'interjection': 'expression'}


def ja_conj(c):
    if not c:
        return None
    if c.startswith('godan-'):
        return 'godan-iku' if c == 'godan-iku' else 'godan'
    return JA_CONJ.get(c)  # i-adj / na-adj: the app keeps adjectives out of the verb conjugator


def build_ja():
    base = rd('japanese-modules/japanese-word-base.csv')
    tags = {int(r['id']): r for r in rd('japanese-modules/japanese-word-tags.csv')}
    legacy = {int(r['csv_id']): r for r in rd('japanese-modules/japanese-legacy-bank.csv')}
    sched = {int(r['id']): r for r in rd('japanese-modules/japanese-phrase-schedule.csv')}
    out, appids, stats = [], set(), {'readings': {}}
    for r in base:
        cid = int(r['id'])
        t = tags[cid]
        assert t['word'] == r['word'], ('tag/base mismatch', cid)
        lg = legacy.get(cid)
        et = r['entry_type']
        if lg:
            assert lg['word'] == r['word'], ('legacy headword differs', cid, lg['word'], r['word'])
            appid = int(lg['app_id'])
        else:
            appid = cid
        assert appid not in appids, ('app id used twice', appid)
        appids.add(appid)
        if lg:
            reading = lg['reading']
            stats['readings']['legacy'] = stats['readings'].get('legacy', 0) + 1
        else:
            reading, st = ja_readings.reading_for(r['word'], r['romaji'])
            stats['readings'][st] = stats['readings'].get(st, 0) + 1
        e = {'id': appid, 'unlockOrder': cid, 'japanese': r['word'], 'reading': reading, 'romaji': r['romaji'], 'english': r['meaning'],
             'lemma': r['word']}
        if lg:
            e['partOfSpeech'] = lg['partOfSpeech'] or None
            cc = lg['conjugationClass'] or None
        else:
            e['partOfSpeech'] = JA_POS[r['pos']]
            cc = ja_conj(r['conj'])
        if cc:
            e['conjugationClass'] = cc
        if lg and lg['note']:
            e['note'] = lg['note']
        e['tier'] = r['tier']
        if et == 'phrase':
            e['entryType'] = 'phrase'
            e['curriculumIndex'] = 0
            assert cid in sched and sched[cid]['word'] == r['word'], ('phrase without a schedule row', cid)
        elif et == 'word-spare':
            e['entryType'] = 'spare'
        else:
            assert et == 'word'
            assert belt_for(cid) == r['belt'] or (cid > 2500 and r['belt'] == 'Beyond curriculum'), ('belt mismatch', cid, r['belt'], belt_for(cid))
        out.append(e)
    assert len(legacy) == 200 and all(int(l['app_id']) <= 200 for l in legacy.values())
    phr = {'ids': [], 'home': {}, 'kind': {}}
    for cid, s in sorted(sched.items()):
        phr['ids'].append(cid)
        phr['home'][str(cid)] = s['home_belt']
        if s['kind']:
            phr['kind'][str(cid)] = s['kind']
    assert len(phr['ids']) == sum(1 for r in base if r['entry_type'] == 'phrase')
    return out, phr, stats


def build_zh():
    base = rd('mandarin-modules/mandarin-word-base.csv')
    tags = {int(r['id']): r for r in rd('mandarin-modules/mandarin-word-tags.csv')}
    legacy = {int(r['csv_id']): r for r in rd('mandarin-modules/mandarin-legacy-bank.csv')}
    sched = {int(r['id']): r for r in rd('mandarin-modules/mandarin-phrase-schedule.csv')}
    out = []
    for r in base:
        cid = int(r['id'])
        t = tags[cid]
        assert t['word'] == r['word'], ('tag/base mismatch', cid)
        lg = legacy.get(cid)
        if lg:
            assert int(lg['app_id']) == cid and lg['word'] == r['word'] and lg['pinyin'] == r['pinyin'], ('legacy differs', cid)
        e = {'id': cid, 'unlockOrder': cid, 'chinese': r['word'], 'pinyin': r['pinyin'], 'english': r['meaning'],
             'partOfSpeech': (lg['partOfSpeech'] if lg else ZH_POS[t['pos']]) or None}
        if lg and lg['note']:
            e['note'] = lg['note']
        e['tier'] = r['tier']
        if r['entry_type'] == 'phrase':
            e['entryType'] = 'phrase'
            e['curriculumIndex'] = 0
            assert cid in sched and sched[cid]['word'] == r['word'], ('phrase without a schedule row', cid)
        else:
            assert r['entry_type'] == 'word'
            assert belt_for(cid) == r['belt'] or (cid > 2500 and r['belt'] == 'Beyond curriculum'), ('belt mismatch', cid, r['belt'], belt_for(cid))
        out.append(e)
    assert len(legacy) == 100
    phr = {'ids': [], 'home': {}, 'kind': {}}
    for cid, s in sorted(sched.items()):
        phr['ids'].append(cid)
        phr['home'][str(cid)] = s['home_belt']
        if s['kind']:
            phr['kind'][str(cid)] = s['kind']
    assert len(phr['ids']) == sum(1 for r in base if r['entry_type'] == 'phrase')
    return out, phr


def block(tag, const, rows, phr, src):
    body = ',\n'.join('  ' + json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in rows)
    return ('// ══ %s_BANK begin (generated by tools/build_ja_zh_banks.py from %s — do not edit by hand)\n' % (tag, src) +
            'const %s = [\n%s\n]\n' % (const, body) +
            'const %s_PHRASE_DATA = Object.freeze(%s)\n' % (tag, json.dumps(phr, ensure_ascii=False, separators=(',', ':'))) +
            '// ══ %s_BANK end\n' % tag)


def splice(s, tag, const, blk):
    rx = re.compile(r'// ══ %s_BANK begin.*?// ══ %s_BANK end\n' % (tag, tag), re.S)
    if rx.search(s):
        return rx.sub(lambda m: blk, s)
    i = s.index('const %s = [' % const)
    j = s.index('\n]\n', i) + 3
    return s[:i] + blk + s[j:]


if __name__ == '__main__':
    ja, jphr, st = build_ja()
    zh, zphr = build_zh()
    p = HERE + '/tt.jsx'
    s = open(p, encoding='utf-8').read()
    s = splice(s, 'JA', 'RAW_JAPANESE_VOCAB', block('JA', 'RAW_JAPANESE_VOCAB', ja, jphr, 'japanese-modules/*.csv'))
    s = splice(s, 'ZH', 'RAW_MANDARIN_VOCAB', block('ZH', 'RAW_MANDARIN_VOCAB', zh, zphr, 'mandarin-modules/*.csv'))
    open(p, 'w', encoding='utf-8').write(s)
    print('japanese', len(ja), 'phrases', len(jphr['ids']), 'readings', st['readings'])
    print('mandarin', len(zh), 'phrases', len(zphr['ids']))
