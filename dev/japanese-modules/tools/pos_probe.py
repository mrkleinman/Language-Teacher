import csv, collections, sys
from sudachipy import dictionary, tokenizer
tk = dictionary.Dictionary().create(); M = tokenizer.Tokenizer.SplitMode.C
rows = list(csv.DictReader(open('japanese-words-draft-3050.csv', encoding='utf-8-sig')))
c = collections.Counter(); ex = collections.defaultdict(list)
for r in rows:
    ms = tk.tokenize(r['word'], M)
    key = '+'.join(m.part_of_speech()[0] + (':' + m.part_of_speech()[4] if m.part_of_speech()[0] in ('動詞','形容詞','助動詞') else '') for m in ms)
    c[key] += 1
    if len(ex[key]) < 4: ex[key].append(r['word'] + '=' + r['meaning'][:18])
for k, n in c.most_common(40): print(n, k, ex[k])
