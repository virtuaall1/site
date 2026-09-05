"""
Правила, по которым бот решает, что сообщение — мусор.

Вынесено отдельно от телеграма, чтобы проверять логику без чата:
на вход строка и немного контекста, на выходе — вердикт с причиной.
Причина важнее самого вердикта: без неё модератор не понимает, за
что бот удалил сообщение, и перестаёт ему доверять.
"""
import re
from dataclasses import dataclass

LINK = re.compile(r'(https?://|www\.|t\.me/|@[a-zA-Z][\w_]{4,})')
# Слова, которые почти не встречаются в живой речи, но есть в каждой рассылке
SPAM_WORDS = (
    'заработок', 'заробіток', 'крипт', 'инвест', 'інвест', 'ставк', 'казино',
    'binance', 'usdt', 'схема', 'пассивный доход', 'пасивний дохід',
    'без вложений', 'без вкладень', 'в лс', 'пиши в лс', 'напиши в личку',
)
# Невидимые и «похожие» символы, которыми обходят фильтры
TRICKY = str.maketrans({'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c',
                        'у': 'y', 'х': 'x', 'і': 'i', '​': '', '‌': '',
                        '‍': '', '﻿': ''})


@dataclass
class Verdict:
    action: str        # ok | delete | warn | mute
    reason: str = ''


def normalize(text):
    return (text or '').lower().translate(TRICKY)


# Словарь приводим к тому же виду, что и сообщение. Иначе замена
# похожих букв работает против нас: «заробіток» после неё становится
# «зapoбiтoк» и перестаёт совпадать с самим собой в списке.
NORM_SPAM = tuple(normalize(w) for w in SPAM_WORDS)


def check(text, *, is_new, has_link_perm, recent, blacklist=()):
    """
    text          — сообщение
    is_new        — участник в чате меньше суток
    has_link_perm — можно ли ему ссылки (админ, старожил)
    recent        — его последние сообщения (для флуда и повторов)
    blacklist     — слова, добавленные админом чата
    """
    low = normalize(text)

    for word in blacklist:
        if word and normalize(word) in low:
            return Verdict('delete', f'слово зі стоп-списку: {word}')

    hits = [SPAM_WORDS[i] for i, w in enumerate(NORM_SPAM) if w in low]
    if len(hits) >= 2:
        return Verdict('mute', f'схоже на розсилку: {", ".join(hits[:3])}')
    if hits and LINK.search(low):
        return Verdict('mute', f'посилання разом зі словом «{hits[0]}»')

    if LINK.search(low) and not has_link_perm:
        return Verdict('delete', 'посилання від новачка')

    # один и тот же текст несколько раз подряд
    same = [m for m in recent if normalize(m) == low and low]
    if len(same) >= 2:
        return Verdict('mute', 'повтор того самого повідомлення')

    # флуд: пять сообщений подряд без реакции окружающих
    if len(recent) >= 5:
        return Verdict('warn', 'занадто часто пише')

    # каппс длинной строкой
    letters = [c for c in text or '' if c.isalpha()]
    if len(letters) > 20 and sum(c.isupper() for c in letters) / len(letters) > 0.7:
        return Verdict('warn', 'усе великими літерами')

    if is_new and len(low) > 350 and LINK.search(low):
        return Verdict('mute', 'довге перше повідомлення з посиланням')

    return Verdict('ok')
