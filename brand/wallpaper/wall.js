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
  const VARIANT = q.get('v') || 'mesh';
  const ACCENT = /^#[0-9A-Fa-f]{6}$/.test(q.get('a') || '') ? q.get('a') : '#FF7A45';
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

  const INK = '#08080A';
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
    ctx.globalAlpha = 0.055;
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

    ctx.font = `700 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = portrait ? 'center' : 'left';
    ctx.textBaseline = 'alphabetic';

    const x = portrait ? W / 2 : pad;
    const text = 'v.studio';

    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(text, x, y);

    // точка в имени — акцентом, как на сайте
    const wv = ctx.measureText('v').width;
    const wd = ctx.measureText('.').width;
    const left = portrait ? x - ctx.measureText(text).width / 2 : x;
    ctx.fillStyle = A1;
    ctx.fillText('.', left + wv, y);
    void wd;

    ctx.font = `400 ${size * 0.62}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.fillText('vstudio.dev', x, y + size * 1.15);
  }

  /* ── збірка ─────────────────────────────────────────────────── */
  ({ mesh, flow, grid }[VARIANT] || mesh)();
  grain();
  if (MARK) mark();

  window.__ready = true;
})();
