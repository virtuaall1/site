/**
 * Пліткарка. Меню перемикається вкладками, афіша — рідними <details>.
 * Ціни беруться з menu.js; поки їх немає, замість числа стоїть
 * «уточнюйте» — вигадувати ціни чинній кав'ярні не можна.
 */
(() => {
  'use strict';

  const CAFE = window.CAFE;
  if (!CAFE) return;

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const grid = $('#grid');
  const note = $('#priceNote');

  const priceTag = value => {
    const el = document.createElement('span');
    el.className = value == null ? 'item-price is-empty' : 'item-price';
    el.textContent = value == null ? 'уточнюйте' : `${value} ₴`;
    return el;
  };

  /** Картка позиції: фото, назва, ціна, опис */
  function card(item) {
    const li = document.createElement('li');
    li.className = 'item';

    const img = document.createElement('img');
    img.src = item.photo;
    img.alt = item.name;
    img.width = 393;
    img.height = 460;
    img.loading = 'lazy';

    const row = document.createElement('div');
    row.className = 'item-row';
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name;
    row.append(name, priceTag(item.price));

    const sub = document.createElement('p');
    sub.className = 'item-note';
    sub.textContent = item.note;

    li.append(img, row, sub);
    return li;
  }

  const TABS = {
    drinks: () => {
      grid.className = 'menu-grid';
      CAFE.drinks.forEach(d => grid.append(card(d)));
      note.textContent = 'Ціни підставляються в js/menu.js — по одному числу на позицію.';
    },
    bakes: () => {
      grid.className = 'menu-grid';
      CAFE.bakes.forEach(b => grid.append(card(b)));
      note.textContent = 'Печемо щоранку, тому склад дня може відрізнятися.';
    },
    syrups: () => {
      grid.className = 'menu-grid is-chips';
      CAFE.syrups.forEach(s => {
        const li = document.createElement('li');
        li.className = 'tag';
        li.textContent = s;
        grid.append(li);
      });
      note.textContent = 'Додаємо в лате й раф без доплати за перший сироп.';
    }
  };

  function show(key) {
    grid.textContent = '';
    TABS[key]();

    $$('.tab').forEach(t => {
      const on = t.dataset.tab === key;
      t.setAttribute('aria-selected', String(on));
      t.classList.toggle('is-on', on);
      t.classList.toggle('pill-dark', on);
      t.classList.toggle('pill-line', !on);
    });
  }

  $$('.tab').forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
  show('drinks');

  /* --- афіша --- */
  const bill = $('#bill');
  CAFE.events.forEach((e, i) => {
    const d = document.createElement('details');
    if (i === 0) d.open = true;

    const s = document.createElement('summary');
    s.textContent = e.title;

    const body = document.createElement('div');
    body.className = 'acc-body';

    const kind = document.createElement('p');
    kind.className = 'ev-kind';
    kind.textContent = e.kind;

    const text = document.createElement('p');
    text.textContent = e.body;

    const when = document.createElement('p');
    when.className = 'ev-when';
    when.textContent = e.when;

    body.append(kind, text, when);
    d.append(s, body);
    bill.append(d);
  });

  /* --- точки --- */
  const spots = $('#spots');
  CAFE.spots.forEach(sp => {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = sp.name;
    const w = document.createElement('span');
    w.textContent = sp.where;
    li.append(b, w);
    spots.append(li);
  });

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
