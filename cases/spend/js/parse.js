/**
 * Тот же разбор, что в parse.py у бота: словарь, сравнение основ и
 * выученные слова. Страница не изображает работу — она её повторяет.
 */
window.SPEND = (() => {
  'use strict';

  const CATEGORIES = {
    'їжа': ['кава', 'кофе', 'обід', 'їжа', 'продукти', 'сільпо', 'атб', 'новус',
            'сніданок', 'вечеря', 'піца', 'суші', 'ресторан', 'кафе', 'хліб', 'молоко'],
    'транспорт': ['таксі', 'убер', 'болт', 'метро', 'автобус', 'маршрутка',
                  'бензин', 'паливо', 'заправка', 'квиток'],
    'житло': ['оренда', 'квартира', 'комуналка', 'світло', 'газ', 'вода', 'інтернет'],
    'здоров’я': ['аптека', 'ліки', 'лікар', 'стоматолог', 'аналізи'],
    'одяг': ['одяг', 'взуття', 'куртка', 'кросівки', 'футболка'],
    'розваги': ['кіно', 'бар', 'концерт', 'гра', 'підписка', 'книга'],
    'зв’язок': ['київстар', 'водафон', 'лайфселл', 'мобільний'],
    'інше': []
  };

  const WORDS = {};
  for (const [cat, list] of Object.entries(CATEGORIES)) list.forEach(w => { WORDS[w] = cat; });

  const AMOUNT = /(?<![\d.,])(\d{1,7})(?:[.,](\d{1,2}))?(?!\d)/;

  const clean = s => s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s.,'’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  function parse(text, learned = {}) {
    const low = clean(text);
    const m = low.match(AMOUNT);
    if (!m) return null;

    const kop = Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'));
    if (!kop) return null;

    const note = (low.slice(0, m.index) + ' ' + low.slice(m.index + m[0].length))
      .replace(/\s+/g, ' ').trim();
    const words = note ? note.split(' ') : [];

    for (const w of words) if (learned[w]) return { kop, note, cat: learned[w] };
    for (const w of words) if (WORDS[w]) return { kop, note, cat: WORDS[w] };
    // основы: українська відмінюється, і «кавуська» словником не ловиться
    for (const w of words) {
      for (const [known, cat] of Object.entries(WORDS)) {
        const n = Math.min(w.length, known.length);
        if (n >= 4 && w.slice(0, n - 1) === known.slice(0, n - 1)) return { kop, note, cat };
      }
    }
    return { kop, note, cat: 'інше' };
  }

  const money = kop => (kop / 100).toFixed(2).replace('.', ',') + ' ₴';

  return { CATEGORIES, parse, money };
})();
