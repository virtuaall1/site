/**
 * Шпалери v.studio.
 *
 * Три сюжети, усі малюються під конкретний розмір, а не масштабуються:
 *
 *   mesh — мʼякі кольорові плями по темному, як розсіяне світло
 *   flow — тисячі тонких ліній, що течуть полем; головний малюнок
 *   grid — точна сітка й одна акцентна дуга; найспокійніший
 *
 * Зерно накладається завжди. Воно не «для краси»: рівні градієнти на
 * великих площинах ідуть смугами, а дрібний шум ці смуги розбиває —
 * і в jpeg вони вже не вилазять.
 *
 * Випадковість керована: один і той самий seed дає той самий малюнок,
 * тому шпалеру можна перезняти і отримати те саме.
 */
(() => {
  'use strict';

  const q = new URLSearchParams(location.search);
  const W = Math.max(64, +q.get('w') || 1920);
  const H = Math.max(64, +q.get('h') || 1080);
  const VARIANT = q.get('v') || 'pulse';

  /* Студійні сюжети малюються кольорами сайту: кислотний лайм по
     чорнилу, світлий — по паперу. Старі три залишаються на
     помаранчевому, якими їх зняли. Параметр ?a= перебиває будь-що. */
  const STUDIO = ['pulse', 'decode', 'paper'];
  const DEFAULT_ACCENT = STUDIO.includes(VARIANT) ? '#d8ff3e' : '#FF7A45';
  const ACCENT = /^#[0-9A-Fa-f]{6}$/.test(q.get('a') || '') ? q.get('a') : DEFAULT_ACCENT;
  const MARK = q.get('mark') === '1';
  const SEED = +q.get('seed') || 7;

  const canvas = document.getElementById('c');
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');

  /* Всё, что зависит от размера, считаем от короткой стороны:
     иначе на телефоне рисунок выходит вдвое мельче, чем на мониторе. */
  const S = Math.min(W, H);
  const portrait = H > W;

  /* ── керована випадковість ──────────────────────────────────── */
  let s = SEED >>> 0;
  function rnd() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  }
  const between = (a, b) => a + rnd() * (b - a);

  /* ── колір ──────────────────────────────────────────────────── */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

  /** Сдвиг оттенка: из одного акцента получаем родственную пару. */
  function shift(h, deg) {
    let [r, g, b] = hex(h).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let hu = 0;
    if (d) {
      if (max === r) hu = ((g - b) / d) % 6;
      else if (max === g) hu = (b - r) / d + 2;
      else hu = (r - g) / d + 4;
    }
    hu = (hu * 60 + deg + 360) % 360;
    const l = (max + min) / 2;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    const c = (1 - Math.abs(2 * l - 1)) * sat;
    const x = c * (1 - Math.abs((hu / 60) % 2 - 1));
    const m = l - c / 2;
    const seg = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(hu / 60) % 6];
    const out = seg.map(v => Math.round((v + m) * 255));
    return '#' + out.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /* Ті самі значення, що в css/style.css: чорнило, папір і лайм.
     Якщо на сайті поміняється палітра — поміняти і тут, іншого
     зв'язку між ними немає. */
  const INK = '#08080A';
  const SITE_INK = '#0a0a0b';
  const PAPER = '#f4f1ea';
  const DOT_DARK = '#f2efe8';    // точки сітки на чорнилі
  const DOT_LIGHT = '#14140f';   // ті самі точки на папері
  const LIGHT = VARIANT === 'paper';
  const A1 = ACCENT;
  const A2 = shift(ACCENT, 42);
  const A3 = shift(ACCENT, -58);

  /* ── сюжети ─────────────────────────────────────────────────── */

  /** Мʼяке світло: кілька великих плям, кожна зі своїм кольором. */
  function mesh() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    const blobs = [
      { x: 0.18, y: 0.12, r: 0.72, c: A1, a: 0.55 },
      { x: 0.86, y: 0.30, r: 0.60, c: A2, a: 0.38 },
      { x: 0.52, y: 0.92, r: 0.78, c: A3, a: 0.34 },
      { x: 0.05, y: 0.78, r: 0.46, c: A2, a: 0.22 },
      { x: 0.94, y: 0.88, r: 0.40, c: A1, a: 0.20 }
    ];

    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const r = b.r * S;
      const g = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, r);
      g.addColorStop(0, rgba(b.c, b.a));
      g.addColorStop(0.45, rgba(b.c, b.a * 0.32));
      g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Затемнение по краям: держит взгляд в центре и прячет стыки пятен
    const v = ctx.createRadialGradient(W / 2, H / 2, S * 0.15, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * Течія: точки йдуть полем із шуму й лишають слід. Це і є малюнок —
   * тому ліній багато, а кожна майже прозора.
   */
  function flow() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    // подложка, чтобы линии не висели в пустоте
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, rgba(A3, 0.16));
    bg.addColorStop(0.55, 'rgba(0,0,0,0)');
    bg.addColorStop(1, rgba(A1, 0.12));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Дешёвый шум: сумма нескольких синусов. Настоящий Перлин здесь
    // не нужен — поле должно быть плавным, а не «правильным».
    const k = 1 / (S * 0.62);
    const field = (x, y) =>
      Math.sin(x * k * 1.7 + 0.6) * 1.2 +
      Math.sin(y * k * 1.3 - 0.4) * 1.1 +
      Math.sin((x + y) * k * 0.8) * 0.9 +
      Math.sin((x - y) * k * 1.9 + 2.1) * 0.5;

    const lines = Math.round(S * 1.15);
    const steps = Math.round(S * 0.34);
    const step = S * 0.0042;

    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < lines; i++) {
      let x = between(-0.1, 1.1) * W;
      let y = between(-0.1, 1.1) * H;

      const t = rnd();
      const col = t < 0.42 ? A1 : t < 0.76 ? A2 : A3;
      ctx.strokeStyle = rgba(col, between(0.035, 0.11));
      ctx.lineWidth = between(0.6, 2.1) * (S / 1080);

      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < steps; j++) {
        const ang = field(x, y) * Math.PI;
        x += Math.cos(ang) * step;
        y += Math.sin(ang) * step;
        if (x < -S || x > W + S || y < -S || y > H + S) break;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    const v = ctx.createRadialGradient(W / 2, H * 0.45, S * 0.1, W / 2, H * 0.5, Math.hypot(W, H) * 0.6);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.66)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /** Сітка й одна дуга: найтихіший варіант, під іконки на телефоні. */
  function grid() {
    const bg = ctx.createLinearGradient(0, 0, W * 0.3, H);
    bg.addColorStop(0, '#0C0C10');
    bg.addColorStop(1, INK);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const cell = S / (portrait ? 14 : 22);
    ctx.lineWidth = Math.max(1, S / 1400);

    for (let x = 0; x <= W + cell; x += cell) {
      // линии гаснут к краям — сетка не должна упираться в рамку
      const f = 1 - Math.abs(x / W - 0.42) * 1.5;
      ctx.strokeStyle = rgba('#FFFFFF', Math.max(0, f) * 0.05);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H + cell; y += cell) {
      const f = 1 - Math.abs(y / H - 0.5) * 1.4;
      ctx.strokeStyle = rgba('#FFFFFF', Math.max(0, f) * 0.05);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // узлы на пересечениях — редкие, чтобы сетка не рябила
    for (let x = 0; x <= W; x += cell * 3) {
      for (let y = 0; y <= H; y += cell * 3) {
        ctx.fillStyle = rgba('#FFFFFF', 0.10);
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Дуга: единственное яркое место. Толщина растёт к середине,
    // поэтому она читается как мазок, а не как обводка круга.
    const cx = portrait ? W * 0.5 : W * 0.66;
    const cy = portrait ? H * 0.42 : H * 0.5;
    const rad = S * (portrait ? 0.42 : 0.34);
    const segs = 220;
    ctx.lineCap = 'round';
    for (let i = 0; i < segs; i++) {
      const a0 = (-0.62 + (i / segs) * 2.1) * Math.PI;
      const a1 = (-0.62 + ((i + 1.4) / segs) * 2.1) * Math.PI;
      const t = i / segs;
      const fade = Math.sin(t * Math.PI);
      ctx.strokeStyle = rgba(t < 0.5 ? A1 : A2, 0.9 * fade);
      ctx.lineWidth = (S / 150) * fade;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, a0, a1);
      ctx.stroke();
    }

    // мягкое свечение под дугой
    const g = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 1.8);
    g.addColorStop(0, rgba(A1, 0.16));
    g.addColorStop(1, rgba(A1, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Розмір кегля під ширину: міряємо на пробному кеглі й ділимо.
   * Без цього на вузькому телефоні найдовший рядок просто виїжджає
   * за екран — і на 1179 px це видно одразу.
   */
  function fitSize(text, weight, wanted, maxWidth) {
    ctx.font = `${weight} 100px Unbounded, sans-serif`;
    const at100 = ctx.measureText(text).width;
    return Math.min(wanted, (maxWidth / at100) * 100);
  }

  /* ── студійні сюжети ────────────────────────────────────────
     Тут немає нічого вигаданого: усе це вже живе на сайті.
     Сітка точок — фон головної (initGrid в js/app.js), хвиля —
     те, що розходиться від кліку, символи — слід за курсором,
     «розшифровка» — те, як проявляються заголовки. Шпалера
     показує ці механіки зупиненими на одному кадрі. */

  /** Сітка точок і зупинена хвиля від кліку. */
  function pulse() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d0d10');
    bg.addColorStop(0.55, SITE_INK);
    bg.addColorStop(1, '#08080a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // На сайті крок сітки 34 px при звичайному екрані. Тут рахуємо
    // від короткої сторони, інакше на 4K сітка вийде вдвічі дрібнішою.
    const gap = S / 32;
    const cx = portrait ? W * 0.5 : W * 0.63;
    const cy = portrait ? H * 0.40 : H * 0.48;
    const radius = S * 0.30;          // де зараз фронт хвилі
    const band = gap * 2.6;           // товщина фронту
    const reach = gap * 0.62;         // наскільки хвиля штовхає точку

    for (let x = -gap; x <= W + gap; x += gap) {
      for (let y = -gap; y <= H + gap; y += gap) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const delta = Math.abs(dist - radius);

        // сила фронту: різко в піку, м'яко по краях
        const front = delta > band ? 0 : Math.pow(1 - delta / band, 1.6);
        // усередині кола точки трохи яскравіші — там хвиля вже пройшла
        const inside = dist < radius ? 0.10 * (1 - dist / radius) : 0;

        const px = x + (dx / dist) * front * reach;
        const py = y + (dy / dist) * front * reach;

        const energy = Math.min(1, front + inside);
        const size = (gap / 17) * (1 + energy * 2.4);
        const alpha = 0.16 + energy * 0.72;

        ctx.fillStyle = energy > 0.4 ? rgba(A1, alpha) : rgba(DOT_DARK, alpha);
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }

    // світло під фронтом — так хвиля читається як подія, а не як коло
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, radius * 0.72, cx, cy, radius * 1.32);
    g.addColorStop(0, rgba(A1, 0));
    g.addColorStop(0.5, rgba(A1, 0.07));
    g.addColorStop(1, rgba(A1, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // епіцентр: той самий квадратний акцент, що й крапка в назві
    const dotSize = gap * 0.44;
    ctx.fillStyle = A1;
    ctx.fillRect(cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize);

    const v = ctx.createRadialGradient(cx, cy, S * 0.28, cx, cy, Math.hypot(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * Розшифровка: слова з головної, спіймані на півдорозі. Частина
   * літер уже стала на місце, частина ще перебирає символи коду —
   * рівно те, що робить scramble() на сайті.
   */
  const NOISE = ['0', '1', '{', '}', '<', '>', '/', ';', '=', '$', '[', ']', '#', '*'];

  function decode() {
    ctx.fillStyle = SITE_INK;
    ctx.fillRect(0, 0, W, H);

    // ледь помітна сітка позаду — фон головної
    const gap = S / 32;
    ctx.fillStyle = rgba(DOT_DARK, 0.07);
    for (let x = 0; x <= W; x += gap) {
      for (let y = 0; y <= H; y += gap) ctx.fillRect(x, y, 1.4, 1.4);
    }

    // фраза з головної, розбита так само, як там
    const lines = portrait
      ? ['САЙТИ,', 'СЕРВІСИ', 'І БОТИ, ЯКІ', 'ПРАЦЮЮТЬ', 'ЗА ВАС.']
      : ['САЙТИ, СЕРВІСИ', 'І БОТИ, ЯКІ', 'ПРАЦЮЮТЬ ЗА ВАС.'];
    // останні рядки — акцентом, як у заголовку на сайті
    const hot = portrait ? 3 : 2;

    const left = portrait ? W * 0.09 : W * 0.08;
    const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
    const size = fitSize(longest, 800, S * (portrait ? 0.105 : 0.115), W - left * 2);
    const step = size * 1.06;
    const top = H / 2 - (lines.length - 1) * step / 2;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${size}px Unbounded, sans-serif`;

    lines.forEach((line, i) => {
      let x = left;
      const y = top + i * step;
      const accentLine = i >= hot;

      /* Розшифровка йде знизу вгору: головне вже стало на місце,
         догоряють верхні рядки. Рахуємо підміни, а не кидаємо кубик
         на кожну літеру: шпалеру дивляться щодня, і фраза має
         читатись, а не розгадуватись. Тому дві літери у верхньому
         рядку, одна в наступному — і жодної там, де сенс. */
      // На коротких рядках дві підміни з шести літер — це вже не
      // розшифровка, а каша: рахуємо ще й від довжини.
      const budget = accentLine ? 0 : Math.min(Math.max(0, 2 - i), Math.floor(line.length / 7));
      const spots = new Set();
      // початок рядка не чіпаємо: перше слово має читатись, інакше
      // фраза розсипається і кадр читається як помилка, а не як рух
      const from = Math.ceil(line.length * 0.45);
      // розділові знаки теж лишаємо: підмінена кома читається не як
      // розшифровка, а як друкарська помилка
      const slots = [...line]
        .map((ch, k) => (k < from || ' ,.'.includes(ch) ? -1 : k))
        .filter(k => k >= 0);
      while (spots.size < Math.min(budget, slots.length)) {
        spots.add(slots[(rnd() * slots.length) | 0]);
      }

      [...line].forEach((ch, k) => {
        if (ch === ' ') { x += ctx.measureText(' ').width; return; }

        const raw = spots.has(k);
        const glyph = raw ? NOISE[(rnd() * NOISE.length) | 0] : ch;

        if (raw) {
          ctx.font = `600 ${size * 0.82}px Unbounded, sans-serif`;
          ctx.fillStyle = rgba(A1, 0.72);
        } else {
          ctx.font = `800 ${size}px Unbounded, sans-serif`;
          ctx.fillStyle = accentLine ? A1 : rgba(DOT_DARK, 0.94);
        }
        ctx.fillText(glyph, x, y);

        // ширину рахуємо по справжній літері, щоб рядок не «дихав»
        ctx.font = `800 ${size}px Unbounded, sans-serif`;
        x += ctx.measureText(ch).width;
      });
    });

    // лінійка й підпис під нею — так само, як розділювачі на сайті
    const ruleY = top + (lines.length - 1) * step + size * 0.92;
    ctx.strokeStyle = rgba(DOT_DARK, 0.16);
    ctx.lineWidth = Math.max(1, S / 1400);
    ctx.beginPath();
    ctx.moveTo(left, ruleY);
    ctx.lineTo(portrait ? W - left : left + S * 0.62, ruleY);
    ctx.stroke();

    ctx.font = `400 ${size * 0.15}px Onest, sans-serif`;
    ctx.fillStyle = rgba(DOT_DARK, 0.42);
    ctx.textBaseline = 'top';
    ctx.fillText('Python · TypeScript · Node.js · Telegram', left, ruleY + size * 0.2);

    const v = ctx.createRadialGradient(W * 0.4, H * 0.5, S * 0.3, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * Папір: світла тема сайту. Той самий скелет із лінійок, повітря
   * більше, ніж малюнка, і один акцентний квадрат — крапка з назви.
   */
  function paper() {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // тепле світло згори зліва — папір не буває рівно залитим
    const warm = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, Math.hypot(W, H) * 0.9);
    warm.addColorStop(0, 'rgba(255,255,255,0.55)');
    warm.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);

    const gap = S / 32;
    ctx.fillStyle = rgba(DOT_LIGHT, 0.10);
    for (let x = 0; x <= W; x += gap) {
      for (let y = 0; y <= H; y += gap) ctx.fillRect(x, y, 1.4, 1.4);
    }

    // колонки-лінійки: те, чим на сайті тримається сітка
    const cols = portrait ? 4 : 6;
    ctx.strokeStyle = rgba(DOT_LIGHT, 0.10);
    ctx.lineWidth = Math.max(1, S / 1600);
    for (let i = 1; i < cols; i++) {
      const x = (W / cols) * i;
      ctx.beginPath(); ctx.moveTo(x, H * 0.08); ctx.lineTo(x, H * 0.92); ctx.stroke();
    }

    // знак: v.studio, крапка — квадратом кольору акценту
    // «v.studio» плюс місце під квадрат — усе це має вміститись
    const size = fitSize('v studio', 800, S * (portrait ? 0.20 : 0.17), W * 0.76);
    const cx = W / 2;
    const cy = portrait ? H * 0.44 : H * 0.48;

    /* Знак збираємо з трьох частин: «v», квадрат замість крапки,
       «studio». Замальовувати намальовану крапку — шлях у плями:
       на папері будь-яка латка помітна. */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${size}px Unbounded, sans-serif`;

    const wV = ctx.measureText('v').width;
    const wTail = ctx.measureText('studio').width;
    const sq = size * 0.15;
    const slot = sq * 2.1;                       // місце під крапку з повітрям
    const startX = cx - (wV + slot + wTail) / 2;

    ctx.fillStyle = DOT_LIGHT;
    ctx.fillText('v', startX, cy);
    ctx.fillText('studio', startX + wV + slot, cy);

    ctx.fillStyle = A1;
    ctx.fillRect(startX + wV + (slot - sq) / 2, cy + size * 0.30 - sq, sq, sq);

    // рядок під знаком
    ctx.textAlign = 'center';
    ctx.font = `400 ${size * 0.115}px Onest, sans-serif`;
    ctx.fillStyle = rgba(DOT_LIGHT, 0.55);
    ctx.fillText('сайти · сервіси · боти', cx, cy + size * 0.78);

    // дві лінійки, що обіймають знак
    ctx.strokeStyle = rgba(DOT_LIGHT, 0.14);
    ctx.lineWidth = Math.max(1, S / 1400);
    for (const y of [cy - size * 0.95, cy + size * 1.15]) {
      ctx.beginPath();
      ctx.moveTo(W * 0.12, y);
      ctx.lineTo(W * 0.88, y);
      ctx.stroke();
    }
  }

  /* ── зерно ──────────────────────────────────────────────────── */
  function grain() {
    // Рисуем один небольшой тайл и размножаем: полноразмерный шум на
    // 4K — это 33 миллиона случайных чисел и секунды ожидания.
    const t = document.createElement('canvas');
    t.width = t.height = 256;
    const tc = t.getContext('2d');
    const img = tc.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + (rnd() * 74 | 0);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tc.putImageData(img, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = LIGHT ? 0.03 : 0.055;
    const p = ctx.createPattern(t, 'repeat');
    ctx.fillStyle = p;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ── підпис ─────────────────────────────────────────────────── */
  function mark() {
    const size = S * (portrait ? 0.036 : 0.026);
    const pad = S * 0.055;
    const y = portrait ? H - pad * 1.4 : H - pad;
    const on = LIGHT ? DOT_LIGHT : DOT_DARK;

    ctx.font = `700 ${size}px Unbounded, system-ui, sans-serif`;
    ctx.textAlign = portrait ? 'center' : 'left';
    ctx.textBaseline = 'alphabetic';

    const x = portrait ? W / 2 : pad;
    const text = 'v.studio';

    ctx.fillStyle = rgba(on, 0.82);
    ctx.fillText(text, x, y);

    // точка в имени — акцентом, как на сайте
    const wv = ctx.measureText('v').width;
    const wd = ctx.measureText('.').width;
    const left = portrait ? x - ctx.measureText(text).width / 2 : x;
    ctx.fillStyle = A1;
    ctx.fillText('.', left + wv, y);
    void wd;

    ctx.font = `400 ${size * 0.62}px Onest, system-ui, sans-serif`;
    ctx.fillStyle = rgba(on, 0.34);
    ctx.fillText('vrtll.dev', x, y + size * 1.15);
  }

  /* ── збірка ─────────────────────────────────────────────────── */
  /* Малюємо тільки після того, як шрифти справді доїхали: canvas не
     вміє перемальовувати текст заднім числом, і кадр, знятий на
     півсекунди раніше, вийде системним шрифтом замість Unbounded. */
  document.fonts.load('800 100px Unbounded')
    .then(() => document.fonts.load('400 100px Onest'))
    .then(() => document.fonts.ready)
    .catch(() => { /* шрифтів немає — малюємо тим, що є */ })
    .then(() => {
      ({ pulse, decode, paper, mesh, flow, grid }[VARIANT] || pulse)();
      grain();
      // на паперовій шпалері знак і так у центрі — другий підпис зайвий
      if (MARK && VARIANT !== 'paper') mark();
      window.__ready = true;
    });
})();
