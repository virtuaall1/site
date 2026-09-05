/**
 * Движок роликов. Про смысл не знает: берёт сцену из scenes.js,
 * строит по её типу разметку и водит по ней Крапку.
 *
 * Главное отличие от прошлой версии: содержимое не «появляется
 * само», а появляется там, где приземлился персонаж. Поэтому
 * раскладка сначала измеряется по-настоящему, и только потом
 * строится маршрут — цифры остановок не вбиты руками и не разъедутся,
 * если поменять текст.
 *
 * Время не идёт само: render.js зовёт setT(0…1) и снимает кадр.
 */
'use strict';

const px = v => v.toFixed(2) + 'px';
const $ = id => document.getElementById(id);

const name = new URLSearchParams(location.search).get('scene') || 'price';
const S = window.SCENES[name];

const mk = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;   // тексты свои, из scenes.js
  return n;
};

/* ---------- разметка ---------- */
const MARKS = { yes: '✓', no: '✕', num: null };

function build() {
  document.body.dataset.type = S.type;
  $('hook').innerHTML = S.hook;
  if (S.sub) $('sub').innerHTML = S.sub; else $('sub').remove();

  const box = $('body');

  if (S.type === 'prices') {
    box.className = 'beats';
    S.items.forEach(it => {
      const row = mk('div', 'beat');
      row.append(mk('b', '', String(S.items.indexOf(it) + 1).padStart(2, '0')), mk('div', '', `${it.name}<div class="tag"><span>від</span><em>${it.uah}</em></div>`));
      box.append(row);
    });
  }
  if (S.type === 'list') {
    box.className = 'beats';
    S.items.forEach((it, i) => {
      const row = mk('div', 'beat' + (S.mark === 'no' ? ' no' : ''));
      const marker = MARKS[S.mark] === null ? String(i + 1).padStart(2, '0') : MARKS[S.mark];
      row.append(mk('b', '', marker), mk('div', '', it.text + (it.note ? `<i>${it.note}</i>` : '')));
      box.append(row);
    });
  }
  if (S.type === 'chat') {
    box.className = 'chat';
    S.items.forEach(it => box.append(mk('div', 'msg ' + (it.hit ? 'hit' : it.me ? 'me' : 'them'), it.text)));
  }
  if (S.type === 'versus') {
    box.className = 'versus';
    S.items.forEach(it => box.append(mk('div', 'col' + (it.good ? ' good' : ''), `<h3>${it.title}</h3><p>${it.text}</p>`)));
  }
  if (S.type === 'works') {
    box.className = 'works';
    S.items.forEach(it => box.append(mk('div', 'work', `<img src="${it.img}" alt=""><p>${it.name}<i>${it.note}</i></p>`)));
  }
  if (S.type === 'punch') {
    box.className = 'beats';
    S.items.forEach(it => box.append(mk('div', 'beat', `<b>→</b><div>${it.text}</div>`)));
  }
}

/* ---------- маршрут строится по измеренной раскладке ---------- */
const dot = new Dot($('stage'), 92);
let STOPS = [];
let REVEAL = [];

function measure() {
  const kids = [...$('body').children];
  const box = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  // сколько времени на содержание: от 0.16 до 0.80, остальное —
  // вступление и концовка
  const from = 0.16, until = 0.80;
  const step = (until - from) / Math.max(1, kids.length);

  STOPS = [];
  REVEAL = kids.map((node, i) => from + i * step);

  kids.forEach((node, i) => {
    const r = node.getBoundingClientRect();
    const at = REVEAL[i];
    if (S.type === 'chat') {
      // персонаж перескакивает на ту сторону, с которой пришло сообщение
      const meSide = S.items[i] && S.items[i].me;
      // за правый край экрана не выпускаем: там кнопки TikTok
      const x = Math.min(860, Math.max(66, meSide ? r.right + 60 : r.left - 42));
      STOPS.push({ at, x, y: box(r).y });
    } else if (S.type === 'works' || S.type === 'punch') {
      STOPS.push({ at, x: box(r).x, y: S.type === 'works' ? r.top + 120 : box(r).y });
    } else if (S.type === 'versus') {
      STOPS.push({ at, x: r.left - 42, y: r.top + 70 });
    } else {
      // по свободной полосе слева, как по ступенькам: строка не
      // закрывается персонажем, он именно сбивает её на место
      STOPS.push({ at, x: r.left - 42, y: box(r).y });
    }
  });

  // финал: приземляется на плашку с контактом и вырастает в неё
  const plate = $('end').getBoundingClientRect();
  STOPS.push({ at: 0.86, x: plate.left + 62, y: plate.top + plate.height / 2 });
  window.PLATE = plate;
}

/* ---------- движение ---------- */

/** Хук читается с первого кадра: только лёгкий наезд. */
function hook(t) {
  const p = outCubic(seg(t, 0, 0.05));
  $('hook').style.transformOrigin = 'left top';
  $('hook').style.transform = 'scale(' + lerp(1.04, 1, p).toFixed(4) + ')';
  const sub = $('sub');
  if (sub) {
    const s = outCubic(seg(t, 0.05, 0.12));
    sub.style.opacity = s.toFixed(3);
    sub.style.transform = 'translateY(' + px(lerp(16, 0, s)) + ')';
  }
}

function run(t) {
  hook(t);
  const kids = [...$('body').children];

  // содержимое появляется в момент приземления, а не по своему графику
  kids.forEach((node, i) => {
    const at = REVEAL[i];
    if (S.type === 'works' || S.type === 'punch') {
      // здесь блоки сменяют друг друга, а не копятся
      const next = REVEAL[i + 1] != null ? REVEAL[i + 1] : 1.02;
      const inP = outBack(seg(t, at, at + 0.06));
      const outP = i < kids.length - 1 ? outCubic(seg(t, next - 0.03, next)) : 0;
      node.style.position = 'absolute';
      node.style.left = '0';
      node.style.right = '0';
      node.style.opacity = clamp(seg(t, at, at + 0.04) - outP).toFixed(3);
      node.style.transform = 'translateY(' + px(lerp(40, 0, inP) - 40 * outP) + ')';
    } else {
      const p = outBack(seg(t, at, at + 0.09));
      node.style.opacity = clamp(seg(t, at, at + 0.045)).toFixed(3);
      node.style.transform = 'translateX(' + px(lerp(-40, 0, p)) + ') scale(' + lerp(0.95, 1, p).toFixed(3) + ')';

    }
  });

  const w = walk(t, STOPS);

  // в сравнении персонаж мотает головой у неудачной колонки
  let rot = 0;
  if (S.type === 'versus' && t > STOPS[0].at && t < STOPS[1].at) {
    rot = Math.sin((t - STOPS[0].at) * 190) * 9;
  }

  // концовка: Крапка вырастает в плашку — они одного цвета, и это
  // читается как «персонаж стал призывом», а не как две разные штуки
  const grow = inOutCubic(seg(t, 0.86, 0.94));
  const plate = window.PLATE;
  const scaleX = lerp(1, plate.width / dot.size, grow);
  const scaleY = lerp(1, plate.height / dot.size, grow);

  dot.node.style.transformOrigin = grow > 0 ? 'left center' : 'center center';
  dot.place(w.pos, {
    squash: w.squash,
    stretch: w.stretch,
    look: w.look,
    rot,
    blink: Dot.blink(t),
    // на плашке глаза не нужны — персонаж перестаёт быть персонажем
    // и становится кнопкой
    eyes: 1 - seg(t, 0.86, 0.90)
  });
  if (grow > 0) {
    dot.node.style.transform = `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
    // Скругление уходит в ноль вместе с ростом. Иначе радиус тоже
    // растягивается, края становятся овальными — и в момент подмены
    // на прямоугольную плашку это щёлкает.
    dot.node.style.borderRadius = px(lerp(6, 0, grow));
    dot.node.style.left = px(plate.left);
    dot.node.style.top = px(plate.top + plate.height / 2 - dot.size / 2);
  }
  // Подмена мгновенная, а не через прозрачность: к этому моменту
  // выросшая Крапка и плашка — один и тот же кислотный прямоугольник
  // тех же размеров, и перехода не видно. Плавное перекрытие, наоборот,
  // давало светлую полосу поперёк текста.
  const swapped = t >= 0.945;
  dot.node.style.opacity = swapped ? '0' : '1';
  $('end').style.opacity = swapped ? '1' : '0';
}

build();
measure();
window.setT = run;
run(0);
