"""Casual-speech conjugation for the Japanese gap-fill modules (deterministic; verified against Sudachi in ja_tag_base.py).

conj classes: godan-<row> (u, ku, gu, su, tsu, nu, bu, mu, ru), ichidan, kuru, suru, aru (ある: negative ない), iku (行く: te/ta いって/いった),
              i-adj, ii (いい: よ- stem), na-adj.
Forms (verbs): dict, nai, ta, te, nakatta, tai, stem, takunai, potential_dict is NOT generated (the word list has its own potential verbs).
Forms (adjectives): pred (non-past plain), neg, past, negpast, te, adv, attr.
"""
GODAN = {  # row -> (dict ending, a-stem, i-stem, te, ta)
    'u':   ('う', 'わ', 'い', 'って', 'った'),
    'tsu': ('つ', 'た', 'ち', 'って', 'った'),
    'ru':  ('る', 'ら', 'り', 'って', 'った'),
    'mu':  ('む', 'ま', 'み', 'んで', 'んだ'),
    'bu':  ('ぶ', 'ば', 'び', 'んで', 'んだ'),
    'nu':  ('ぬ', 'な', 'に', 'んで', 'んだ'),
    'ku':  ('く', 'か', 'き', 'いて', 'いた'),
    'gu':  ('ぐ', 'が', 'ぎ', 'いで', 'いだ'),
    'su':  ('す', 'さ', 'し', 'して', 'した'),
}
ROW_BY_END = {v[0]: k for k, v in GODAN.items()}

def verb_forms(word, cls):
    """word = dictionary form as written (may end in kana after kanji). Returns dict of forms."""
    if cls == 'suru':
        stem = word[:-2]  # strip する
        return {'dict': stem + 'する', 'nai': stem + 'しない', 'ta': stem + 'した', 'te': stem + 'して', 'nakatta': stem + 'しなかった',
                'tai': stem + 'したい', 'stem': stem + 'し', 'takunai': stem + 'したくない'}
    if cls == 'kuru':
        base = word[:-2] if word.endswith('来る') else word[:-2]
        if word.endswith('来る'):
            b = word[:-2]
            return {'dict': b + '来る', 'nai': b + '来ない', 'ta': b + '来た', 'te': b + '来て', 'nakatta': b + '来なかった', 'tai': b + '来たい', 'stem': b + '来', 'takunai': b + '来たくない'}
        b = word[:-2]
        return {'dict': b + 'くる', 'nai': b + 'こない', 'ta': b + 'きた', 'te': b + 'きて', 'nakatta': b + 'こなかった', 'tai': b + 'きたい', 'stem': b + 'き', 'takunai': b + 'きたくない'}
    if cls == 'ichidan':
        s = word[:-1]
        return {'dict': word, 'nai': s + 'ない', 'ta': s + 'た', 'te': s + 'て', 'nakatta': s + 'なかった', 'tai': s + 'たい', 'stem': s, 'takunai': s + 'たくない'}
    if cls.startswith('godan-') or cls in ('aru', 'iku'):
        end = word[-1]
        row = ROW_BY_END[end]
        d, a, i, te, ta = GODAN[row]
        s = word[:-1]
        if cls == 'iku':
            te, ta = 'って', 'った'
        nai = s + a + 'ない'
        if cls == 'aru':
            nai = s + 'ない'          # ある -> ない (not あらない)
        elif row == 'u':
            nai = s + 'わない'
        return {'dict': word, 'nai': nai, 'ta': s + ta, 'te': s + te, 'nakatta': nai[:-1] + 'かった', 'tai': s + i + 'たい',
                'stem': s + i, 'takunai': s + i + 'たくない'}
    raise ValueError(cls)

def adj_forms(word, cls):
    if cls == 'i-adj' or cls == 'ii':
        s = word[:-1]
        if cls == 'ii' or word.endswith('いい') or word.endswith('良い'):
            s = word[:-2] + ('よ' if word.endswith('いい') else '良')
            pred = word
            if word.endswith('いい'): s = word[:-2] + 'よ'
        return {'pred': word, 'neg': s + 'くない', 'past': s + 'かった', 'negpast': s + 'くなかった', 'te': s + 'くて', 'adv': s + 'く', 'attr': word}
    if cls == 'na-adj':
        return {'pred': word + 'だ', 'neg': word + 'じゃない', 'past': word + 'だった', 'negpast': word + 'じゃなかった', 'te': word + 'で', 'adv': word + 'に', 'attr': word + 'な'}
    raise ValueError(cls)
