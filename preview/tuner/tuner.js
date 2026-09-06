/**
 * Конструктор оформления.
 *
 * Панель не переключает готовые «варианты дизайна» — она двигает
 * отдельные величины: цвет, узор фона, плотность, ширину, шрифт,
 * заголовки, карточки, кнопки, сетку кейсов. Из них и складывается
 * оформление; сочетаний — миллионы, а не список из трёх штук.
 *
 * Две вещи считаются сами и вручную не выбираются:
 *   — цвет текста, приглушённого текста и линий — от яркости фона;
 *   — надпись на кнопке — по контрасту к акценту.
 * Иначе первым же движением получается белое по белому.
 *
 * Выбранное живёт в адресе после # — значит, достаточно прислать
 * ссылку, и настройки откроются те же.
 */
(() => {
  'use strict';

  /* ── палитры ───────────────────────────────────────────────── */
  const BG = [
    { v: '#FFFFFF', n: 'білий' },
    { v: '#F7F5F1', n: 'папір' },
    { v: '#EFEEEA', n: 'сірий світлий' },
    { v: '#F2EFE9', n: 'теплий світлий' },
    { v: '#0A0A0B', n: 'чорний' },
    { v: '#0E0709', n: 'винний' },
    { v: '#0B0D10', n: 'сталевий' },
    { v: '#0D1117', n: 'синьо-чорний' },
    { v: '#12100C', n: 'теплий чорний' },
    { v: '#16151A', n: 'графіт' },
    { v: '#101C18', n: 'темно-зелений' },
    { v: '#1A1220', n: 'темно-фіолетовий' }
  ];

  const AC = [
    { v: '#007AFF', n: 'синій' },
    { v: '#0EA5E9', n: 'блакитний' },
    { v: '#D62839', n: 'червоний' },
    { v: '#FF7A45', n: 'помаранчевий' },
    { v: '#F5A524', n: 'бурштин' },
    { v: '#35E0A1', n: 'мʼятний' },
    { v: '#22C55E', n: 'зелений' },
    { v: '#D8FF3E', n: 'кислотний' },
    { v: '#7C5CFF', n: 'фіолетовий' },
    { v: '#FF2D9B', n: 'рожевий' },
    { v: '#E9E4DA', n: 'без кольору' },
    { v: '#B4471F', n: 'цегляний' }
  ];

  /* ── всё, что можно крутить ────────────────────────────────── */
  const SETS = {
    scope: { opts: [
      { id: 'btn',  n: 'кнопок' },
      { id: 'head', n: 'кнопок і заголовка' },
      { id: 'all',  n: 'усього' },
      { id: 'line', n: 'тільки контурів' }
    ]},
    contrast: { opts: [
      { id: 'soft', n: 'мʼякий', t: 0.86, m: 0.52, f: 0.26, l: 0.09 },
      { id: 'norm', n: 'звичайний', t: 1, m: 0.62, f: 0.34, l: 0.13 },
      { id: 'hard', n: 'різкий', t: 1, m: 0.78, f: 0.5, l: 0.22 }
    ]},
    pattern: { opts: [
      { id: 'none',  n: 'без' },
      { id: 'dots',  n: 'крапки' },
      { id: 'grid',  n: 'сітка' },
      { id: 'lines', n: 'смуги' },
      { id: 'diag',  n: 'діагональ' },
      { id: 'glow',  n: 'світіння' },
      { id: 'mesh',  n: 'плями' },
      { id: 'cross', n: 'хрестики' }
    ]},
    density: { opts: [
      { id: 'air',   n: 'просторо', sp: 1.3 },
      { id: 'mid',   n: 'середньо', sp: 1 },
      { id: 'tight', n: 'щільно',   sp: 0.74 }
    ]},
    width: { opts: [
      { id: 'narrow', n: 'вузько', w: 900 },
      { id: 'mid',    n: 'середньо', w: 1100 },
      { id: 'wide',   n: 'широко', w: 1320 },
      { id: 'full',   n: 'на всю', w: 1800 }
    ]},
    divider: { opts: [
      { id: 'bg',   n: 'зміна фону' },
      { id: 'line', n: 'лінія' },
      { id: 'none', n: 'без межі' }
    ]},
    font: { opts: [
      { id: 'system', n: 'системний',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", h: null, tr: '-0.03em' },
      { id: 'wide', n: 'широкий',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", h: null, tr: '0.01em' },
      { id: 'serif', n: 'із засічками',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        h: "Georgia, 'Iowan Old Style', 'Times New Roman', serif", tr: '-0.015em' },
      { id: 'allserif', n: 'засічки всюди',
        f: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
        h: "Georgia, 'Iowan Old Style', 'Times New Roman', serif", tr: '-0.012em' },
      { id: 'mono', n: 'моноширинний',
        f: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        h: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace", tr: '-0.02em' },
      { id: 'allmono', n: 'моно всюди',
        f: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
        h: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace", tr: '-0.02em' }
    ]},
    title: { opts: [
      { id: 'calm', n: 'спокійний', px: 38 },
      { id: 'big',  n: 'великий',   px: 52 },
      { id: 'huge', n: 'величезний', px: 74 },
      { id: 'wall', n: 'на всю ширину', px: 96 }
    ]},
    caps: { opts: [
      { id: 'as',   n: 'як є' },
      { id: 'upper', n: 'ВЕЛИКИМИ' },
      { id: 'rule', n: 'з рискою' }
    ]},
    leading: { opts: [
      { id: 'tight', n: 'щільний', lh: 1.35 },
      { id: 'norm',  n: 'звичайний', lh: 1.55 },
      { id: 'loose', n: 'вільний', lh: 1.75 }
    ]},
    card: { opts: [
      { id: 'flat',    n: 'плоскі' },
      { id: 'outline', n: 'обводка' },
      { id: 'fill',    n: 'заливка' },
      { id: 'glass',   n: 'скло' },
      { id: 'solid',   n: 'контраст' }
    ]},
    radius: { opts: [
      { id: 'sharp', n: 'без',    r: 0 },
      { id: 'soft',  n: 'ледь',   r: 8 },
      { id: 'round', n: 'помітно', r: 16 },
      { id: 'pill',  n: 'дуже',   r: 28 }
    ]},
    btn: { opts: [
      { id: 'square', n: 'квадратні', r: 0 },
      { id: 'soft',   n: 'скруглені', r: 10 },
      { id: 'pill',   n: 'пігулка',   r: 999 },
      { id: 'cut',    n: 'зі зрізом', r: 0 }
    ]},
    shadow: { opts: [
      { id: 'none', n: 'без' },
      { id: 'soft', n: 'мʼяка' },
      { id: 'deep', n: 'глибока' }
    ]},
    header: { opts: [
      { id: 'plain',  n: 'звичайна' },
      { id: 'clear',  n: 'без лінії' },
      { id: 'pill',   n: 'скляна пігулка' },
      { id: 'center', n: 'по центру' }
    ]},
    cols: { opts: [
      { id: 'two',    n: '2 колонки', c: 2 },
      { id: 'three',  n: '3 колонки', c: 3 },
      { id: 'four',   n: '4 колонки', c: 4 },
      { id: 'mosaic', n: 'мозаїка',   c: 4 }
    ]},
    shot: { opts: [
      { id: 'crop',  n: 'обрізані' },
      { id: 'fit',   n: 'повністю' },
      { id: 'frame', n: 'у рамці' }
    ]},
    shots: { opts: [
      { id: 'on',  n: 'зі знімками' },
      { id: 'off', n: 'без знімків' }
    ]}
  };

  const DEFAULT = {
    bg: '#0E0709', ac: '#FF7A45',
    scope: 'head', contrast: 'norm', pattern: 'none',
    density: 'mid', width: 'mid', divider: 'bg',
    font: 'system', title: 'big', caps: 'as', leading: 'norm',
    card: 'fill', radius: 'round', btn: 'soft', shadow: 'none',
    header: 'plain', cols: 'three', shot: 'crop', shots: 'on'
  };

  /* ── цвет ──────────────────────────────────────────────────── */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

  /** Воспринимаемая яркость: по ней решаем, светлый фон или тёмный. */
  const lum = h => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /** Контраст по WCAG — нужен, чтобы выбрать надпись на кнопке. */
  function contrastOf(h1, h2) {
    const ch = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = h => { const [r, g, b] = hex(h); return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b); };
    const a = L(h1), b = L(h2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  /* ── узоры фона ────────────────────────────────────────────── */
  function patternOf(id, ink, ac, light) {
    const w = a => rgba(ink, a);
    const soft = light ? 0.9 : 1;
    switch (id) {
      case 'dots':
        return { img: `radial-gradient(circle, ${w(0.14 * soft)} 1.2px, transparent 1.2px)`, size: '26px' };
      case 'grid':
        return { img: `linear-gradient(${w(0.07 * soft)} 1px, transparent 1px),
                       linear-gradient(90deg, ${w(0.07 * soft)} 1px, transparent 1px)`, size: '34px' };
      case 'lines':
        return { img: `repeating-linear-gradient(0deg, ${w(0.05 * soft)} 0 1px, transparent 1px 9px)`, size: 'auto' };
      case 'diag':
        return { img: `repeating-linear-gradient(45deg, ${w(0.045 * soft)} 0 1px, transparent 1px 12px)`, size: 'auto' };
      case 'glow':
        return { img: `radial-gradient(60% 45% at 15% 0%, ${rgba(ac, 0.18)}, transparent 70%),
                       radial-gradient(50% 40% at 95% 30%, ${rgba(ac, 0.10)}, transparent 72%)`, size: '100% 100%' };
      case 'mesh':
        return { img: `radial-gradient(40% 30% at 10% 8%, ${rgba(ac, 0.20)}, transparent 70%),
                       radial-gradient(38% 28% at 88% 22%, ${w(0.10)}, transparent 72%),
                       radial-gradient(46% 34% at 55% 85%, ${rgba(ac, 0.12)}, transparent 74%)`, size: '100% 100%' };
      case 'cross':
        return { img: `linear-gradient(${w(0.10 * soft)} 1px, transparent 1px),
                       linear-gradient(90deg, ${w(0.10 * soft)} 1px, transparent 1px)`, size: '40px' };
      default:
        return { img: 'none', size: '28px' };
    }
  }

  /* ── применение ────────────────────────────────────────────── */
  const root = document.documentElement;
  const demo = document.getElementById('demo');
  const pick = (k, id) => SETS[k].opts.find(o => o.id === id) || SETS[k].opts[0];

  const CLASS_KEYS = {
    scope:   s => 'sc-' + s.scope,
    pattern: null,
    divider: s => 'div-' + s.divider,
    caps:    s => s.caps === 'upper' ? 'caps-upper' : s.caps === 'rule' ? 'caps-rule' : '',
    btn:     s => s.btn === 'cut' ? 'btn-cut' : '',
    header:  s => 'hdr-' + s.header,
    cols:    s => s.cols === 'mosaic' ? 'mosaic' : '',
    shot:    s => 'shot-' + s.shot,
    shots:   s => s.shots === 'off' ? 'no-shots' : ''
  };

  function apply(s) {
    const light = lum(s.bg) > 0.5;
    const ink = light ? '#14120F' : '#F6F4F2';
    const c = pick('contrast', s.contrast);

    root.style.setProperty('--bg', s.bg);
    root.style.setProperty('--ink', ink);
    root.style.setProperty('--text', rgba(ink, c.t));
    root.style.setProperty('--muted', rgba(ink, c.m));
    root.style.setProperty('--faint', rgba(ink, c.f));
    root.style.setProperty('--line', rgba(ink, c.l));
    root.style.setProperty('--sunken', rgba(ink, light ? 0.05 : 0.032));
    root.style.setProperty('--accent', s.ac);
    root.style.setProperty('--on-accent',
      contrastOf(s.ac, '#FFFFFF') >= contrastOf(s.ac, '#111111') ? '#FFFFFF' : '#111111');

    root.style.setProperty('--sp', String(pick('density', s.density).sp));
    root.style.setProperty('--maxw', pick('width', s.width).w + 'px');
    root.style.setProperty('--lh', String(pick('leading', s.leading).lh));
    root.style.setProperty('--r', pick('radius', s.radius).r + 'px');
    root.style.setProperty('--btn-r', pick('btn', s.btn).r + 'px');
    root.style.setProperty('--cols', String(pick('cols', s.cols).c));

    const f = pick('font', s.font);
    root.style.setProperty('--font', f.f);
    root.style.setProperty('--font-h', f.h || f.f);
    root.style.setProperty('--track-h', f.tr);

    const t = pick('title', s.title);
    root.style.setProperty('--h1', `clamp(30px, 6vw, ${t.px}px)`);
    root.style.setProperty('--caps', s.caps === 'upper' ? 'uppercase' : 'none');

    // карточки
    const surf = rgba(ink, light ? 0.04 : 0.055);
    const styles = {
      flat:    { bg: 'transparent', line: '0 solid transparent', sh: 'none', blur: 'none' },
      outline: { bg: 'transparent', line: '1px solid var(--line)', sh: 'none', blur: 'none' },
      fill:    { bg: light ? '#FFFFFF' : surf, line: '1px solid var(--line)', sh: 'none', blur: 'none' },
      glass:   { bg: rgba(ink, light ? 0.05 : 0.06), line: '1px solid ' + rgba(ink, light ? 0.14 : 0.16),
                 sh: 'none', blur: 'blur(22px) saturate(150%)' },
      solid:   { bg: light ? '#14120F' : '#FFFFFF', line: '0 solid transparent', sh: 'none', blur: 'none' }
    }[s.card];
    root.style.setProperty('--card-bg', styles.bg);
    root.style.setProperty('--card-line', styles.line);
    root.style.setProperty('--card-shadow', styles.sh);
    root.style.setProperty('--card-blur', styles.blur);

    // «контраст» переворачивает текст внутри карточки — иначе он пропадёт
    demo.classList.toggle('card-invert', s.card === 'solid');
    if (s.card === 'solid') {
      demo.style.setProperty('--card-ink', light ? '#F6F4F2' : '#14120F');
    } else {
      demo.style.removeProperty('--card-ink');
    }

    const elev = { none: 'none',
      soft: light ? '0 1px 3px rgba(0,0,0,.07), 0 10px 30px rgba(0,0,0,.07)'
                  : '0 2px 8px rgba(0,0,0,.45), 0 16px 40px rgba(0,0,0,.35)',
      deep: light ? '0 4px 12px rgba(0,0,0,.12), 0 26px 60px rgba(0,0,0,.16)'
                  : '0 8px 24px rgba(0,0,0,.6), 0 34px 80px rgba(0,0,0,.5)' }[s.shadow];
    root.style.setProperty('--elev', elev);

    const p = patternOf(s.pattern, ink, s.ac, light);
    root.style.setProperty('--pat', p.img);
    root.style.setProperty('--pat-size', p.size);

    // классы-модификаторы: сначала снимаем все прежние, потом ставим свои
    demo.className = 'demo';
    Object.values(CLASS_KEYS).forEach(fn => {
      if (!fn) return;
      const cls = fn(s);
      if (cls) demo.classList.add(cls);
    });

    writeOut(s);
    location.replace('#' + encode(s));
  }

  /* ── строка для отправки ───────────────────────────────────── */
  const nameOf = (arr, v) => (arr.find(x => x.v === v) || {}).n || 'свій';
  const optName = (k, id) => pick(k, id).n;

  const ORDER = [
    ['фон', s => `${s.bg} (${nameOf(BG, s.bg)})`],
    ['акцент', s => `${s.ac} (${nameOf(AC, s.ac)})`],
    ['акцент на', s => optName('scope', s.scope)],
    ['контраст', s => optName('contrast', s.contrast)],
    ['візерунок', s => optName('pattern', s.pattern)],
    ['щільність', s => optName('density', s.density)],
    ['ширина', s => optName('width', s.width)],
    ['межа секцій', s => optName('divider', s.divider)],
    ['шрифт', s => optName('font', s.font)],
    ['заголовок', s => optName('title', s.title)],
    ['заголовки', s => optName('caps', s.caps)],
    ['інтервал', s => optName('leading', s.leading)],
    ['картки', s => optName('card', s.card)],
    ['скруглення', s => optName('radius', s.radius)],
    ['кнопки', s => optName('btn', s.btn)],
    ['тінь', s => optName('shadow', s.shadow)],
    ['шапка', s => optName('header', s.header)],
    ['сітка', s => optName('cols', s.cols)],
    ['знімки', s => optName('shot', s.shot)],
    ['картинки', s => optName('shots', s.shots)]
  ];

  function writeOut(s) {
    const line = ORDER.map(([k, fn]) => `${k}: ${fn(s)}`).join(' · ');
    document.getElementById('out').value =
      line + '\n\n' + location.href.split('#')[0] + '#' + encode(s);
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

  function swatches(boxId, list, key, pickId) {
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
      b.addEventListener('click', () => { state[key] = c.v; refresh(); });
      box.append(b);
    });
    const input = document.getElementById(pickId);
    input.value = state[key];
    input.oninput = () => { state[key] = input.value.toUpperCase(); refresh(); };
  }

  function segs(key) {
    const box = document.getElementById(key);
    if (!box) return;
    box.textContent = '';
    SETS[key].opts.forEach(o => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg';
      b.textContent = o.n;
      b.setAttribute('aria-pressed', String(state[key] === o.id));
      b.addEventListener('click', () => { state[key] = o.id; refresh(); });
      box.append(b);
    });
  }

  function refresh() {
    swatches('bgSet', BG, 'bg', 'bgPick');
    swatches('acSet', AC, 'ac', 'acPick');
    Object.keys(SETS).forEach(segs);
    apply(state);
  }

  /* ── сколько всего сочетаний ───────────────────────────────── */
  function countCombos() {
    let n = BG.length * AC.length;
    for (const k of Object.keys(SETS)) n *= SETS[k].opts.length;
    return n;
  }

  document.getElementById('count').textContent =
    'Сполучень із готових зразків: ' + countCombos().toLocaleString('uk-UA') +
    '. Плюс свій колір фону й акценту — тоді без обмежень.';

  /* ── мелочи ────────────────────────────────────────────────── */
  document.querySelectorAll('.group').forEach(g => {
    g.querySelector('.ghead').addEventListener('click', () => {
      if (g.hasAttribute('data-open')) g.removeAttribute('data-open');
      else g.setAttribute('data-open', '1');
    });
  });

  const toggle = document.getElementById('panelToggle');
  const setOpen = on => {
    document.body.classList.toggle('open', on);
    toggle.setAttribute('aria-expanded', String(on));
    toggle.textContent = on ? 'Сховати' : 'Налаштування';
  };
  setOpen(true);
  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('open')));

  document.getElementById('rand').addEventListener('click', () => {
    const any = a => a[Math.floor(Math.random() * a.length)];
    state = { bg: any(BG).v, ac: any(AC).v };
    for (const k of Object.keys(SETS)) state[k] = any(SETS[k].opts).id;
    refresh();
  });

  document.getElementById('reset').addEventListener('click', () => {
    state = { ...DEFAULT };
    refresh();
  });

  document.getElementById('copy').addEventListener('click', async () => {
    const out = document.getElementById('out');
    const btn = document.getElementById('copy');
    out.select();
    try {
      await navigator.clipboard.writeText(out.value);
      btn.textContent = 'Скопійовано';
    } catch (e) {
      // в некоторых браузерах буфер закрыт — текст уже выделен, хватит Ctrl+C
      btn.textContent = 'Виділено — Ctrl+C';
    }
    setTimeout(() => { btn.textContent = 'Скопіювати'; }, 1800);
  });

  refresh();
})();
