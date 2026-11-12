#!/usr/bin/env python3
"""Hiragana readings for the Japanese word bank.

The word list carries romaji (curated) but no kana reading. The app wants a kana reading beside every word, so it is
derived here and cross-checked:
  1. romaji -> kana  (the list's romaji is a literal transcription: long vowels are written ou/oo/ei, never macrons)
  2. Sudachi's dictionary reading of the headword, converted to hiragana
When the two agree the reading is certain. When they differ, the romaji-derived kana wins (the list's romaji was written
for the word in this exact meaning) and the word is reported so a person can look at it. Katakana headwords keep their own
spelling as the reading (the old bank did the same: コンビニ -> コンビニ).
Importable (reading_for) and runnable: python3 tools/ja_readings.py  -> prints the disagreements.
"""
import csv, re, sys, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_R2K = {}
_base = {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'ti': 'ち', 'tsu': 'つ', 'tu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'hu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ', 'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ', 'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ', 'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ', 'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
    'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ', 'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
    'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
    'fa': 'ふぁ', 'fi': 'ふぃ', 'fe': 'ふぇ', 'fo': 'ふぉ', 'je': 'じぇ', 'che': 'ちぇ', 'she': 'しぇ',
    'ti_': 'てぃ', 'di_': 'でぃ', 'wi': 'うぃ', 'we': 'うぇ', 'va': 'ゔぁ', 'vi': 'ゔぃ', 'vu': 'ゔ', 've': 'ゔぇ', 'vo': 'ゔぉ',
}
_KEYS = sorted(_base, key=lambda k: -len(k))


def romaji_to_hira(rom):
    s = rom.lower().strip()
    out = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch in " -/'.,":
            i += 1
            continue
        # small tsu: doubled consonant (not n)
        if i + 1 < len(s) and ch == s[i + 1] and ch not in 'aiueon':
            out.append('っ'); i += 1; continue
        if ch == 't' and s[i:i + 2] == 'tc':  # tchi
            out.append('っ'); i += 1; continue
        if ch == 'n':
            nxt = s[i + 1:i + 2]
            if nxt and nxt in 'aiueoy' and not s[i + 1:i + 3] in ('n\'',):
                pass  # na ni nu ne no nya...
            else:
                out.append('ん'); i += 1; continue
        for k in _KEYS:
            if s.startswith(k, i):
                out.append(_base[k]); i += len(k); break
        else:
            return None
    return ''.join(out)


def kata_to_hira(t):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in t)


def hira_to_kata(t):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in t)


_tok = None


def sudachi_hira(word):
    global _tok
    if _tok is None:
        from sudachipy import dictionary, tokenizer
        _tok = (dictionary.Dictionary().create(), tokenizer.Tokenizer.SplitMode.C)
    t, mode = _tok
    r = ''.join(m.reading_form() for m in t.tokenize(word, mode))
    return kata_to_hira(r)


KANA_ONLY = re.compile(r'^[぀-ヿーー・\s]+$')
HAS_KANJI = re.compile(r'[一-鿿々〆]')


def _norm(x):
    """what romaji cannot tell apart: づ/ず, ぢ/じ, ん+や vs にゃ, long-vowel spelling"""
    x = x.replace('づ', 'ず').replace('ぢ', 'じ').replace('ー', '')
    x = re.sub(r'([\u3041-\u3093])にゃ', r'\1んや', x).replace('こにゃ', 'こんや')
    x = x.replace('にゅ', 'んゆ').replace('にょ', 'んよ')
    x = re.sub(r'[うおぉぅ]', lambda m: 'う', x)
    return x


# readings decided by hand (the dictionary reading is for another sense, or both guesses are wrong)
OVERRIDES = {
    'ICカード': 'アイシーカード', '在留カード': 'ざいりゅうカード', 'ローマ字': 'ローマじ',
    '夕飯': 'ゆうはん', '大抵': 'たいてい', '干す（ほす）': 'ほす',
    '何時': 'なんじ', '明後日': 'あさって', '嫌': 'いや', '毎年': 'まいとし', '空く': 'すく', '得る': 'える',
    '十分': 'じゅうぶん', '大分': 'だいぶ', '二十日': 'はつか', '二日': 'ふつか', '十日': 'とおか', '四つ': 'よっつ',
    '一日': 'ついたち', '四日': 'よっか', '七日': 'なのか', '八つ': 'やっつ', '六つ': 'むっつ', '一昨日': 'おととい', '一昨年': 'おととし',
    'お祖父さん': 'おじいさん', 'お祖母さん': 'おばあさん', '富士山': 'ふじさん', '寒気': 'さむけ', '半日': 'はんにち',
    '年': 'とし', '日': 'にち', '金': 'かね', '米': 'こめ', '箱': 'はこ', '深い': 'ふかい', '私': 'わたし', '言う': 'いう',
    '辛い': 'からい', '明日': 'あした', '日本': 'にほん', '何': 'なに / なん', '何か': 'なにか', '後': 'のち', '表': 'おもて', '間': 'あいだ',
    '辺': 'あたり', '店員': 'てんいん', '雰囲気': 'ふんいき', '全員': 'ぜんいん', '禁煙': 'きんえん', '美容院': 'びよういん',
    '洗面所': 'せんめんじょう', '不動産屋': 'ふどうさんや', '郵便屋さん': 'ゆうびんやさん', '本屋': 'ほんや', '今夜': 'こんや',
    '消しゴム': 'けしゴム', '納豆': 'なっとう', '天ぷら': 'てんぷら', '餃子': 'ぎょうざ', '急行': 'きゅうこう', '昼食': 'ちゅうしょく', '発表': 'はっぴょう',
    '悪口': 'わるくち', '年賀状': 'ねんがじょう', '商店街': 'しょうてんがい', '出入り口': 'でいりぐち', 'お通し': 'おとおし',
    '目覚まし時計': 'めざましどけい', '半': 'はん', 'いつの間にか': 'いつのまにか', 'いつの間に': 'いつのまに', 'この間': 'このあいだ',
    '気を使う': 'きをつかう', '肌寒い': 'はだざむい', '片付ける': 'かたづける', '続ける': 'つづける', '続く': 'つづく', 'お茶漬け': 'おちゃづけ',
    '暖まる': 'あたたまる', '備える': 'そなえる', '原因': 'げんいん', '恋愛': 'れんあい', '範囲': 'はんい', '金色': 'きんいろ',  # the list's romaji has a typo here
    'お姉さん': 'おねえさん', '開く': 'あく', '一緒': 'いっしょ', '友達': 'ともだち', '今日': 'きょう', '昨日': 'きのう',
}


def reading_for(word, romaji):
    """-> (reading, status) status in {'kana','agree','override','sudachi','romaji'}"""
    if word in OVERRIDES:
        return OVERRIDES[word], 'override'
    if KANA_ONLY.match(word):
        return word, 'kana'
    rk = romaji_to_hira(romaji)
    try:
        sd = sudachi_hira(word)
    except Exception:
        sd = None
    if rk and sd and rk == sd:
        return rk, 'agree'
    if rk and sd and _norm(rk) == _norm(sd):
        return sd, 'sudachi'          # romaji cannot tell づ/ず, ん+や or long-vowel spelling apart: the dictionary decides
    if rk:
        return rk, 'romaji'
    return sd, 'sudachi-only'


if __name__ == '__main__':
    rows = list(csv.DictReader(open(HERE + '/japanese-modules/japanese-word-base.csv', encoding='utf-8-sig')))
    from collections import Counter
    c = Counter()
    bad = []
    for r in rows:
        rd, st = reading_for(r['word'], r['romaji'])
        c[st] += 1
        if st not in ('kana', 'agree'):
            bad.append((r['id'], r['word'], r['romaji'], rd, sudachi_hira(r['word']) if not KANA_ONLY.match(r['word']) else ''))
    print(c)
    for b in bad[:int(sys.argv[1]) if len(sys.argv) > 1 else 60]:
        print(*b)
