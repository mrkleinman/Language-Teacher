"""Fill a module's English for one word, the way the app should.

Tokens in English and prompt fields:
  {E}   english_slot (or english_slot_2 when the module's group is the word's second_group)
  {Es}  english_plural; falls back to the {E} form when english_plural is empty
  {a}   "a" or "an" (by the sound of the next word), or nothing when the word's
        english_plural is filled and identical to its english_slot (pair and mass
        nouns such as shoes, trousers, silk, traffic)
After filling, double spaces are collapsed.

Usage: python3 render.py modules.csv [--group G] [--show]
Reads the English forms from thai-word-tags.csv in this folder. Prints every filled
English line that looks wrong (a/an, leftover tokens, missing plural); with --show it
prints every filled line.
"""
import csv, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

VOWEL_SOUND = re.compile(r'^(?:[aeiouAEIOU]|hour|honest|heir)')
CONSONANT_SOUND = re.compile(r'^(?:uni|use|usu|one|Euro|eu)', re.I)


def article(next_word):
    if VOWEL_SOUND.match(next_word) and not CONSONANT_SOUND.match(next_word):
        return 'an'
    return 'a'


def fill(text, slot, plural):
    no_article = bool(plural) and plural == slot
    out = text.replace('{Es}', plural or slot).replace('{E}', slot)

    def art(m):
        if no_article:
            return m.group(1)
        return article(m.group(1)) + ' ' + m.group(1)
    out = re.sub(r'\{a\} (\S+)', art, out)
    return re.sub(r'  +', ' ', out).strip()


def english_for(w, module_group):
    """(slot, plural) for word row w in a module of module_group."""
    if module_group == w.get('second_group') and w.get('english_slot_2'):
        return w['english_slot_2'], ''
    return w.get('english_slot', ''), w.get('english_plural', '')


def main(path, only=None, show=False):
    from check_modules import cells_for
    rows = list(csv.DictReader(open(path, encoding='utf-8-sig')))
    bad = 0
    for r in rows:
        if only and r['group'] != only:
            continue
        cell = cells_for(r['group'])[r['tier']]
        ex = {x for x in r['exclude_ids'].split(';') if x}
        for w in cell:
            if w['id'] in ex:
                continue
            slot, plural = english_for(w, r['group'])
            if not slot:
                continue
            for f in ('A1_english', 'A1_prompt', 'B_english', 'B_prompt', 'A2_english', 'A2_prompt'):
                t = r[f]
                if '{Es}' in t and not plural:
                    print(r['module_id'], f, w['id'], 'no english_plural for {Es}'); bad += 1
                s = fill(t, slot, plural)
                wrong = re.search(r'[{}]', s) or any(article(m.group(2)) != m.group(1).lower()
                                                     for m in re.finditer(r'\b([Aa]n?) ([A-Za-z][\w-]*)', s))
                if wrong:
                    bad += 1
                if wrong or (show and '{' in t):
                    print(r['module_id'], f, w['id'], w['thai'], '|', s)
    print(bad, 'problems')


if __name__ == '__main__':
    a = sys.argv[1:]
    g = None
    if '--group' in a:
        i = a.index('--group'); g = a[i + 1]; del a[i:i + 2]
    show = '--show' in a
    a = [x for x in a if x != '--show']
    main(a[0], only=g, show=show)
