/**
 * Поведение сайта.
 * Правило безопасности: данные из GitHub API попадают в DOM только
 * через textContent / createElement — никакого innerHTML со сторонним
 * содержимым, поэтому XSS через описание чужого репозитория невозможен.
 */
(() => {
  'use strict';

  const {
    LINKS, GITHUB_USER, HIDDEN_REPOS, SELF_REPO, OWN_CODE, PROJECTS, SERVICES,
    PROCESS, FAQ, EXTRA_STACK, PLURALS, I18N
  } = window.SITE;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Телефоны и планшеты: курсора нет, а покадровая отрисовка фона, GSAP и
     инерционный скролл только жрут батарею и дёргают прокрутку. Там всё
     тяжёлое выключаем — фоновую сетку рисует CSS одной статичной картинкой. */
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const heavyAnim = !reduceMotion && !coarsePointer;

  /** Короткий конструктор элементов: el('div', {class:'x'}, 'текст') */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const child of children) {
      if (child == null) continue;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  /* =======================================================
     Язык: uk для местных локалей, en для остальных
     ======================================================= */
  const SUPPORTED = ['uk', 'en'];
  const LOCALES = { uk: 'uk-UA', en: 'en-GB' };

  function detectLang() {
    try {
      const saved = localStorage.getItem('lang');
      if (SUPPORTED.includes(saved)) return saved;
    } catch (e) { /* приватный режим — молча пропускаем */ }

    // украинский для местных локалей, английский для всех остальных
    const candidates = navigator.languages || [navigator.language || 'uk'];
    for (const raw of candidates) {
      const code = String(raw).toLowerCase();
      if (code.startsWith('uk') || code.startsWith('ru')) return 'uk';
      if (code.startsWith('en')) return 'en';
    }
    return 'uk';
  }

  /* =======================================================
     Валюта. Ціни живуть у гривні одним числом — долар рахується
     за курсом дня, щоб два записаних числа не розійшлись між собою
     через півроку. Курс беремо в НБУ; якщо він мовчить — із
     запасного джерела; якщо мовчать обидва, лишається останній
     відомий курс і підпис, що він не сьогоднішній.
     ======================================================= */
  const RATE_TTL = 12 * 3600 * 1000;
  const CURRENCIES = ['uah', 'usd'];
  let rate = { usd: 44.61, date: '2026-09-03', live: false };   // НБУ, 3 вересня 2026

  const RATE_SOURCES = [
    {
      url: 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json&valcode=USD',
      read: d => ({ usd: d[0].rate, date: d[0].exchangedate.split('.').reverse().join('-') })
    },
    {
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      read: d => ({ usd: d.usd.uah, date: d.date })
    }
  ];

  async function loadRate() {
    try {
      const saved = JSON.parse(localStorage.getItem('rate') || 'null');
      if (saved && Date.now() - saved.at < RATE_TTL) { rate = saved.rate; return; }
    } catch (e) { /* приватний режим або зіпсований запис */ }

    for (const src of RATE_SOURCES) {
      try {
        const res = await fetch(src.url);
        if (!res.ok) continue;
        const got = src.read(await res.json());
        // курс поза цією вилкою означає, що джерело віддало щось інше
        // (наприклад, долар за гривню) — краще лишитись зі старим числом
        if (!(got.usd > 10 && got.usd < 200)) continue;
        rate = { usd: got.usd, date: got.date, live: true };
        try { localStorage.setItem('rate', JSON.stringify({ at: Date.now(), rate })); } catch (e) { /* noop */ }
        return;
      } catch (e) { /* пробуємо наступне джерело */ }
    }
  }

  function detectCurrency() {
    try {
      const saved = localStorage.getItem('currency');
      if (CURRENCIES.includes(saved)) return saved;
    } catch (e) { /* приватний режим */ }
    return lang === 'uk' ? 'uah' : 'usd';
  }

  /** Долар округлюємо до п'ятірки: це ціна, а не результат ділення. */
  const inUah = n => '₴' + n.toLocaleString('uk-UA');
  const inUsd = n => '$' + Math.round(n / rate.usd / 5) * 5;
  const money = (n, cur) => (cur === 'uah' ? inUah : inUsd)(n);

  let lang = detectLang();
  let currency = detectCurrency();
  let booted = false;
  /* при смене языка контент не должен заново «проявляться» — иначе страница прыгает */
  let skipReveal = false;
  const t = key => (I18N[lang] && I18N[lang][key]) || I18N.uk[key] || key;

  /* =======================================================
     Тема: тёмная по умолчанию, светлая — по выбору или системной
     ======================================================= */
  const root = document.documentElement;

  function detectTheme() {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* приватный режим */ }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(next) {
    const theme = next === 'light' ? 'light' : 'dark';
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (e) { /* noop */ }

    const btn = $('#themeBtn');
    if (btn) btn.setAttribute('aria-pressed', String(theme === 'light'));
  }

  /** Ссылка на Telegram с уже готовым текстом сообщения */
  function tgLink(text) {
    return `${LINKS.telegram}?text=${encodeURIComponent(text)}`;
  }

  /** класс появления: анимируем только первую отрисовку */
  function revealCls(extra = '') {
    return `${extra} reveal${skipReveal ? ' in' : ''}`.trim();
  }

  /**
   * Готовая разметка от сборки. Списки кейсов, шагов и вопросов
   * уезжают в index.html уже собранными — рисовать их второй раз
   * незачем: это лишняя работа на старте и лишнее мигание. Метку
   * снимаем сразу: при следующей смене языка рисуем сами.
   */
  function usePrerendered(node) {
    if (!node || node.dataset.pre !== lang) return false;
    delete node.dataset.pre;
    return true;
  }

  /**
   * Смена языка и валюты перерисовывает целые списки: страница
   * моргает и дёргается. View Transitions превращают это в
   * перетекание — браузер снимает кадр до и кадр после и сам
   * разводит их. Где API нет, всё работает как раньше.
   */
  function smoothSwap(fn) {
    if (reduceMotion || !document.startViewTransition) { fn(); return Promise.resolve(); }
    // updateCallbackDone, а не сам вызов: он отдаёт управление сразу,
    // а нам важно, чтобы восстановление скролла случилось уже после
    // перерисовки, иначе высота страницы поедет под ногами
    return document.startViewTransition(fn).updateCallbackDone;
  }

  /**
   * Английский словарь приезжает отдельным файлом.
   *
   * В исходниках оба языка лежат в content.js рядом — так удобно
   * править. Сборка их разделяет: общее и украинское остаются в
   * content.js, английское уходит в js/lang-en.js. Тому, кто читает
   * по-украински (а это почти все), эти байты не отдаются вовсе.
   *
   * Если файла нет (обычная разработка по исходникам), словарь уже
   * на месте — и сюда мы просто не заходим.
   */
  let langPack = null;

  function graft(base, extra) {
    for (const key of Object.keys(extra)) {
      const value = extra[key];
      if (value == null) continue;                 // пропуск в списке — не трогаем
      if (typeof value === 'object' && base[key] && typeof base[key] === 'object') {
        graft(base[key], value);
      } else {
        base[key] = value;
      }
    }
  }

  function loadLangPack() {
    if (langPack) return langPack;
    const src = (window.SITE && window.SITE.EN_FILE) || 'js/lang-en.js';
    langPack = loadScript(src).then(() => {
      const extra = window.SITE_EN;
      if (!extra) throw new Error('lang-en.js не отдал словарь');
      graft(window.SITE, extra);
    }).catch(err => {
      langPack = null;                             // дать шанс попробовать ещё раз
      throw err;
    });
    return langPack;
  }

  function applyLang(next) {
    const want = SUPPORTED.includes(next) ? next : 'uk';
    // словарь этого языка ещё не приехал — сходим за ним и вернёмся
    if (!I18N[want]) {
      loadLangPack().then(() => applyLang(want)).catch(err => {
        console.warn('Словник не доїхав:', err.message);
        // остаёмся на прежнем языке; если и его словаря нет (так
        // бывает только на самом старте) — на украинском
        applyLang(I18N[lang] ? lang : 'uk');
      });
      return;
    }
    lang = want;
    skipReveal = booted;
    // Перерисовка списков схлопывает высоту документа, и браузер тут
    // же прижимает скролл к новому потолку — человека выбрасывало в
    // начало страницы. Запомнить позицию мало: возвращать её некуда,
    // пока страница короткая. Поэтому придерживаем высоту распоркой,
    // пока не вернём позицию.
    const scrollBefore = window.scrollY;
    if (booted) document.body.style.minHeight = document.body.scrollHeight + 'px';
    try { localStorage.setItem('lang', lang); } catch (e) { /* noop */ }

    document.documentElement.lang = lang;
    document.title = t('meta.title');
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.desc'));

    const redraw = () => {
      $$('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
      $$('.lang-btn').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));

      const curBox = $('#curSwitch');
      if (curBox) curBox.setAttribute('aria-label', t('services.currency'));
      renderCases();
      renderServices();
      renderRate();
      renderSteps();
      renderFaq();
      renderFigures();
      refreshStats();

      // текст готового сообщения тоже зависит от языка
      const tgBtn = $('#tgLink');
      if (tgBtn) tgBtn.href = tgLink(t('contact.tgText'));
      if (state.repos) renderRepos(state.repos);
    };

    smoothSwap(redraw).then(() => {
      if (!booted) { document.body.style.minHeight = ''; return; }
      refreshAnimations();
      // браузер сбрасывает позицию уже после пересчёта раскладки,
      // поэтому возвращаемся на место следующим кадром после него
      const restore = () => {
        if (smoothScroll) smoothScroll.scrollTo(scrollBefore, { immediate: true });
        // behavior: 'instant' обязателен: в css у html стоит
        // scroll-behavior: smooth, и обычный scrollTo уехал бы туда
        // плавной анимацией — посреди смены языка это выглядит как
        // самопроизвольная прокрутка
        else window.scrollTo({ top: scrollBefore, behavior: 'instant' });
        document.body.style.minHeight = '';
      };
      requestAnimationFrame(() => requestAnimationFrame(restore));
    });
  }

  function renderFigures() {
    const figures = $('#heroFigures');
    if (!figures) return;
    figures.textContent = '';
    const items = t('hero.figures') || [];
    items.forEach(text => figures.append(el('span', { text: `— ${text}` })));
  }

  /* =======================================================
     Рендер статических блоков
     ======================================================= */
  /**
   * Оборачивает <img> в <picture> с avif и webp.
   *
   * Браузер берёт первый формат, который понимает, и до jpg доходит
   * только там, где остальные не поддерживаются. Экономия на снимках
   * кейсов — около двух третей веса, а картинка та же: пережимает их
   * scripts/images.py из того же исходника.
   */
  function picture(jpg, img) {
    const base = jpg.replace(/\.jpg$/, '');
    return el('picture', {},
      el('source', { srcset: `${base}.avif`, type: 'image/avif' }),
      el('source', { srcset: `${base}.webp`, type: 'image/webp' }),
      img
    );
  }

  /** Кейси, які можна відкрити: беремо ті проєкти, у яких є знімок */
  function renderCases() {
    const grid = $('#caseGrid');
    if (!grid) return;
    if (usePrerendered(grid)) return;
    grid.textContent = '';

    const shown = (PROJECTS || []).filter(p => p.shot && p.link);
    if (!shown.length) { grid.hidden = true; return; }

    shown.forEach((project, i) => {
      const copy = project[lang] || project.uk;
      if (!copy) return;

      // Первый снимок виден сразу — грузим его в приоритете и без
      // lazy: иначе браузер откладывает и первый экран доезжает
      // позже, чем мог бы. Остальные — как раньше.
      const first = i === 0;
      const shot = el('img', {
        class: 'case-shot',
        src: project.shot,
        alt: copy.name,
        width: '960',
        height: '600',
        decoding: 'async',
        loading: first ? 'eager' : 'lazy',
        fetchpriority: first ? 'high' : null
      });

      const tags = el('div', { class: 'case-tags' });
      (copy.tags || []).slice(0, 3).forEach(tag => tags.append(el('span', { text: tag })));

      grid.append(el('li', { class: revealCls('case') },
        el('a', { class: 'case-link', href: project.link, target: '_blank', rel: 'noopener noreferrer' },
          el('span', { class: 'case-frame' }, picture(project.shot, shot)),
          el('h3', { class: 'case-name', text: copy.name }),
          tags,
          el('span', { class: 'case-open' }, el('span', { text: t('cases.open') }), el('span', { 'aria-hidden': 'true', text: '↗' }))
        )
      ));
    });
  }

  /** Підпис під списком: звідки взявся курс і на яке число. */
  function renderRate() {
    const note = $('#curNote');
    if (!note) return;
    const locale = LOCALES[lang] || 'uk-UA';
    const shown = rate.usd.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const date = new Date(rate.date).toLocaleDateString(locale);
    note.textContent = t(rate.live ? 'services.rateLive' : 'services.rateOld')
      .replace('{rate}', shown).replace('{date}', date);
  }

  function applyCurrency(next) {
    currency = CURRENCIES.includes(next) ? next : 'uah';
    try { localStorage.setItem('currency', currency); } catch (e) { /* noop */ }
    $$('.cur-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cur === currency)));
    smoothSwap(() => {
      skipReveal = booted;
      renderServices();
      renderRate();
      skipReveal = false;
    });
  }

  function setupCurrency() {
    const box = $('#curSwitch');
    if (!box) return;
    box.addEventListener('click', e => {
      const btn = e.target.closest('.cur-btn');
      if (btn) applyCurrency(btn.dataset.cur);
    });
    applyCurrency(currency);
    // курс приходить пізніше за першу відмальовку — тоді перемальовуємо
    loadRate().then(() => { applyCurrency(currency); });
  }

  function renderServices() {
    const list = $('#priceList');
    if (!list) return;
    list.textContent = '';
    let isFirstExample = true;

    SERVICES.forEach((service, i) => {
      const copy = service[lang] || service.uk;
      const name = el('h3', { class: 'price-name' }, copy.name);
      if (service.featured) {
        name.append(el('span', { class: 'price-featured', text: t('services.featured') }));
      }

      // Попереду обрана валюта, другим рядком — та сама сума в іншій.
      const box = el('div', { class: 'price-money' });
      if (service.price) {
        const other = currency === 'uah' ? 'usd' : 'uah';
        box.append(
          el('span', { class: 'price-value', text: `${t('services.from')} ${money(service.price, currency)}` }),
          el('span', { class: 'price-alt', text: `≈ ${money(service.price, other)}` })
        );
      } else {
        box.append(el('span', { class: 'price-value is-quote', text: t('services.custom') }));
      }

      const inner = el('div', { class: 'price-inner' },
        name,
        el('p', { class: 'price-desc', text: copy.desc }),
        el('div', { class: 'price-right' },
          box,
          el('a', {
            class: 'price-cta',
            href: tgLink(t('services.orderText').replace('{name}', copy.name)),
            target: '_blank',
            rel: 'noopener noreferrer'
          }, `${t('services.order')} →`)
        )
      );

      const bullets = el('ul', { class: 'price-bullets' });
      copy.bullets.forEach(b => bullets.append(el('li', { text: b })));

      const head = el('div', { class: 'price-head' }, inner, bullets);
      const row = el('li', { class: revealCls('price-row') }, head);
      // строки услуг перерисовываются уже показанными (при смене
      // языка и валюты), и общий обход их не застаёт — нумеруем сразу
      row.dataset.i = String(Math.min(i, 6));
      row.style.setProperty('--i', row.dataset.i);

      // пример того, что получится: макет плюс короткое описание
      const example = service.example && (service.example[lang] || service.example.uk);
      const mock = document.getElementById(`mock-${service.id}`);

      if (example && mock) {
        const panelId = `example-${service.id}`;

        const toggle = el('button', {
          class: 'price-toggle',
          type: 'button',
          'aria-expanded': 'false',
          'aria-controls': panelId
        }, el('span', { text: t('services.example') }), el('span', { class: 'toggle-sign', 'aria-hidden': 'true' }));

        const figure = el('div', { class: 'ex-mock' });
        figure.append(mock.content.cloneNode(true));

        const exText = el('div', { class: 'ex-side' }, el('p', { class: 'ex-text', text: example }));

        // три послуги мають робоче демо — ведемо прямо туди
        if (service.caseLink) {
          exText.append(el('a', {
            class: 'link-arrow ex-case',
            href: service.caseLink,
            target: '_blank',
            rel: 'noopener noreferrer'
          }, t('services.case')));
        }

        const panel = el('div', { class: 'price-example', id: panelId },
          el('div', {}, el('div', { class: 'ex-body' }, figure, exText))
        );

        toggle.addEventListener('click', () => {
          const open = row.classList.toggle('open');
          toggle.setAttribute('aria-expanded', String(open));
        });

        inner.querySelector('.price-right').prepend(toggle);
        row.append(panel);

        // первый пример открыт сразу — чтобы было видно, что это вообще есть
        if (isFirstExample) {
          row.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
          isFirstExample = false;
        }
      }

      list.append(row);
    });
  }

  function renderSteps() {
    const wrap = $('#steps');
    if (!wrap) return;
    if (usePrerendered(wrap)) return;
    wrap.textContent = '';

    PROCESS.forEach((step, i) => {
      const copy = step[lang] || step.uk;
      wrap.append(el('li', { class: revealCls('step') },
        el('span', { class: 'step-num', text: String(i + 1).padStart(2, '0') }),
        el('div', {},
          el('h3', { class: 'step-title', text: copy.title }),
          el('p', { class: 'step-desc', text: copy.desc })
        )
      ));
    });
  }

  function renderFaq() {
    const wrap = $('#faqList');
    if (!wrap) return;
    if (usePrerendered(wrap)) return;
    wrap.textContent = '';

    FAQ.forEach((item, i) => {
      const copy = item[lang] || item.uk;
      const answerId = `faq-a-${i}`;

      const btn = el('button', {
        class: 'faq-q',
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': answerId
      }, el('span', { text: copy.q }), el('span', { class: 'faq-sign', 'aria-hidden': 'true' }));

      const answer = el('div', { class: 'faq-a', id: answerId },
        el('div', {}, el('p', { text: copy.a }))
      );

      wrap.append(el('div', { class: revealCls('faq-item') }, btn, answer));
    });
  }

  /**
   * Раскрытие вопросов — одним обработчиком на весь список.
   * Раньше слушатель вешался на каждую кнопку при отрисовке, и
   * готовая разметка от сборки оставалась мёртвой: кнопки есть,
   * нажимать нечего. Делегирование работает и там, и там.
   */
  function initFaqToggles() {
    const wrap = $('#faqList');
    if (!wrap) return;
    wrap.addEventListener('click', e => {
      const btn = e.target.closest('.faq-q');
      if (!btn || !wrap.contains(btn)) return;
      const item = btn.closest('.faq-item');
      if (!item) return;
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  /**
   * Форма заявки.
   *
   * Отправляем на свою же ручку /api/lead — её держит worker/index.js
   * и пересылает заявку в Telegram. Страницы «спасибо» нет: ответ
   * появляется строкой под кнопкой, человек остаётся где был.
   *
   * Ручка может быть недоступна — на локальной статике её нет вовсе,
   * а на сервере может не хватать токена бота. Тогда честно говорим
   * об этом и показываем запасной путь: кнопки в Telegram и на почту
   * никуда не делись, они прямо под формой.
   */
  function initLeadForm() {
    const form = $('#leadForm');
    if (!form) return;

    const status = $('#leadStatus');
    const fields = ['leadName', 'leadContact', 'leadTask'].map(id => $('#' + id));

    function say(key, kind) {
      if (!status) return;
      status.textContent = t(key);
      status.classList.toggle('is-ok', kind === 'ok');
      status.classList.toggle('is-bad', kind === 'bad');
    }

    // подсветку ошибки снимаем, как только человек начал править
    fields.forEach(node => {
      if (node) node.addEventListener('input', () => node.classList.remove('is-bad'));
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (form.classList.contains('is-sending')) return;

      const data = {
        name: $('#leadName').value.trim(),
        contact: $('#leadContact').value.trim(),
        task: $('#leadTask').value.trim(),
        site: form.elements.site ? form.elements.site.value : ''
      };

      // Проверяем то же, что и сервер: короткая задача — это не
      // задача, а «зробіть красиво».
      const bad = [];
      if (!data.name) bad.push($('#leadName'));
      if (!data.contact) bad.push($('#leadContact'));
      if (data.task.length < 10) bad.push($('#leadTask'));
      if (bad.length) {
        bad.forEach(node => node.classList.add('is-bad'));
        bad[0].focus();
        say('lead.required', 'bad');
        return;
      }

      form.classList.add('is-sending');
      say('lead.sending');

      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        const answer = await res.json().catch(() => ({}));

        if (res.ok && answer.ok) {
          form.reset();
          say('lead.ok', 'ok');
        } else if (res.status === 422) {
          say('lead.required', 'bad');
        } else {
          say('lead.offline', 'bad');
        }
      } catch (err) {
        // сети нет или ручку не подняли — оба случая для человека
        // выглядят одинаково: пишите напрямую
        say('lead.offline', 'bad');
      } finally {
        form.classList.remove('is-sending');
      }
    });
  }

  function renderChips(langNames = []) {
    const wrap = $('#chips');
    if (!wrap) return;
    wrap.textContent = '';
    const seen = new Set();
    [...langNames, ...EXTRA_STACK].forEach(name => {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      wrap.append(el('li', { text: name }));
    });
  }

  /* =======================================================
     GitHub: живые данные + кэш, чтобы не упираться в лимит 60/час
     ======================================================= */
  const state = { repos: null, stats: {} };

  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', HTML: '#e34c26',
    CSS: '#563d7c', Java: '#b07219', 'C++': '#f34b7d', C: '#8c8c8c', 'C#': '#178600',
    PHP: '#4F5D95', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', Swift: '#F05138',
    Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051', Vue: '#41b883', Lua: '#7b68ee',
    Dockerfile: '#6ea5c9', SCSS: '#c6538c', Jupyter: '#DA5B0B'
  };
  const FALLBACK = ['#d8ff3e', '#7fd1ff', '#ff8f5e', '#b9a5ff', '#6ee7a8', '#ffd166'];
  const colorFor = (name, i) => LANG_COLORS[name] || FALLBACK[i % FALLBACK.length];

  const CACHE_TTL = 30 * 60 * 1000; // полчаса

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.ts > CACHE_TTL) return null;
      return parsed.data;
    } catch (e) { return null; }
  }

  function cacheSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (e) { /* noop */ }
  }

  async function api(path, cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`https://api.github.com${path}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();
      cacheSet(cacheKey, data);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function countUp(node, target) {
    if (reduceMotion) { node.textContent = String(target); return; }
    const start = performance.now();
    const dur = 900;
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      node.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Формы числа берём у Intl: 1 репозиторій / 2 репозиторії / 5 репозиторіїв, 1 star / 2 stars */
  function plural(n, forms) {
    let category = 'other';
    try {
      category = new Intl.PluralRules(LOCALES[lang] || 'uk-UA').select(n);
    } catch (e) { /* очень старый браузер — останется other */ }
    return forms[category] || forms.other || forms.many || forms.one;
  }

  /** Ноль в счётчике выглядит хуже, чем его отсутствие — такую плитку прячем */
  function setStat(name, value, hideIfZero = false) {
    const node = $(`[data-stat="${name}"]`);
    if (!node) return;

    state.stats[name] = { value, hideIfZero };

    const tile = node.closest('.stat');
    if (!value && hideIfZero) {
      if (tile) tile.hidden = true;
      return;
    }
    if (tile) tile.hidden = false;

    const label = $(`[data-stat-label="${name}"]`);
    const forms = (PLURALS[lang] || PLURALS.uk)[name];
    if (label && forms) label.textContent = plural(value, forms);

    countUp(node, value);
  }

  /** После смены языка подписи пересчитываем заново */
  function refreshStats() {
    Object.entries(state.stats).forEach(([name, { value, hideIfZero }]) => setStat(name, value, hideIfZero));
  }

  /** Работы, которых нет в открытом доступе — из конфига */
  function renderProjects(wrap) {
    (PROJECTS || []).forEach(project => {
      const copy = project[lang] || project.uk;
      if (!copy) return;

      const meta = el('div', { class: 'repo-meta' });
      (copy.tags || []).slice(0, 3).forEach(tag => meta.append(el('span', { text: tag })));
      if (project.year) meta.append(el('span', { text: project.year }));

      const body = el('div', {},
        el('h3', { class: 'repo-name', text: copy.name }),
        copy.desc ? el('p', { class: 'repo-desc', text: copy.desc }) : null
      );

      const attrs = { class: revealCls('repo') };
      if (project.link) {
        Object.assign(attrs, { href: project.link, target: '_blank', rel: 'noopener noreferrer' });
        wrap.append(el('a', attrs, body, meta));
      } else {
        wrap.append(el('div', attrs, body, meta));
      }
    });
  }

  function renderRepos(repos) {
    const wrap = $('#repos');
    if (!wrap) return;
    wrap.textContent = '';

    renderProjects(wrap);

    if (!repos.length) {
      // если своих проектов нет и репозиториев тоже — честно говорим об этом
      if (!(PROJECTS || []).length) {
        wrap.append(el('p', { class: 'state-msg', text: t('work.empty') }));
      }
      refreshAnimations();
      return;
    }

    repos.forEach(repo => {
      const meta = el('div', { class: 'repo-meta' });
      if (repo.language) {
        const dot = el('span', { class: 'lang-dot' });
        dot.style.setProperty('background', colorFor(repo.language, 0));
        meta.append(el('span', { class: 'repo-lang' }, dot, repo.language));
      }
      meta.append(el('span', { text: `★ ${repo.stargazers_count}` }));
      meta.append(el('span', {
        text: `${t('work.updated')} ${new Date(repo.pushed_at).toLocaleDateString(LOCALES[lang] || 'uk-UA')}`
      }));

      wrap.append(el('a', {
        class: revealCls('repo'),
        href: repo.html_url,
        target: '_blank',
        rel: 'noopener noreferrer'
      },
        el('div', {},
          el('h3', { class: 'repo-name', text: repo.name }),
          repo.description ? el('p', { class: 'repo-desc', text: repo.description }) : null
        ),
        meta
      ));
    });

    refreshAnimations();
  }

  function renderLangs(entries, total) {
    const wrap = $('#langs');
    if (!wrap) return;
    wrap.textContent = '';

    const note = $('#langsNote');
    if (!entries.length) { if (note) note.hidden = true; return; }
    if (note) note.hidden = false;

    const bar = el('div', { class: 'lang-bar' });
    const legend = el('ul', { class: 'lang-legend' });

    entries.forEach(([name, count], i) => {
      const pct = Math.round((count / total) * 100);
      const seg = el('span');
      seg.style.setProperty('flex-grow', String(count));
      seg.style.setProperty('background', colorFor(name, i));
      seg.title = `${name} — ${pct}%`;
      bar.append(seg);

      const dot = el('span', { class: 'lang-dot' });
      dot.style.setProperty('background', colorFor(name, i));
      legend.append(el('li', {}, dot, el('span', { text: name }), el('span', { class: 'pct', text: `${pct}%` })));
    });

    wrap.append(bar, legend);
  }

  async function loadGithub() {
    const reposWrap = $('#repos');
    if (reposWrap) {
      reposWrap.append(el('div', { class: 'skeleton' }), el('div', { class: 'skeleton' }), el('div', { class: 'skeleton' }));
    }

    const [profile, repos] = await Promise.allSettled([
      api(`/users/${GITHUB_USER}`, 'gh:user'),
      api(`/users/${GITHUB_USER}/repos?per_page=100&sort=updated`, 'gh:repos')
    ]);

    if (profile.status === 'fulfilled') {
      const u = profile.value;
      const statsRow = $('#statsRow');
      if (statsRow) statsRow.hidden = false;
      setStat('repos', u.public_repos || 0);
      setStat('followers', u.followers || 0, true);
      const years = (Date.now() - new Date(u.created_at).getTime()) / (365.25 * 24 * 3600 * 1000);
      setStat('years', Math.max(1, Math.round(years)));
    }

    if (repos.status !== 'fulfilled') {
      // GitHub не ответил — свои проекты всё равно показываем
      if (reposWrap) {
        reposWrap.textContent = '';
        renderProjects(reposWrap);
        if (!(PROJECTS || []).length) {
          reposWrap.append(el('p', { class: 'state-msg', text: t('work.error') }));
        }
        refreshAnimations();
      }
      renderChips([]);
      return;
    }

    const hidden = new Set((HIDDEN_REPOS || []).map(n => n.toLowerCase()));
    const notFork = repos.value.filter(r => !r.fork);
    // HIDDEN_REPOS прячет репозиторий из карточек проектов — и только.
    // Код в нём такой же наш, поэтому в подсчёт языков он входит:
    // там лежит и сам сайт, и три сайта из кейсов.
    const own = notFork.filter(r => !hidden.has(r.name.toLowerCase()));
    setStat('stars', own.reduce((sum, r) => sum + r.stargazers_count, 0), true);
    renderLangs([], 1);                       // до ответа полосу не рисуем

    state.repos = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
    renderRepos(state.repos);
    await renderStack(notFork);
  }

  /**
   * Языки — по объёму кода, а не по числу репозиториев.
   *
   * Прошлый способ считал репозитории: один проект на Java давал
   * «Java 100%», хотя рядом лежат сайт студии и три сайта из
   * кейсов на js, css и html. GitHub отдаёт байты по языкам
   * отдельной ручкой на каждый репозиторий — берём её.
   *
   * Восемь штук, а не все: без токена GitHub даёт 60 запросов в
   * час на адрес, и незачем тратить их на давно заброшенное.
   * Ответы лежат в sessionStorage полчаса.
   */
  async function renderStack(repos) {
    // свой код знаем и без GitHub — его посчитала сборка
    const bytes = Object.assign({}, OWN_CODE);
    // ...поэтому этот же репозиторий через API уже не спрашиваем
    const counted = repos.filter(r => !(OWN_CODE && r.name === SELF_REPO)).slice(0, 8);
    const answers = await Promise.allSettled(counted.map(
      r => api(`/repos/${GITHUB_USER}/${r.name}/languages`, `gh:lang:${r.name}`)
    ));

    let measured = OWN_CODE ? 1 : 0;
    answers.forEach(res => {
      if (res.status !== 'fulfilled') return;
      measured++;
      Object.entries(res.value).forEach(([name, n]) => { bytes[name] = (bytes[name] || 0) + n; });
    });

    // ни один запрос не прошёл — откатываемся к грубому счёту по репозиториям
    if (!measured) counted.forEach(r => { if (r.language) bytes[r.language] = (bytes[r.language] || 0) + 1; });

    const all = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
    const total = all.reduce((s, [, n]) => s + n, 0) || 1;
    // меньше процента — это случайный Shell или Dockerfile на пару
    // килобайт: в легенде он всё равно нарисуется как «0%»
    const entries = all.filter(([, n]) => n / total >= 0.01);

    renderLangs(entries.slice(0, 6), total);
    renderChips(entries.map(([name]) => name));
  }

  /* =======================================================
     Фон: сетка точек, которая расступается перед курсором
     ======================================================= */
  function initGrid() {
    const canvas = $('#grid-canvas');
    if (!canvas || !heavyAnim) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    const GAP = 34;
    const RADIUS = 150;
    let w = 0, h = 0, dpr = 1, dots = [];
    let pointer = { x: -9999, y: -9999 };
    let rafId = null;

    /* Держим ровно один цикл отрисовки: браузер может придержать
       запланированный кадр на скрытой вкладке и отдать его уже после
       того, как мы запустили новый — так набегает второй цикл. */
    function start() {
      if (rafId === null) rafId = requestAnimationFrame(frame);
    }
    function stop() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(w / GAP) + 1;
      const rows = Math.ceil(h / GAP) + 1;
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          dots.push({ x: x * GAP, y: y * GAP, ox: x * GAP, oy: y * GAP });
        }
      }
    }

    /* Ударная волна от клика: расходится кольцом и толкает точки */
    const WAVE_SPEED = 620;   // пикселей в секунду
    const WAVE_LIFE = 1.7;    // секунд до затухания
    const WAVE_BAND = 70;     // толщина фронта
    const waves = [];

    /* След из символов кода за курсором */
    const SPARK_CHARS = ['0', '1', '{', '}', '<', '>', '/', ';', '=', '$', '[', ']'];
    const sparks = [];
    let lastSpark = 0;
    let lastSparkPos = { x: 0, y: 0 };

    function frame(now) {
      rafId = null;
      ctx.clearRect(0, 0, w, h);

      const seconds = now / 1000;
      const light = root.dataset.theme === 'light';
      const dot = light ? '20, 20, 15' : '242, 239, 232';

      // старые волны выбрасываем, чтобы массив не рос
      for (let i = waves.length - 1; i >= 0; i--) {
        if (seconds - waves[i].t > WAVE_LIFE) waves.splice(i, 1);
      }

      for (const d of dots) {
        const dx = d.ox - pointer.x;
        const dy = d.oy - pointer.y;
        const dist = Math.hypot(dx, dy);

        let push = 0;
        if (dist < RADIUS) push = (1 - dist / RADIUS);

        let tx = d.ox + (dx / (dist || 1)) * push * 16;
        let ty = d.oy + (dy / (dist || 1)) * push * 16;

        // вклад ударных волн
        let wave = 0;
        for (const wv of waves) {
          const age = seconds - wv.t;
          const radius = age * WAVE_SPEED;
          const wdx = d.ox - wv.x;
          const wdy = d.oy - wv.y;
          const wdist = Math.hypot(wdx, wdy);
          const delta = Math.abs(wdist - radius);
          if (delta > WAVE_BAND) continue;

          const front = 1 - delta / WAVE_BAND;      // насколько точка близко к фронту
          const fade = 1 - age / WAVE_LIFE;          // затухание со временем
          const strength = front * fade * fade;
          wave += strength;
          tx += (wdx / (wdist || 1)) * strength * 22;
          ty += (wdy / (wdist || 1)) * strength * 22;
        }

        d.x += (tx - d.x) * 0.14;
        d.y += (ty - d.y) * 0.14;

        const energy = Math.min(1, push + wave);
        const size = 1 + energy * 2.4;
        const alpha = 0.13 + energy * 0.72;

        if (energy > 0.4) {
          ctx.fillStyle = light
            ? `rgba(79, 107, 0, ${alpha})`
            : `rgba(216, 255, 62, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(${dot}, ${alpha})`;
        }
        ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
      }

      // символы всплывают и гаснут
      ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        const age = seconds - s.t;
        if (age > 1.1) { sparks.splice(i, 1); continue; }
        s.x += s.vx;
        s.y += s.vy;
        s.vy -= 0.03;                      // подъём с ускорением
        ctx.fillStyle = light
          ? `rgba(79, 107, 0, ${(1 - age / 1.1) * 0.7})`
          : `rgba(216, 255, 62, ${(1 - age / 1.1) * 0.75})`;
        ctx.fillText(s.char, s.x, s.y);
      }

      start();
    }

    window.addEventListener('pointermove', e => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;

      // символ роняем не чаще раза в 45 мс и только если курсор реально двигался
      const now = performance.now();
      const moved = Math.hypot(e.clientX - lastSparkPos.x, e.clientY - lastSparkPos.y);
      if (now - lastSpark > 45 && moved > 16 && sparks.length < 26) {
        lastSpark = now;
        lastSparkPos = { x: e.clientX, y: e.clientY };
        sparks.push({
          x: e.clientX + (Math.random() - 0.5) * 14,
          y: e.clientY + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -0.4 - Math.random() * 0.5,
          char: SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)],
          t: now / 1000
        });
      }
    }, { passive: true });

    // клик рождает волну по всей сетке
    window.addEventListener('pointerdown', e => {
      waves.push({ x: e.clientX, y: e.clientY, t: performance.now() / 1000 });
      if (waves.length > 4) waves.shift();
    }, { passive: true });

    window.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });

    // не жжём батарею на фоновой вкладке
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });

    build();
    start();
  }

  /* =======================================================
     Заголовки «расшифровываются» из символов кода
     ======================================================= */
  const SCRAMBLE_CHARS = '01{}[]<>/\\|=+*#$%&~^';

  function scramble(node) {
    if (reduceMotion || node.dataset.scrambled) return;
    node.dataset.scrambled = '1';

    const final = [...node.textContent];
    const start = performance.now();
    const dur = 90 * Math.min(final.length, 9) + 260;

    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 2);
      const revealed = Math.floor(eased * final.length);

      node.textContent = final
        .map((ch, i) => {
          if (i < revealed || ch === ' ' || ch === ' ') return ch;
          return SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        })
        .join('');

      if (p < 1) requestAnimationFrame(step);
      else node.textContent = final.join('');
    }
    requestAnimationFrame(step);
  }

  function initScramble() {
    if (!heavyAnim) return;
    const targets = $$('.section-title, .contact-title');
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        scramble(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    targets.forEach(node => io.observe(node));
  }

  /* =======================================================
     Магнитные кнопки
     ======================================================= */
  function initMagnetic() {
    if (!heavyAnim) return;

    $$('.magnetic').forEach(node => {
      let raf = null;
      node.addEventListener('pointermove', e => {
        const r = node.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          node.style.setProperty('transform', `translate(${mx * 0.22}px, ${my * 0.3}px)`);
        });
      });
      node.addEventListener('pointerleave', () => {
        node.style.setProperty('transform', 'translate(0, 0)');
      });
    });
  }

  /* =======================================================
     Внешние библиотеки анимации.

     Раньше три тега <script> висели в разметке и грузились у всех.
     Но heavyAnim выключает анимации на телефонах и при
     prefers-reduced-motion — там эти 150 КБ скачивались, парсились
     и не делали ничего. Теперь их тянет сам скрипт и только когда
     они нужны.

     Сборка (scripts/build.js) подменяет эти адреса на локальные
     vendor/, если папка есть, — тогда со стороннего домена на
     странице не исполняется вообще ничего.
     ======================================================= */
  const VENDOR = {
    gsap: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js',
    scrollTrigger: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js',
    lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js'
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const node = document.createElement('script');
      node.src = src;
      node.onload = resolve;
      node.onerror = () => reject(new Error(src));
      document.head.append(node);
    });
  }

  /** Никогда не отклоняется: не доехало — сайт живёт на фоллбэке. */
  function loadVendor() {
    if (!heavyAnim) return Promise.resolve();
    // ScrollTrigger — плагин к gsap, поэтому строго после него
    return loadScript(VENDOR.gsap)
      .then(() => Promise.all([loadScript(VENDOR.scrollTrigger), loadScript(VENDOR.lenis)]))
      .catch(err => { console.warn('Анимации:', err.message); });
  }

  /* =======================================================
     Анимации: GSAP + ScrollTrigger, иначе — IntersectionObserver
     ======================================================= */
  let observer = null;

  function fallbackReveals() {
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    // индекс проставляем всем: строки услуг перерисовываются уже
    // показанными, и без этого лесенка их обходила стороной
    $$('.reveal').forEach(stagger);
    $$('.reveal:not(.in)').forEach(node => observer.observe(node));
  }

  /**
   * Порядковый номер внутри своего списка — по нему css отмеряет
   * задержку. Дальше шестого не считаем: иначе низ длинного списка
   * ждёт своей очереди уже заметно долго.
   */
  function stagger(node) {
    if (node.dataset.i) return;
    const i = Math.min([...node.parentNode.children].indexOf(node), 6);
    node.dataset.i = String(i);
    node.style.setProperty('--i', String(i));
  }

  function gsapReveals() {
    const { gsap } = window;
    $$('.reveal').forEach(node => {
      if (node.dataset.animated || node.classList.contains('in')) return;
      node.dataset.animated = '1';
      stagger(node);
      gsap.fromTo(node,
        { opacity: 0, y: 26 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          delay: Number(node.dataset.i || 0) * 0.07,
          scrollTrigger: { trigger: node, start: 'top 88%', once: true },
          // вытирание снимка кейса живёт в css и ждёт класс .in
          onStart: () => node.classList.add('in')
        }
      );
    });
  }

  function refreshAnimations() {
    if (heavyAnim && window.gsap && window.ScrollTrigger) {
      gsapReveals();
      window.ScrollTrigger.refresh();
    } else {
      fallbackReveals();
    }
  }

  function initAnimations() {
    if (reduceMotion) {
      $$('.reveal').forEach(n => n.classList.add('in'));
      return;
    }

    if (heavyAnim && window.gsap && window.ScrollTrigger) {
      const { gsap, ScrollTrigger } = window;
      gsap.registerPlugin(ScrollTrigger);

      // строки заголовка выезжают из-под маски
      gsap.from('.hero-title .line-in', {
        yPercent: 115,
        duration: 1.05,
        ease: 'power4.out',
        stagger: 0.09
      });

      gsap.from(['.status', '.hero-bottom'], {
        opacity: 0,
        y: 22,
        duration: 0.9,
        delay: 0.35,
        ease: 'power3.out',
        stagger: 0.12
      });

      gsapReveals();
    } else {
      // CDN не ответил — включаем лёгкий фоллбэк, сайт остаётся живым
      $$('.hero-title .line-in, .status, .hero-bottom').forEach(n => n.classList.add('in'));
      fallbackReveals();
    }
  }

  let smoothScroll = null;

  function initSmoothScroll() {
    if (!heavyAnim || !window.Lenis) return;
    const lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
    smoothScroll = lenis;
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);

    if (window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
    }

    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70 });
        closeMenu();
      });
    });
  }

  /* =======================================================
     Мелочи интерфейса
     ======================================================= */
  const burger = $('#burger');
  const mobileMenu = $('#mobileMenu');

  function closeMenu() {
    if (!burger || !mobileMenu) return;
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
  }

  function initChrome() {
    const topbar = $('.topbar');
    const onScroll = () => {
      if (topbar) topbar.classList.toggle('is-stuck', window.scrollY > 20);
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (burger && mobileMenu) {
      burger.addEventListener('click', () => {
        const open = burger.getAttribute('aria-expanded') === 'true';
        burger.setAttribute('aria-expanded', String(!open));
        mobileMenu.hidden = open;
        // открыли — уводим фокус внутрь, чтобы с клавиатуры сразу
        // попадать в пункты, а не проходить мимо меню
        if (!open) { const first = $('a', mobileMenu); if (first) first.focus(); }
      });
      $$('a', mobileMenu).forEach(a => a.addEventListener('click', closeMenu));

      /* Открытое меню должно вести себя как открытое меню: Escape
         закрывает, Tab не уходит за его пределы, а фокус после
         закрытия возвращается на кнопку — иначе он остаётся на
         невидимом элементе и следующий Tab уводит в никуда. */
      document.addEventListener('keydown', e => {
        if (mobileMenu.hidden) return;

        if (e.key === 'Escape') { closeMenu(); burger.focus(); return; }
        if (e.key !== 'Tab') return;

        const items = [burger, ...$$('a', mobileMenu)];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });

      // щелчок мимо меню тоже закрывает: так ведут себя все меню
      document.addEventListener('pointerdown', e => {
        if (mobileMenu.hidden) return;
        if (mobileMenu.contains(e.target) || burger.contains(e.target)) return;
        closeMenu();
      });
    }

    $$('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => applyLang(btn.dataset.lang));
    });

    const themeBtn = $('#themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
      });
    }

    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    // подставляем контакты из конфига, чтобы правились в одном месте
    const tg = $('#tgLink');
    if (tg) tg.href = tgLink(t('contact.tgText'));
    const mail = $('#mailLink');
    if (mail) mail.href = `mailto:${LINKS.email}`;

    // В подвале — домен студии. Ссылка относительная и ведёт на сам
    // сайт: домен уже привязан, но относительный адрес работает и на
    // черновой копии по другому адресу.
    const footSite = $('#footSite');
    if (footSite) footSite.textContent = LINKS.domain;
    const gh = $('#heroGithub');
    if (gh) gh.href = LINKS.github;
    const all = $('#allRepos');
    if (all) all.href = `${LINKS.github}?tab=repositories`;
  }

  /* =======================================================
     Ускорение

     Три приёма, ни один из которых не виден глазами: сайт просто
     открывается быстрее и работает без сети.
     ======================================================= */

  /**
   * Отложить работу до тех пор, пока блок не окажется близко к экрану.
   *
   * Таймера-страховки тут намеренно нет: если человек не долистал до
   * блока, значит, эти данные ему и не понадобились. Запас в 800px
   * даёт браузеру время сходить за ними заранее — к моменту, когда
   * блок реально появится, всё уже на месте.
   */
  function whenNear(selector, fn) {
    const node = $(selector);
    if (!node || !('IntersectionObserver' in window)) { fn(); return; }

    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { rootMargin: '800px 0px' });
    io.observe(node);
  }

  /**
   * Подтягивать страницу кейса, когда на ссылку навели курсор.
   *
   * Между наведением и щелчком проходит две-три десятых секунды —
   * этого хватает, чтобы страница успела приехать и открылась
   * мгновенно. Ошибку глушим молча: не вышло — просто откроется как
   * обычно.
   */
  function initPrefetch() {
    if (coarsePointer) return;            // на телефоне наведения нет
    const asked = new Set();

    document.addEventListener('pointerenter', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;

      let url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || asked.has(url.href)) return;
      if (url.pathname === location.pathname) return;   // якорь на этой же странице

      asked.add(url.href);
      const link = el('link', { rel: 'prefetch', href: url.href, as: 'document' });
      document.head.append(link);
    }, { capture: true, passive: true });
  }

  /**
   * Служебный воркер: повторный визит открывается из кеша, а без
   * сети сайт всё равно показывает последнюю версию.
   *
   * Регистрируем после загрузки, чтобы не отнимать канал у первого
   * экрана. По file:// воркеры запрещены — там молча пропускаем.
   */
  /**
   * Подсветка раздела, в котором человек сейчас находится.
   *
   * Тем же способом, что и наведение: другой отметки в оформлении
   * нет, а заводить новую ради этого незачем. Наблюдатель смотрит на
   * верхнюю треть экрана — раздел считается текущим, когда его
   * заголовок доехал туда, а не когда он едва показался снизу.
   */
  function initScrollSpy() {
    const links = $$('.nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const byId = new Map();
    links.forEach(a => {
      const node = document.getElementById(a.getAttribute('href').slice(1));
      if (node) byId.set(node, a);
    });
    if (!byId.size) return;

    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target));

      // видно может быть несколько сразу — берём самый верхний
      const top = [...seen].sort((a, b) =>
        a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];

      links.forEach(a => a.removeAttribute('aria-current'));
      if (top && byId.has(top)) byId.get(top).setAttribute('aria-current', 'true');
    }, { rootMargin: '-12% 0px -62% 0px' });

    byId.forEach((_, node) => io.observe(node));
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker:', err.message);
      });
    }, { once: true });
  }

  /* =======================================================
     Старт
     ======================================================= */
  function boot() {
    applyTheme(detectTheme());
    applyLang(lang);
    initFaqToggles();
    initLeadForm();
    setupCurrency();
    initChrome();
    initGrid();
    initMagnetic();
    initScramble();
    initPrefetch();
    initScrollSpy();
    initServiceWorker();

    // Свои работы показываем сразу, а за GitHub идём только когда
    // человек подобрался к разделу: два запроса и разбор ответа не
    // нужны тому, кто до портфолио не долистал.
    renderRepos([]);
    whenNear('#work', () => {
      loadGithub().catch(err => console.warn('GitHub:', err.message));
    });

    // разметка уже на месте; анимации включаются, как только (и если)
    // доедут библиотеки — либо сразу по фоллбэку, когда их не ждём
    loadVendor().then(() => {
      initAnimations();
      initSmoothScroll();
      booted = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
