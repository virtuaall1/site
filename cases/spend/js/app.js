/**
 * Демо бота учёта. Разбор — из parse.js, дальше только показ:
 * переписка, столбики по категориям и лимиты, которые считаются на лету.
 */
(() => {
  'use strict';

  const { CATEGORIES, parse, money } = window.SPEND;
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

  const spends = [];
  const learned = {};
  const LIMITS = { 'їжа': 400000, 'транспорт': 150000, 'розваги': 100000 };

  const chat = $('#chat');

  function say(who, html) {
    const n = el('div', { class: 'msg msg-' + who, html });
    chat.append(n);
    chat.scrollTop = chat.scrollHeight;
    return n;
  }

  function add(text) {
    say('me', text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])));
    const got = parse(text, learned);
    if (!got) {
      return say('bot', 'Не бачу суми. Напиши, наприклад: <b>120 кава</b>');
    }

    const item = { ...got, at: Date.now(), id: spends.length + 1 };
    spends.push(item);

    const warn = limitWarning(item.cat);
    const node = say('bot',
      `✅ ${money(item.kop)} · <b>${item.cat}</b>` +
      (item.note ? `<br><span class="dim">${item.note}</span>` : '') + warn);

    // кнопка исправления: одно нажатие — и слово запомнилось
    const box = el('div', { class: 'keys' });
    Object.keys(CATEGORIES).filter(c => c !== item.cat).slice(0, 4).forEach(cat => {
      const b = el('button', { class: 'key', type: 'button', text: cat });
      b.addEventListener('click', () => {
        item.cat = cat;
        (item.note || '').split(' ').filter(w => w.length > 2).forEach(w => { learned[w] = cat; });
        box.remove();
        node.innerHTML = `✅ ${money(item.kop)} · <b>${cat}</b><br><span class="dim">запам’ятав «${item.note}»</span>`;
        render();
      });
      box.append(b);
    });
    chat.append(box);
    chat.scrollTop = chat.scrollHeight;
    render();
  }

  function spentIn(cat) {
    return spends.filter(s => s.cat === cat).reduce((n, s) => n + s.kop, 0);
  }

  function limitWarning(cat) {
    const cap = LIMITS[cat];
    if (!cap) return '';
    const share = spentIn(cat) / cap;
    if (share >= 1) return `<br><span class="warn red">🔴 ліміт на ${cat} вичерпано</span>`;
    if (share >= 0.8) return `<br><span class="warn">🟡 ${cat}: ${Math.round(share * 100)} % ліміту</span>`;
    return '';
  }

  function render() {
    const byCat = {};
    spends.forEach(s => { byCat[s.cat] = (byCat[s.cat] || 0) + s.kop; });
    const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((n, r) => n + r[1], 0);

    $('#empty').hidden = rows.length > 0;

    const bars = $('#bars');
    bars.textContent = '';
    const top = rows[0] ? rows[0][1] : 1;
    rows.forEach(([cat, sum]) => {
      const li = el('li', {},
        el('span', { class: 'bar-name', text: cat }),
        el('span', { class: 'bar-track' }, el('i', { style: `width:${Math.max(4, sum / top * 100)}%` })),
        el('span', { class: 'bar-sum', text: money(sum) }));
      bars.append(li);
    });

    const limits = $('#limitList');
    limits.textContent = '';
    Object.entries(LIMITS).forEach(([cat, cap]) => {
      const used = spentIn(cat);
      const share = Math.min(1, used / cap);
      const state = used >= cap ? ' over' : share >= 0.8 ? ' near' : '';
      limits.append(el('li', {},
        el('span', { class: 'bar-name', text: cat }),
        el('span', { class: 'bar-track' + state }, el('i', { style: `width:${share * 100}%` })),
        el('span', { class: 'bar-sum', text: `${money(used)} / ${money(cap)}` })));
    });

    const sum = $('#sum');
    sum.textContent = '';
    [['Записів', spends.length], ['Разом', money(total)],
     ['Категорій', rows.length]].forEach(([k, v]) => {
      sum.append(el('div', {}, el('dt', { text: k }), el('dd', { text: String(v) })));
    });
  }

  /* быстрые примеры — чтобы можно было не печатать */
  const EXAMPLES = ['120 кава', 'таксі 85,50', '☕ 45 на виніс', '1200 оренда',
                    'аптека 260', '300 щось незрозуміле'];
  const quick = $('#quick');
  EXAMPLES.forEach(t => {
    const b = el('button', { class: 'pill pill-line pill-sm', type: 'button', text: t });
    b.addEventListener('click', () => add(t));
    quick.append(b);
  });

  $('#say').addEventListener('submit', e => {
    e.preventDefault();
    const value = $('#input').value.trim();
    if (!value) return;
    $('#input').value = '';
    add(value);
  });

  say('bot', 'Привіт! Пиши витрати одним рядком: <b>120 кава</b> або <b>таксі 85</b>.<br>' +
             '<span class="dim">Категорію підберу сам. Помилюсь — виправ кнопкою, запам’ятаю.</span>');
  render();
})();
