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
    // Дизайн-система читает тему классами на <html>: ds-auto идёт за
    // системой, ds-light и ds-dark её перебивают. Выбор у нас всегда
    // явный (detectTheme подставляет системный, если ничего не
    // сохранено), поэтому ds-auto снимаем.
    root.classList.remove('ds-auto', 'ds-light', 'ds-dark');
    root.classList.add(theme === 'light' ? 'ds-light' : 'ds-dark');
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

  function applyLang(next) {
    lang = SUPPORTED.includes(next) ? next : 'uk';
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
  /** Кейси, які можна відкрити: беремо ті проєкти, у яких є знімок */
  function renderCases() {
    const grid = $('#caseGrid');
    if (!grid) return;
    grid.textContent = '';

    const shown = (PROJECTS || []).filter(p => p.shot && p.link);
    if (!shown.length) { grid.hidden = true; return; }

    shown.forEach(project => {
      const copy = project[lang] || project.uk;
      if (!copy) return;

      const shot = el('img', {
        class: 'case-shot',
        src: project.shot,
        alt: copy.name,
        width: '960',
        height: '600',
        loading: 'lazy'
      });

      const tags = el('div', { class: 'case-tags' });
      (copy.tags || []).slice(0, 3).forEach(tag => tags.append(el('span', { text: tag })));

      grid.append(el('li', { class: revealCls('case') },
        el('a', { class: 'case-link', href: project.link, target: '_blank', rel: 'noopener noreferrer' },
          el('span', { class: 'case-frame' }, shot),
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

      const wrapper = el('div', { class: revealCls('faq-item') }, btn, answer);

      btn.addEventListener('click', () => {
        const open = wrapper.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });

      wrap.append(wrapper);
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
      });
      $$('a', mobileMenu).forEach(a => a.addEventListener('click', closeMenu));
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

    // В подвале — домен студии. Ссылка ведёт на сам сайт: так она
    // рабочая и сейчас, и после того как домен привяжут.
    const footSite = $('#footSite');
    if (footSite) footSite.textContent = LINKS.domain;
    const gh = $('#heroGithub');
    if (gh) gh.href = LINKS.github;
    const all = $('#allRepos');
    if (all) all.href = `${LINKS.github}?tab=repositories`;
  }

  /* =======================================================
     Старт
     ======================================================= */
  function boot() {
    applyTheme(detectTheme());
    applyLang(lang);
    setupCurrency();
    initChrome();
    loadGithub().catch(err => console.warn('GitHub:', err.message));

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
