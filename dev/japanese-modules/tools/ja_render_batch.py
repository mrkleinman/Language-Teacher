"""Render a review file to text: python3 tools/ja_render_batch.py drafts/review/R01.csv > out.txt  (one block per module/word: Japanese, English, prompt for A1, B, A2)."""
import sys, csv
sys.path.insert(0, 'tools'); path = sys.argv[1]; sys.argv = ['x']
import ja_check as J
mods = {r['module_id']: r for r in J.read_rows('drafts/ALL-modules.csv')}
for it in J.read_rows(path):
    r = mods[it['module_id']]; w = J.WORDS[it['word_id']]
    print(f"## {r['module_id']} | word {w['id']} {w['word']} = {w['meaning']} [slot: {w.get('english_slot')}] | tier {r['tier']}")
    for f, who in (('A1', 'A'), ('B', 'B'), ('A2', 'A')):
        print(f"  {who}: {J.fill_ja(r[f + '_ja'], w)} | {J.fill_en(r[f + '_english'], w)} | {J.fill_en(r[f + '_prompt'], w)}")
