/**
 * Те же правила, что в rules.py у бота. Возвращают не только вердикт,
 * но и причину: без причины админ не понимает, за что бот удалил
 * сообщение, и перестаёт ему доверять.
 */
window.GUARD = (() => {
  'use strict';

  const LINK = /(https?:\/\/|www\.|t\.me\/|@[a-zA-Z][\w_]{4,})/;
  const SPAM = ['заробіток', 'заработок', 'крипт', 'інвест', 'инвест', 'ставк',
                'казино', 'usdt', 'схема', 'без вкладень', 'без вложений', 'в лс'];
  const TRICKY = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i' };

  const norm = s => (s || '').toLowerCase().replace(/[аеорсухі]/g, c => TRICKY[c] || c);
  // Словарь приводим к тому же виду, иначе защита от обхода ломает
  // распознавание честного спама — на этом уже один раз попались.
  const NORM_SPAM = SPAM.map(norm);

  function check(text, { isNew = true, hasLinkPerm = false, recent = [], stops = [] } = {}) {
    const low = norm(text);

    for (const w of stops) {
      if (w && low.includes(norm(w))) return { action: 'delete', reason: `слово зі стоп-списку: ${w}` };
    }

    const hits = NORM_SPAM.map((w, i) => low.includes(w) ? SPAM[i] : null).filter(Boolean);
    if (hits.length >= 2) return { action: 'mute', reason: `схоже на розсилку: ${hits.slice(0, 3).join(', ')}` };
    if (hits.length && LINK.test(low)) return { action: 'mute', reason: `посилання разом зі словом «${hits[0]}»` };

    if (LINK.test(low) && !hasLinkPerm) return { action: 'delete', reason: 'посилання від новачка' };

    const same = recent.filter(m => norm(m) === low && low).length;
    if (same >= 2) return { action: 'mute', reason: 'повтор того самого повідомлення' };
    if (recent.length >= 5) return { action: 'warn', reason: 'занадто часто пише' };

    const letters = [...(text || '')].filter(c => /\p{L}/u.test(c));
    const caps = letters.filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length;
    if (letters.length > 20 && caps / letters.length > 0.7) {
      return { action: 'warn', reason: 'усе великими літерами' };
    }

    if (isNew && low.length > 350 && LINK.test(low)) {
      return { action: 'mute', reason: 'довге перше повідомлення з посиланням' };
    }

    return { action: 'ok', reason: '' };
  }

  return { check };
})();
