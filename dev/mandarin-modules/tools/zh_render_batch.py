"""Render a review file to text: python3 tools/zh_render_batch.py drafts/review/R01.csv > out.txt"""
import sys
sys.path.insert(0, 'tools'); path = sys.argv[1]; sys.argv = ['x']
import zh_check as Z
mods = {r['module_id']: r for r in Z.read_rows('drafts/ALL-modules.csv')}
for it in Z.read_rows(path):
    r = mods[it['module_id']]; w = Z.WORDS[it['word_id']]
    print(f"## {r['module_id']} | word {w['id']} {w['word']} {w['pinyin']} = {w['meaning']} [slot: {w.get('english_slot')}] | tier {r['tier']}")
    for f, who in (('A1', 'A'), ('B', 'B'), ('A2', 'A')):
        print(f"  {who}: {Z.fill_zh(r[f + '_zh'], w)} | {Z.fill_en(r[f + '_english'], w)} | {Z.fill_en(r[f + '_prompt'], w)}")
