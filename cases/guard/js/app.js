/**
 * Демо модератора. Вердикт считает rules.js — тот же, что у бота;
 * страница только разыгрывает ситуации и показывает реакцию.
 */
(() => {
  'use strict';

  const { check } = window.GUARD;
  const $ = s => document.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    kids.forEach(k => k && n.append(k));
    return n;
  };

  const chat = $('#chat');
  const strikes = {};          // кто сколько раз нарушил
  const recent = {};           // последние сообщения — для флуда и повторов
  let removed = 0, muted = 0, joined = 0;

  const SITUATIONS = [
    { id: 'join', title: 'Новачок зайшов', note: 'капча й обмеження до відповіді' },
    { id: 'normal', title: 'Звичайне повідомлення', note: 'бот не втручається',
      who: 'Оксана', text: 'всім привіт! хтось знає гарного майстра по дереву?' },
    { id: 'link', title: 'Посилання від новачка', note: 'видалення',
      who: 'Новий', text: 'дивіться що знайшов https://example.com/offer', isNew: true },
    { id: 'spam', title: 'Розсилка', note: 'мовчання',
      who: 'Новий', text: 'заробіток на крипті без вкладень, пиши в лс', isNew: true },
    { id: 'tricky', title: 'Обхід через схожі літери', note: 'ловиться так само',
      who: 'Новий', text: 'зapaбoтoк на кpиптe, cxeмa робоча', isNew: true },
    { id: 'caps', title: 'Капс', note: 'попередження',
      who: 'Ігор', text: 'ЧОМУ НІХТО НЕ ВІДПОВІДАЄ НА МОЄ ПИТАННЯ ВЖЕ ГОДИНУ' },
    { id: 'flood', title: 'Флуд', note: 'п’ять поспіль — попередження',
      who: 'Ігор', text: 'ну', flood: true },
    { id: 'repeat', title: 'Повтор', note: 'мовчання',
      who: 'Новий', text: 'купіть це', repeat: true, isNew: true }
  ];

  function line(cls, html) {
    const n = el('div', { class: cls, html });
    chat.append(n);
    chat.scrollTop = chat.scrollHeight;
    return n;
  }

  const esc = s => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  function post(who, text, muted_ = false) {
    return line('gmsg' + (muted_ ? ' gmsg-gone' : ''),
      `<b>${esc(who)}</b>${esc(text)}`);
  }

  function botSays(kind, html) {
    return line('gbot gbot-' + kind, html);
  }

  function run(s) {
    if (s.id === 'join') {
      joined++;
      botSays('sys', '👤 <b>Новий</b> приєднався. Службове повідомлення прибрано.');
      botSays('cap',
        '🧮 <b>Новий</b>, щоб писати — натисни правильну відповідь.<br><b>4 + 7 = ?</b>' +
        '<br><span class="dim">Є 2 хв. Не відповість — кік із негайним розбаном.</span>');
      update();
      return;
    }

    const who = s.who;
    recent[who] = recent[who] || [];

    if (s.flood) {
      for (let i = 0; i < 5; i++) {
        post(who, ['ну', 'ало', 'хто тут', 'відповідайте', 'ну шо'][i]);
        recent[who].push('x' + i);
      }
    }
    if (s.repeat) {
      post(who, s.text);
      post(who, s.text);
      recent[who].push(s.text, s.text);
    }

    const node = post(who, s.text);
    const verdict = check(s.text, {
      isNew: !!s.isNew,
      hasLinkPerm: !s.isNew,
      recent: recent[who],
      stops: []
    });
    recent[who].push(s.text);

    if (verdict.action === 'ok') {
      botSays('ok', '✓ <span class="dim">бот не втручається</span>');
      update();
      return;
    }

    node.classList.add('gmsg-gone');
    removed++;

    // Удаление — это ещё не наказание: сообщение убрано, счётчик
    // нарушений не растёт. Так и в боте: за ссылку новичок не
    // получает страйк, иначе один неудачный первый пост уводит
    // человека в мьют.
    if (verdict.action === 'delete') {
      botSays('act', `🧹 Прибрано повідомлення від <b>${esc(who)}</b>: ${verdict.reason}.` +
        '<br><span class="dim">без покарання — просто не місце для посилань</span>');
      update();
      return;
    }

    strikes[who] = (strikes[who] || 0) + 1;
    const n = strikes[who];

    let text;
    if (verdict.action === 'warn' && n < 3) {
      text = `⚠️ <b>${esc(who)}</b>: ${verdict.reason}. Попередження ${n}/3.`;
    } else if (n >= 5) {
      muted++;
      text = `🔇 <b>${esc(who)}</b> мовчить добу: ${verdict.reason}.`;
    } else {
      muted++;
      text = `🔇 <b>${esc(who)}</b> мовчить годину: ${verdict.reason}.`;
    }
    botSays('act', text + '<br><span class="dim">службове повідомлення зникне за хвилину</span>');
    update();
  }

  function update() {
    const box = $('#sum');
    box.textContent = '';
    [['Прибрано', removed], ['Обмежено', muted], ['Капч видано', joined]].forEach(([k, v]) => {
      box.append(el('div', {}, el('dt', { text: k }), el('dd', { text: String(v) })));
    });
  }

  const list = $('#cases');
  SITUATIONS.forEach(s => {
    const b = el('button', { class: 'case-btn', type: 'button' },
      el('b', { text: s.title }), el('i', { text: s.note }));
    b.addEventListener('click', () => run(s));
    list.append(b);
  });

  $('#restart').addEventListener('click', () => {
    chat.textContent = '';
    Object.keys(strikes).forEach(k => delete strikes[k]);
    Object.keys(recent).forEach(k => delete recent[k]);
    removed = muted = joined = 0;
    hello();
    update();
  });

  function hello() {
    line('gbot gbot-sys',
      'Бот у чаті. Права: видаляти повідомлення й обмежувати учасників.<br>' +
      '<span class="dim">Натисни ситуацію праворуч — вона розіграється тут.</span>');
  }

  hello();
  update();
})();
