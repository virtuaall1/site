/**
 * Крутилка оформления.
 *
 * Панель не переключает готовые «варианты дизайна» — она двигает
 * отдельные величины: фон, акцент, плотность, скругление, шрифт,
 * вид карточек. Из них и складывается оформление.
 *
 * Цвет текста, приглушённого текста и линий не выбирается: он
 * считается от яркости фона. Иначе первым же движением можно
 * получить белое по белому.
 *
 * Выбранное живёт в адресе страницы (после #) — значит, ссылку
 * можно просто прислать, и настройки откроются те же.
 */
(() => {
  'use strict';

  /* ── что можно крутить ─────────────────────────────────────── */
  const BG = [
    { v: '#FFFFFF', n: 'білий' },
    { v: '#F7F5F1', n: 'папір' },
    { v: '#EFEEEA', n: 'сірий світлий' },
    { v: '#0A0A0B', n: 'чорний' },
    { v: '#0E0709', n: 'винний' },
    { v: '#0B0D10', n: 'сталевий' },
    { v: '#0D1117', n: 'синьо-чорний' },
    { v: '#12100C', n: 'теплий чорний' },
    { v: '#16151A', n: 'графіт' },
    { v: '#101C18', n: 'темно-зелений' }
  ];

  const AC = [
    { v: '#007AFF', n: 'синій' },
    { v: '#D62839', n: 'червоний' },
    { v: '#FF7A45', n: 'помаранчевий' },
    { v: '#F5A524', n: 'бурштин' },
    { v: '#35E0A1', n: 'мʼятний' },
    { v: '#22C55E', n: 'зелений' },
    { v: '#D8FF3E', n: 'кислотний' },
    { v: '#7C5CFF', n: 'фіолетовий' },
    { v: '#FF2D9B', n: 'рожевий' },
    { v: '#E9E4DA', n: 'без кольору' }
  ];

  const SETS = {
    density: { label: 'щільність', opts: [
      { id: 'air', n: 'просторо', sp: 1.3 },
      { id: 'mid', n: 'середньо', sp: 1 },
      { id: 'tight', n: 'щільно', sp: 0.74 }
    ]},
    radius: { label: 'скруглення', opts: [
      { id: 'sharp', n: 'без', r: 0 },
      { id: 'soft', n: 'ледь', r: 8 },
      { id: 'round', n: 'помітно', r: 16 },
      { id: 'pill', n: 'дуже', r: 28 }
    ]},
    font: { label: 'шрифт', opts: [
      { id: 'system', n: 'системний',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", h: null, tr: '-0.03em' },
      { id: 'wide', n: 'широкий',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", h: null, tr: '0.01em' },
      { id: 'serif', n: 'із засічками',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        h: "Georgia, 'Iowan Old Style', 'Times New Roman', serif", tr: '-0.015em' },
      { id: 'mono', n: 'моноширинний',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        h: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace", tr: '-0.02em' }
    ]},
    card: { label: 'картки', opts: [
      { id: 'flat', n: 'плоскі' },
      { id: 'outline', n: 'обводка' },
      { id: 'fill', n: 'заливка' },
      { id: 'glass', n: 'скло' },
      { id: 'shadow', n: 'тінь' }
    ]},
    title: { label: 'заголовок', opts: [
      { id: 'calm', n: 'спокійний', px: 38 },
      { id: 'big', n: 'великий', px: 52 },
      { id: 'huge', n: 'величезний', px: 74 }
    ]},
    shots: { label: 'картинки', opts: [
      { id: 'on', n: 'зі знімками' },
      { id: 'off', n: 'без знімків' }
    ]}
  };

  const DEFAULT = {
    bg: '#0E0709', ac: '#FF7A45',
    density: 'mid', radius: 'round', font: 'system',
    card: 'fill', title: 'big', shots: 'on'
  };

  /* ── цвет ──────────────────────────────────────────────────── */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

  /** Воспринимаемая яркость: по ней решаем, светлый фон или тёмный. */
  function lum(h) {
    const [r, g, b] = hex(h);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

  /** Контраст по WCAG — нужен, чтобы выбрать надпись на кнопке. */
  function contrast(h1, h2) {
    const ch = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = h => { const [r, g, b] = hex(h); return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b); };
    const a = L(h1), b = L(h2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  /* ── применение ────────────────────────────────────────────── */
  const root = document.documentElement;
  const demo = document.getElementById('demo');

  function apply(s) {
    const light = lum(s.bg) > 0.5;
    const ink = light ? '#14120F' : '#F6F4F2';

    root.style.setProperty('--bg', s.bg);
    root.style.setProperty('--text', ink);
    root.style.setProperty('--muted', rgba(ink, 0.62));
    root.style.setProperty('--faint', rgba(ink, 0.34));
    root.style.setProperty('--line', rgba(ink, light ? 0.16 : 0.13));
    root.style.setProperty('--sunken', rgba(ink, light ? 0.045 : 0.03));
    root.style.setProperty('--accent', s.ac);

    // Надпись на кнопке — та, что читается: белая или чёрная
    root.style.setProperty('--on-accent',
      contrast(s.ac, '#FFFFFF') >= contrast(s.ac, '#111111') ? '#FFFFFF' : '#111111');

    const d = SETS.density.opts.find(o => o.id === s.density);
    root.style.setProperty('--sp', String(d.sp));

    const r = SETS.radius.opts.find(o => o.id === s.radius);
    root.style.setProperty('--r', r.r + 'px');

    const f = SETS.font.opts.find(o => o.id === s.font);
    root.style.setProperty('--font', f.f);
    root.style.setProperty('--font-h', f.h || f.f);
    root.style.setProperty('--track-h', f.tr);

    const t = SETS.title.opts.find(o => o.id === s.title);
    root.style.setProperty('--h1', `clamp(30px, 6vw, ${t.px}px)`);

    const surf = rgba(ink, light ? 0.04 : 0.055);
    const styles = {
      flat:    { bg: 'transparent', line: '0 solid transparent', sh: 'none', blur: 'none' },
      outline: { bg: 'transparent', line: '1px solid var(--line)', sh: 'none', blur: 'none' },
      fill:    { bg: light ? '#FFFFFF' : surf, line: '1px solid var(--line)', sh: 'none', blur: 'none' },
      glass:   { bg: rgba(ink, light ? 0.05 : 0.06), line: '1px solid ' + rgba(ink, light ? 0.14 : 0.16),
                 sh: 'none', blur: 'blur(22px) saturate(150%)' },
      shadow:  { bg: light ? '#FFFFFF' : surf, line: '0 solid transparent',
                 sh: light ? '0 1px 3px rgba(0,0,0,.07), 0 10px 30px rgba(0,0,0,.08)'
                           : '0 2px 8px rgba(0,0,0,.5), 0 18px 44px rgba(0,0,0,.4)',
                 blur: 'none' }
    }[s.card];
    root.style.setProperty('--card-bg', styles.bg);
    root.style.setProperty('--card-line', styles.line);
    root.style.setProperty('--card-shadow', styles.sh);
    root.style.setProperty('--card-blur', styles.blur);

    demo.classList.toggle('no-shots', s.shots === 'off');

    writeOut(s);
    location.replace('#' + encode(s));
  }

  /* ── строка для отправки ───────────────────────────────────── */
  const nameOf = (arr, v) => (arr.find(x => x.v === v) || {}).n || v;
  const optOf = (key, id) => (SETS[key].opts.find(o => o.id === id) || {}).n || id;

  function writeOut(s) {
    const line =
      `фон ${s.bg} (${nameOf(BG, s.bg)}) · ` +
      `акцент ${s.ac} (${nameOf(AC, s.ac)}) · ` +
      `${optOf('density', s.density)} · ` +
      `скруглення ${optOf('radius', s.radius)} · ` +
      `шрифт ${optOf('font', s.font)} · ` +
      `картки ${optOf('card', s.card)} · ` +
      `заголовок ${optOf('title', s.title)} · ` +
      `${optOf('shots', s.shots)}`;
    document.getElementById('out').value = line + '\n' + location.href.split('#')[0] + '#' + encode(s);
  }

  const encode = s => new URLSearchParams(s).toString();

  function decode() {
    const q = new URLSearchParams(location.hash.slice(1));
    const s = { ...DEFAULT };
    for (const k of Object.keys(DEFAULT)) if (q.get(k)) s[k] = q.get(k);
    // мусор в адресе не должен ломать страницу
    if (!/^#[0-9A-Fa-f]{6}$/.test(s.bg)) s.bg = DEFAULT.bg;
    if (!/^#[0-9A-Fa-f]{6}$/.test(s.ac)) s.ac = DEFAULT.ac;
    for (const k of Object.keys(SETS)) {
      if (!SETS[k].opts.some(o => o.id === s[k])) s[k] = DEFAULT[k];
    }
    return s;
  }

  /* ── панель ────────────────────────────────────────────────── */
  let state = decode();

  function swatches(boxId, list, key) {
    const box = document.getElementById(boxId);
    box.textContent = '';
    list.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw';
      b.style.background = c.v;
      b.title = c.n;
      b.setAttribute('aria-label', c.n);
      b.setAttribute('aria-pressed', String(state[key] === c.v));
      b.addEventListener('click', () => {
        state[key] = c.v;
        [...box.children].forEach(n => n.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        apply(state);
      });
      box.append(b);
    });
  }

  function segs(key) {
    const box = document.getElementById(key);
    box.textContent = '';
    SETS[key].opts.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg';
      b.textContent = o.n;
      b.setAttribute('aria-pressed', String(state[key] === o.id));
      b.addEventListener('click', () => {
        state[key] = o.id;
        [...box.children].forEach(n => n.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        apply(state);
      });
      box.append(b);
    });
  }

  function build() {
    swatches('bgSet', BG, 'bg');
    swatches('acSet', AC, 'ac');
    Object.keys(SETS).forEach(segs);
    apply(state);
  }

  build();

  /* ── мелочи ────────────────────────────────────────────────── */
  const toggle = document.getElementById('panelToggle');
  const setOpen = on => {
    document.body.classList.toggle('open', on);
    toggle.setAttribute('aria-expanded', String(on));
    toggle.textContent = on ? 'Сховати' : 'Налаштування';
  };
  setOpen(true);
  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('open')));

  document.getElementById('copy').addEventListener('click', async () => {
    const out = document.getElementById('out');
    out.select();
    const btn = document.getElementById('copy');
    try {
      await navigator.clipboard.writeText(out.value);
      btn.textContent = 'Скопійовано';
    } catch (e) {
      // в некоторых браузерах буфер закрыт — текст уже выделен, хватит Ctrl+C
      btn.textContent = 'Виділено — Ctrl+C';
    }
    setTimeout(() => { btn.textContent = 'Скопіювати'; }, 1800);
  });

  document.getElementById('reset').addEventListener('click', () => {
    state = { ...DEFAULT };
    build();
  });
})();
