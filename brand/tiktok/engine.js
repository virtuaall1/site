/**
 * Движок роликов. Про смысл ничего не знает: берёт сцену из
 * scenes.js, строит по её типу разметку и двигает кадры.
 *
 * Время не идёт само — render.js зовёт setT(0…1) и снимает кадр.
 * Поэтому ролик выходит ровный, даже когда машина тормозит, и
 * повторный рендер даёт тот же файл до кадра.
 */
'use strict';

const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
/** доля времени, прошедшая на отрезке [a, b] */
const seg = (t, a, b) => clamp((t - a) / (b - a));
const outCubic = p => 1 - Math.pow(1 - p, 3);
/** выход с небольшим перелётом — для того, что «прилетает» */
const outBack = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const lerp = (a, b, p) => a + (b - a) * p;
const px = v => v.toFixed(2) + 'px';
const $ = id => document.getElementById(id);

const name = new URLSearchParams(location.search).get('scene') || 'price';
const S = window.SCENES[name];

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;   // тексты свои, из scenes.js
  return n;
};

/* ---------- разметка по типу сцены ---------- */
const MARKS = { yes: '✓', no: '✕', num: null };

function build() {
  document.body.dataset.type = S.type;
  $('hook').innerHTML = S.hook;
  $('sub').innerHTML = S.sub || '';
  if (!S.sub) $('sub').remove();

  const box = $('body');

  if (S.type === 'prices') {
    box.className = 'beats';
    S.items.forEach(it => {
      const row = el('div', 'beat');
      row.append(el('span', '', ''), el('div', '', `${it.name}<div class="tag"><span>від</span><em>${it.uah}</em></div>`));
      box.append(row);
    });
  }

  if (S.type === 'list') {
    box.className = 'beats';
    S.items.forEach((it, i) => {
      const row = el('div', 'beat' + (S.mark === 'no' ? ' no' : ''));
      const marker = MARKS[S.mark] === null ? String(i + 1).padStart(2, '0') : MARKS[S.mark];
      row.append(el('b', '', marker), el('div', '', it.text + (it.note ? `<i>${it.note}</i>` : '')));
      box.append(row);
    });
  }

  if (S.type === 'chat') {
    box.className = 'chat';
    S.items.forEach(it => {
      box.append(el('div', 'msg ' + (it.hit ? 'hit' : it.me ? 'me' : 'them'), it.text));
    });
  }

  if (S.type === 'versus') {
    box.className = 'versus';
    S.items.forEach(it => {
      box.append(el('div', 'col' + (it.good ? ' good' : ''), `<h3>${it.title}</h3><p>${it.text}</p>`));
    });
  }

  if (S.type === 'works') {
    box.className = 'works';
    S.items.forEach(it => {
      box.append(el('div', 'work', `<img src="${it.img}" alt=""><p>${it.name}<i>${it.note}</i></p>`));
    });
  }

  if (S.type === 'punch') {
    box.className = 'beats';
    S.items.forEach(it => box.append(el('div', 'beat', `<b>→</b><div>${it.text}</div>`)));
  }
}

/* ---------- движение ---------- */

/** Хук читается с первого кадра: только лёгкий наезд, без выезда. */
function hook(t) {
  const p = outCubic(seg(t, 0, 0.05));
  $('hook').style.transform = 'scale(' + lerp(1.04, 1, p).toFixed(4) + ')';
  $('hook').style.transformOrigin = 'left top';
  const sub = $('sub');
  if (sub) {
    const s = outCubic(seg(t, 0.06, 0.14));
    sub.style.opacity = s.toFixed(3);
    sub.style.transform = 'translateY(' + px(lerp(16, 0, s)) + ')';
  }
}

/** Строки выбиваются по одной с перелётом — это читается как удар. */
function punchIn(nodes, t, from, step) {
  nodes.forEach((node, i) => {
    const a = from + i * step;
    const p = outBack(seg(t, a, a + 0.1));
    node.style.opacity = clamp(seg(t, a, a + 0.05)).toFixed(3);
    node.style.transform = 'translateX(' + px(lerp(-46, 0, p)) + ') scale(' + lerp(0.94, 1, p).toFixed(3) + ')';
  });
}

function run(t) {
  hook(t);
  const kids = [...$('body').children];

  if (S.type === 'works') {
    const w = [[0.18, 0.44], [0.44, 0.68], [0.68, 0.94]];
    kids.forEach((node, i) => {
      const [a, b] = w[i];
      const inP = outCubic(seg(t, a, a + 0.06));
      const outP = i < 2 ? outCubic(seg(t, b - 0.04, b)) : 0;
      node.style.opacity = clamp(inP - outP).toFixed(3);
      node.style.transform = 'translateY(' + px(lerp(60, 0, inP) - 60 * outP) + ')';
    });
  } else if (S.type === 'punch') {
    // здесь строки не копятся, а сменяют друг друга на месте
    // последняя строка не гаснет: иначе конец ролика пустой
    const w = [[0.16, 0.40], [0.40, 0.64], [0.64, 1.02]];
    kids.forEach((node, i) => {
      const [a, b] = w[i];
      node.style.position = 'absolute';
      node.style.left = '0';
      node.style.right = '0';
      const inP = outBack(seg(t, a, a + 0.08));
      const outP = outCubic(seg(t, b - 0.05, b));
      node.style.opacity = clamp(seg(t, a, a + 0.05) - outP).toFixed(3);
      node.style.transform = 'translateY(' + px(lerp(40, 0, inP) - 40 * outP) + ')';
    });
  } else {
    const step = S.type === 'chat' ? 0.1 : S.type === 'versus' ? 0.24 : 0.13;
    punchIn(kids, t, 0.16, step);
  }

  // плашка с контактом — в конце, а не в начале: на TikTok логотип
  // в первом кадре съедает те самые полторы секунды
  const p = outBack(seg(t, 0.86, 0.98));
  $('end').style.opacity = clamp(seg(t, 0.86, 0.91)).toFixed(3);
  $('end').style.transform = 'translateY(' + px(lerp(90, 0, p)) + ')';
}

build();
window.setT = run;
run(0);
