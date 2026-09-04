/**
 * Поведение сайта.
 * Правило безопасности: данные из GitHub API попадают в DOM только
 * через textContent / createElement — никакого innerHTML со сторонним
 * содержимым, поэтому XSS через описание чужого репозитория невозможен.
 */
(() => {
  'use strict';

  const {
    LINKS, GITHUB_USER, HIDDEN_REPOS, PROJECTS, SERVICES,
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

  let lang = detectLang();
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

  function applyLang(next) {
    lang = SUPPORTED.includes(next) ? next : 'uk';
    skipReveal = booted;
    // перерисовка списков схлопывает высоту документа и сбрасывает скролл —
    // запоминаем позицию, чтобы человека не выкинуло в начало страницы
    const scrollBefore = window.scrollY;
    try { localStorage.setItem('lang', lang); } catch (e) { /* noop */ }

    document.documentElement.lang = lang;
    document.title = t('meta.title');
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.desc'));

    $$('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    $$('.lang-btn').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));

    renderCases();
    renderServices();
    renderSteps();
    renderFaq();
    renderFigures();
    refreshStats();

    // текст готового сообщения тоже зависит от языка
    const tgBtn = $('#tgLink');
    if (tgBtn) tgBtn.href = tgLink(t('contact.tgText'));
    if (state.repos) renderRepos(state.repos);

    if (booted) {
      refreshAnimations();
      // браузер сбрасывает позицию уже после пересчёта раскладки,
      // поэтому возвращаемся на место следующим кадром после него
      const restore = () => {
        if (smoothScroll) smoothScroll.scrollTo(scrollBefore, { immediate: true });
        else window.scrollTo(0, scrollBefore);
      };
      requestAnimationFrame(() => requestAnimationFrame(restore));
    }
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

  function renderServices() {
    const list = $('#priceList');
    if (!list) return;
    list.textContent = '';
    let isFirstExample = true;

    SERVICES.forEach(service => {
      const copy = service[lang] || service.uk;
      const isCustom = service.price === '?';

      const name = el('h3', { class: 'price-name' }, copy.name);
      if (service.featured) {
        name.append(el('span', { class: 'price-featured', text: t('services.featured') }));
      }

      const priceText = isCustom
        ? t('services.custom')
        : `${t('services.from')} ${service.price.replace('+', '')}`;

      const inner = el('div', { class: 'price-inner' },
        name,
        el('p', { class: 'price-desc', text: copy.desc }),
        el('div', { class: 'price-right' },
          el('span', { class: 'price-value', text: priceText }),
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
    const own = repos.value.filter(r => !r.fork && !hidden.has(r.name.toLowerCase()));
    setStat('stars', own.reduce((sum, r) => sum + r.stargazers_count, 0), true);

    const counts = {};
    own.forEach(r => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, c]) => s + c, 0);

    renderLangs(entries.slice(0, 6), total || 1);
    renderChips(entries.map(([name]) => name));

    state.repos = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
    renderRepos(state.repos);
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
    $$('.reveal:not(.in)').forEach(node => observer.observe(node));
  }

  function gsapReveals() {
    const { gsap } = window;
    $$('.reveal').forEach(node => {
      if (node.dataset.animated || node.classList.contains('in')) return;
      node.dataset.animated = '1';
      gsap.fromTo(node,
        { opacity: 0, y: 26 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: node, start: 'top 88%', once: true }
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

      // заголовки секций слегка «дышат» при скролле
      $$('.section-title').forEach(title => {
        gsap.from(title, {
          opacity: 0,
          y: 34,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: title, start: 'top 86%', once: true }
        });
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
    initChrome();
    initGrid();
    initMagnetic();
    initScramble();
    initAnimations();
    initSmoothScroll();
    booted = true;
    loadGithub().catch(err => console.warn('GitHub:', err.message));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
