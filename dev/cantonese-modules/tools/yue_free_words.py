#!/usr/bin/env python3
"""Write free-words.csv: the words a Cantonese sentence may use WITHOUT the learner having been taught them.

A free word is one a complete beginner already knows or needs no teaching for: a Hong Kong loanword that sounds like its English source, a brand every visitor has seen, a given name
for the speakers of a dialogue, an interjection, a sentence-final particle that carries no meaning of its own. It is NOT one of the 2,500 curriculum words (a word that is also a
list word says so in `in_list_id`: it is free from day one AND still taught at its own position).

Columns: word, yale, english, kind, source, jyutping, in_list_id
  yale is converted from the Jyutping (tools/yale.py) and checked with the same Yale rules the app uses (validate_yale of dev/tools/build_yue_modules.py).
  source = why a beginner already knows it / how it is really said.
Usage: python3 tools/yue_free_words.py          (writes free-words.csv, checks every row, prints the counts)
Left out on purpose (no single standard spoken reading I can vouch for, or already a list word): MTR, app, WhatsApp, Wi-Fi, sorry, bye bye (= the list word 拜拜), taxi (= 的士), bus (= 巴士).
A line may not contain Latin letters (the app's line check rejects them), so the names are the characters Hong Kong writes for them and `OK` is the one Latin-spelled free word: stage B must let
a free word spelled in Latin letters through that check.
"""
import csv, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, '..', 'tools'))
import yale
_argv = sys.argv; sys.argv = ['x']
import build_yue_modules as B
sys.argv = _argv

L = 'loanword'; N = 'name'; I = 'interjection'; P = 'particle'
ROWS = [
 # word, jyutping, english, kind, source
 ('OK', 'ou1 kei1', 'OK; fine', L, 'English OK, said everywhere in Hong Kong as ou1 kei1'),
 ('哈囉', 'haa1 lou1', 'hello (casual)', L, 'English hello, written 哈囉 in Hong Kong'),
 ('三文治', 'saam1 man4 zi6', 'sandwich', L, 'sounds like sandwich; the only word Hong Kong uses'),
 ('麥當勞', 'mak6 dong1 lou4', "McDonald's", L, 'the brand every visitor has seen; the Hong Kong name'),
 ('肯德基', 'hang2 dak1 gei1', 'KFC', L, 'the brand every visitor has seen; the Hong Kong name'),
 ('星巴克', 'sing1 baa1 hak1', 'Starbucks', L, 'the brand every visitor has seen; the Hong Kong name'),
 ('阿明', 'aa3 ming4', 'Ah Ming (man)', N, 'common Hong Kong given name with 阿, for a male speaker or third person'),
 ('阿強', 'aa3 koeng4', 'Ah Keung (man)', N, 'common Hong Kong given name with 阿, for a male speaker or third person'),
 ('大衛', 'daai6 wai6', 'David (man)', N, 'the Chinese spelling of the English name David used in Hong Kong'),
 ('彼得', 'bei2 dak1', 'Peter (man)', N, 'the Chinese spelling of the English name Peter used in Hong Kong'),
 ('阿欣', 'aa3 jan1', 'Ah Yan (woman)', N, 'common Hong Kong given name with 阿, for a female speaker or third person'),
 ('阿芬', 'aa3 fan1', 'Ah Fan (woman)', N, 'common Hong Kong given name with 阿, for a female speaker or third person'),
 ('瑪麗', 'maa5 lai6', 'Mary (woman)', N, 'the Chinese spelling of the English name Mary used in Hong Kong'),
 ('安娜', 'on1 naa4', 'Anna (woman)', N, 'the Chinese spelling of the English name Anna used in Hong Kong'),
 ('哇', 'waa1', 'wow', I, 'wow: a reaction, not a word to learn'),
 ('嘩', 'waa1', 'wow (the other spelling)', I, 'the same sound as 哇, spelled 嘩 in the word list (a list word, taught later)'),
 ('喂', 'wai3', 'hey; hello (on the phone)', I, 'hey / hello on the phone: a calling sound; also a list word, taught later'),
 ('嗯', 'ng2', 'mm; um (agreeing or thinking)', I, 'mm / um: a sound; also a list word, taught later'),
 ('哦', 'o4', 'oh; I see', I, 'oh / I see: a reaction'),
 ('噢', 'o1', 'oh!', I, 'oh!: a reaction'),
 ('哎', 'aai1', 'hey; oh dear', I, 'hey / oh dear: a reaction'),
 ('嘿', 'hei1', 'hey', I, 'hey: calls someone, as in English'),
 ('哈', 'haa1', 'ha (laughing, or hey)', I, 'ha: laughter or a light hey'),
 ('呀', 'aa3', '(softening final particle)', P, 'sentence-final particle with no meaning of its own; the build checker already treats it as free'),
 ('啊', 'aa3', '(softening final particle)', P, 'same particle as 呀; the build checker already treats it as free'),
 ('啦', 'laa1', '(final particle: OK then / do it)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('喇', 'laa3', '(final particle: now / already)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('囉', 'lo1', '(final particle: of course)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('嘛', 'maa3', '(final particle: obviously)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('喎', 'wo3', '(final particle: you know / reportedly)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('啩', 'gwaa3', '(final particle: probably)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('噃', 'bo3', '(final particle: reminding)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('咯', 'lo3', '(final particle: so it is)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('吖', 'aa1', '(final particle: softening a request)', P, 'sentence-final particle; the build checker already treats it as free'),
 ('啫', 'ze1', '(final particle: only)', P, 'sentence-final particle; the build checker already treats it as free'),
]

def main():
    live = {}
    for r in csv.DictReader(open(f'{ROOT}/cantonese-word-tags.csv', encoding='utf-8-sig')):
        if not r['skip']: live.setdefault(r['word'], []).append(r)
    sys.path.insert(0, HERE)
    import yue_check as Z
    out, bad = [], []
    for w, jp, en, kind, src in ROWS:
        y = yale.convert(jp)
        ok, why = B.validate_yale(y)
        if not ok: bad.append((w, y, why))
        lst = ';'.join(r['id'] for r in live.get(w, []))
        out.append({'word': w, 'yale': y, 'english': en, 'kind': kind, 'source': src, 'jyutping': jp, 'in_list_id': lst})
    assert not bad, bad
    # the checker's own free particles are all here, with the same Yale the app's table uses
    missing = [p for p in Z.FREE if p not in {r['word'] for r in out}]
    assert not missing, ('checker FREE words missing', missing)
    for r in out:
        if r['word'] in B.FREE_YALE: assert B.FREE_YALE[r['word']] == r['yale'], (r['word'], r['yale'], B.FREE_YALE[r['word']])
    with open(f'{ROOT}/free-words.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['word', 'yale', 'english', 'kind', 'source', 'jyutping', 'in_list_id']); w.writeheader(); w.writerows(out)
    import collections
    print('free words', len(out), dict(collections.Counter(r['kind'] for r in out)), '· also list words:', [r['word'] for r in out if r['in_list_id']])
if __name__ == '__main__': main()
