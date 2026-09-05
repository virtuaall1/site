/**
 * Демо бота записи.
 *
 * Считает то же самое, что настоящий бот: свободные окна из графика
 * и занятого времени, с учётом длительности услуги. Данные из
 * data.js повторяют config.py — страница не «рисует красиво», а
 * показывает ту же логику.
 *
 * Всё живёт в памяти вкладки. Никуда ничего не уходит.
 */
(() => {
  'use strict';

  const { services, masters, hours, step, taken } = window.SALON;

  const $ = sel => document.querySelector(sel);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;      // тексты свои, не от пользователя
      else n.setAttribute(k, v);
    }
    kids.forEach(k => k && n.append(k));
    return n;
  };

  const money = kop => (kop / 100).toFixed(0) + ' ₴';
  const DAYS = ['сьогодні', 'завтра', 'післязавтра'];
  const NAMES = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];

  /* Три ближайших рабочих дня — по ним и живёт демо. */
  const today = new Date();
  const days = [];
  for (let i = 0; days.length < 3 && i < 10; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (hours[(d.getDay() + 6) % 7]) days.push(d);
  }

  const toMin = hhmm => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const toHHMM = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' +
                        String(min % 60).padStart(2, '0');

  /* Занятое: то, что было изначально, плюс то, что записали в демо. */
  let booked = taken.map(t => ({ ...t, from: toMin(t.from), mine: false }));
  const state = { dayIdx: 0, service: null, master: null };

  function shift(dayIdx) {
    return hours[(days[dayIdx].getDay() + 6) % 7];
  }

  /**
   * Свободные начала для услуги. Окно годится, только если весь
   * отрезок свободен и целиком влезает в смену, — ровно как в slots.py.
   */
  function freeSlots(dayIdx, masterCode, minutes) {
    const [open, close] = shift(dayIdx);
    const busy = booked.filter(b => b.day === dayIdx && b.master === masterCode);
    const out = [];
    for (let t = open * 60; t + minutes <= close * 60; t += step) {
      const clash = busy.some(b => t < b.from + b.minutes && b.from < t + minutes);
      if (!clash) out.push(t);
    }
    return out;
  }

  /* ---------------- переписка ---------------- */
  const chat = $('#chat');

  function say(who, html) {
    const node = el('div', { class: 'msg msg-' + who, html });
    chat.append(node);
    chat.scrollTop = chat.scrollHeight;
    return node;
  }

  function keys(list) {
    const box = el('div', { class: 'keys' });
    list.forEach(({ label, main, time, act }) => {
      const b = el('button', {
        class: 'key' + (main ? ' key-main' : '') + (time ? ' key-time' : ''),
        type: 'button', text: label
      });
      b.addEventListener('click', () => {
        box.remove();
        say('me', label);
        act();
      });
      box.append(b);
    });
    chat.append(box);
    chat.scrollTop = chat.scrollHeight;
  }

  function askService() {
    say('bot', 'Привіт! Я записую до майстра.<br>Що робимо?');
    keys(services.map(s => ({
      label: `${s.title} · ${money(s.price)}`,
      act: () => { state.service = s; askMaster(); }
    })));
  }

  function askMaster() {
    const fit = masters.filter(m => m.does.includes(state.service.code));
    say('bot', `<b>${state.service.title}</b><br><span class="dim">${state.service.minutes} хв</span><br>До кого?`);
    keys([
      { label: 'Будь-хто вільний', main: true, act: () => { state.master = 'any'; askDay(); } },
      ...fit.map(m => ({ label: m.name, act: () => { state.master = m.code; askDay(); } }))
    ]);
  }

  function mastersFor() {
    return state.master === 'any'
      ? masters.filter(m => m.does.includes(state.service.code)).map(m => m.code)
      : [state.master];
  }

  function askDay() {
    const has = days.map((d, i) =>
      mastersFor().some(m => freeSlots(i, m, state.service.minutes).length) ? i : -1
    ).filter(i => i >= 0);

    if (!has.length) {
      say('bot', 'Вільного часу немає. Додати тебе в лист очікування?');
      return keys([{ label: '🔔 Так, повідом', main: true, act: joinWait }]);
    }

    say('bot', 'Коли зручно?');
    keys(has.map(i => ({
      label: DAYS[i] || `${days[i].getDate()} ${NAMES[(days[i].getDay() + 6) % 7]}`,
      act: () => { state.dayIdx = i; renderAdmin(); askSlot(); }
    })));
  }

  function askSlot() {
    /* У «будь-хто вільний» одно время может быть у разных мастеров —
       показываем по разу, кто именно, решаем сами. */
    const pick = new Map();
    mastersFor().forEach(m => {
      freeSlots(state.dayIdx, m, state.service.minutes).forEach(t => {
        if (!pick.has(t)) pick.set(t, m);
      });
    });

    if (!pick.size) {
      say('bot', 'Цей день уже зайнятий.');
      return keys([
        { label: '🔔 Повідомити, якщо звільниться', main: true, act: joinWait },
        { label: '← Інший день', act: askDay }
      ]);
    }

    const label = DAYS[state.dayIdx] || days[state.dayIdx].getDate();
    say('bot', `<b>${state.service.title}</b> · ${label}<br>Обери час:`);
    keys([...pick.keys()].sort((a, b) => a - b).map(t => ({
      label: toHHMM(t), time: true,
      act: () => confirm(t, pick.get(t))
    })));
  }

  function confirm(from, masterCode) {
    /* Проверка перед записью — как уникальный индекс в базе у бота:
       между показом и нажатием время могло уйти. */
    const still = freeSlots(state.dayIdx, masterCode, state.service.minutes).includes(from);
    if (!still) {
      say('bot', '😕 Цей час щойно зайняли. Обери інший.');
      return askSlot();
    }

    booked.push({ master: masterCode, day: state.dayIdx, from, minutes: state.service.minutes, mine: true });
    const m = masters.find(x => x.code === masterCode);
    const label = DAYS[state.dayIdx] || days[state.dayIdx].getDate();

    say('bot',
      `✅ Записав.<br><b>${state.service.title}</b><br>${label}, ${toHHMM(from)} · ${m.name}<br>` +
      `${money(state.service.price)}<br><span class="dim">Нагадаю за добу й за дві години.</span>`);
    renderAdmin();
    showWait(from, masterCode);

    keys([{ label: 'Записатись ще раз', act: () => { reset(false); } }]);
  }

  function joinWait() {
    say('bot', '🔔 Додав у чергу. Щойно хтось скасує — напишу першому, з готовою кнопкою на це вікно.');
    $('#waitStrip').hidden = false;
    $('#waitText').textContent = 'Ти в черзі. Натисни кнопку — подивись, що станеться, коли місце звільниться.';
  }

  function showWait(from, masterCode) {
    const strip = $('#waitStrip');
    strip.hidden = false;
    $('#waitText').textContent =
      'У демо хтось уже стоїть у черзі на цей день. Звільни чуже вікно — побачиш, що бот зробить сам.';
    strip.dataset.master = masterCode;
  }

  $('#freeUp').addEventListener('click', () => {
    const victim = booked.find(b => !b.mine && b.day === state.dayIdx);
    if (!victim) {
      $('#waitText').textContent = 'Чужих записів на цей день уже немає.';
      return;
    }
    booked = booked.filter(b => b !== victim);
    renderAdmin();
    say('bot',
      `🔔 Звільнилось: ${DAYS[state.dayIdx] || ''} ${toHHMM(victim.from)}, ` +
      `${masters.find(m => m.code === victim.master).name}.<br>` +
      '<span class="dim">Так виглядає лист очікування: бот пише першому сам, без участі майстра.</span>');
    keys([{ label: `Забронювати ${toHHMM(victim.from)}`, main: true, act: () => {
      state.service = state.service || services[0];
      confirm(victim.from, victim.master);
    } }]);
  });

  /* ---------------- кабинет мастера ---------------- */

  function renderTabs() {
    const box = $('#dayTabs');
    box.textContent = '';
    days.forEach((d, i) => {
      const b = el('button', {
        class: 'day-tab', type: 'button', role: 'tab',
        'aria-selected': String(i === state.dayIdx),
        text: DAYS[i] || `${d.getDate()} ${NAMES[(d.getDay() + 6) % 7]}`
      });
      b.addEventListener('click', () => { state.dayIdx = i; renderAdmin(); });
      box.append(b);
    });
  }

  function renderAdmin() {
    renderTabs();
    const grid = $('#grid');
    grid.textContent = '';

    const [open, close] = shift(state.dayIdx);
    const head = el('div', { class: 'grid-head' }, el('span', { text: '' }));
    masters.forEach(m => head.append(el('span', { text: m.name })));
    grid.append(head);

    const body = el('div', { class: 'grid-body' });
    for (let t = open * 60; t < close * 60; t += 30) {
      const row = el('div', { class: 'grid-row' }, el('span', { class: 'hour', text: toHHMM(t) }));
      masters.forEach(m => {
        const hit = booked.find(b => b.day === state.dayIdx && b.master === m.code &&
                                     t < b.from + b.minutes && b.from < t + 30);
        row.append(el('div', {
          class: 'cell ' + (hit ? (hit.mine ? 'mine' : 'busy') : 'free'),
          title: hit ? (hit.mine ? 'твій запис' : 'зайнято') : 'вільно'
        }));
      });
      body.append(row);
    }
    grid.append(body);

    grid.append(el('p', { class: 'legend', html:
      '<span><i style="background:#eeede7"></i>вільно</span>' +
      '<span><i style="background:#cfcec6"></i>зайнято</span>' +
      '<span><i style="background:#c6f24d;box-shadow:0 0 0 2px #232322 inset"></i>твій запис</span>' }));

    renderSum();
  }

  function renderSum() {
    const day = booked.filter(b => b.day === state.dayIdx);
    const [open, close] = shift(state.dayIdx);
    const workMin = (close - open) * 60 * masters.length;
    const busyMin = day.reduce((s, b) => s + b.minutes, 0);
    const mine = day.filter(b => b.mine).length;

    const box = $('#sum');
    box.textContent = '';
    [['Записів', day.length], ['Твоїх', mine],
     ['Завантаження', Math.round(busyMin / workMin * 100) + '%']].forEach(([k, v]) => {
      box.append(el('div', {}, el('dt', { text: k }), el('dd', { text: String(v) })));
    });
  }

  /* ---------------- запуск ---------------- */

  function reset(full = true) {
    if (full) {
      booked = taken.map(t => ({ ...t, from: toMin(t.from), mine: false }));
      chat.textContent = '';
      $('#waitStrip').hidden = true;
      state.dayIdx = 0;
    }
    state.service = null;
    state.master = null;
    renderAdmin();
    askService();
  }

  $('#restart').addEventListener('click', () => reset(true));
  reset(true);
})();
