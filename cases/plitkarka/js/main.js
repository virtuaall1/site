/**
 * Пліткарка.
 *
 * Головне тут — світло: поки гортаєш, тло, текст і акцент повільно
 * переходять від ранкового фарфору до вечірньої кімнати. Кольори
 * лежать у змінних на :root, тож міняється все одразу — і схема
 * вулиці, і крапкові лідери в меню.
 *
 * Без залежностей і без збірки.
 */
(() => {
  'use strict';

  const CAFE = window.CAFE;
  if (!CAFE) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* =======================================================
     Світло: два стани і плавний перехід між ними
     ======================================================= */
  /* Тло теплішає, але лишається світлим: якщо тягнути його в темне
     лінійно, десь посередині виходить сіра каша, у якій текст не
     читається. Вечір приходить окремими розділами з власною
     палітрою — див. .act-dusk у стилях. */
  const MORNING = {
    bg: [236, 238, 235], ink: [25, 26, 23], muted: [108, 111, 105],
    accent: [179, 69, 94], rule: [25, 26, 23, 0.16], veil: [25, 26, 23, 0.05]
  };
  const AFTERNOON = {
    bg: [233, 224, 211], ink: [32, 26, 20], muted: [122, 111, 98],
    accent: [140, 47, 68], rule: [32, 26, 20, 0.2], veil: [32, 26, 20, 0.06]
  };

  const PARTS = ['Зранку', 'Вдень', 'Пополудні', 'Увечері'];

  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const rgb = (from, to, t) => `rgb(${mix(from[0], to[0], t)} ${mix(from[1], to[1], t)} ${mix(from[2], to[2], t)})`;
  const rgba = (from, to, t) =>
    `rgba(${mix(from[0], to[0], t)}, ${mix(from[1], to[1], t)}, ${mix(from[2], to[2], t)}, ${(from[3] + (to[3] - from[3]) * t).toFixed(3)})`;

  const fill = $('#dayFill');
  const partLabel = $('#partOfDay');
  const themeColor = $('#themeColor');

  function paint(t) {
    root.style.setProperty('--bg', rgb(MORNING.bg, AFTERNOON.bg, t));
    root.style.setProperty('--ink', rgb(MORNING.ink, AFTERNOON.ink, t));
    root.style.setProperty('--muted', rgb(MORNING.muted, AFTERNOON.muted, t));
    root.style.setProperty('--accent', rgb(MORNING.accent, AFTERNOON.accent, t));
    root.style.setProperty('--rule', rgba(MORNING.rule, AFTERNOON.rule, t));
    root.style.setProperty('--veil', rgba(MORNING.veil, AFTERNOON.veil, t));

    if (fill) fill.style.width = `${(t * 100).toFixed(1)}%`;
    if (partLabel) partLabel.textContent = PARTS[Math.min(PARTS.length - 1, Math.floor(t * PARTS.length))];
    if (themeColor) themeColor.setAttribute('content', rgb(MORNING.bg, AFTERNOON.bg, t));
  }

  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      paint(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      queued = false;
    });
  }

  if (reduceMotion) {
    paint(0.28);                       // спокійний ранній день, без руху
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* =======================================================
     Меню напоїв: наведення міняє знімок
     ======================================================= */
  const price = value => (value == null ? '—' : `${value} ₴`);

  const drinksBox = $('#drinks');
  const cupImg = $('#cupImg');
  const cupCap = $('#cupCap');
  const shot = $('.shot');
  let current = 0;
  let swapTimer = null;

  CAFE.drinks.forEach((item, index) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-current', String(index === 0));

    const name = document.createElement('span');
    name.className = 'm-name';
    name.textContent = item.name;

    const lead = document.createElement('i');
    lead.className = 'm-lead';
    lead.setAttribute('aria-hidden', 'true');

    const cost = document.createElement('span');
    cost.className = 'm-price';
    cost.textContent = price(item.price);

    btn.append(name, lead, cost);

    const note = document.createElement('span');
    note.className = 'm-note';
    note.textContent = item.note;
    btn.insertBefore(note, lead);

    const show = () => {
      if (index === current) return;
      current = index;

      Array.from(drinksBox.querySelectorAll('button')).forEach((b, i) => {
        b.setAttribute('aria-current', String(i === index));
      });

      const paintShot = () => {
        cupImg.src = item.photo;
        cupImg.alt = item.name;
        cupCap.textContent = `${item.name} · ${item.note}`;
      };

      if (reduceMotion) { paintShot(); return; }

      shot.classList.add('is-swap');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => {
        paintShot();
        shot.classList.remove('is-swap');
      }, 200);
    };

    btn.addEventListener('mouseenter', show);
    btn.addEventListener('focus', show);
    btn.addEventListener('click', show);

    li.append(btn);
    drinksBox.append(li);
  });

  /* =======================================================
     З печі
     ======================================================= */
  const bakesBox = $('#bakes');
  CAFE.bakes.forEach(item => {
    const li = document.createElement('li');

    const img = document.createElement('img');
    img.src = item.photo;
    img.alt = item.name;
    img.width = 393;
    img.height = 460;
    img.loading = 'lazy';

    const row = document.createElement('div');
    row.className = 'b-row';
    const name = document.createElement('span');
    name.className = 'b-name';
    name.textContent = item.name;
    const cost = document.createElement('span');
    cost.className = 'b-price';
    cost.textContent = price(item.price);
    row.append(name, cost);

    const note = document.createElement('p');
    note.className = 'b-note';
    note.textContent = item.note;

    li.append(img, row, note);
    bakesBox.append(li);
  });

  const syrupsBox = $('#syrups');
  CAFE.syrups.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    syrupsBox.append(li);
  });

  /* =======================================================
     Афіша
     ======================================================= */
  const billBox = $('#bill');
  CAFE.events.forEach(item => {
    const li = document.createElement('li');

    const kind = document.createElement('p');
    kind.className = 'e-kind';
    kind.textContent = item.kind;

    const title = document.createElement('h3');
    title.textContent = item.title;

    const body = document.createElement('p');
    body.textContent = item.body;

    const when = document.createElement('p');
    when.className = 'e-when';
    when.textContent = item.when;

    li.append(kind, title, body, when);
    billBox.append(li);
  });

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
