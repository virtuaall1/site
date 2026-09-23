/**
 * Фоновая сетка точек.
 *
 * Это подпись сайта: точки разбегаются от курсора, клик пускает по
 * ним ударную волну, а за курсором тянется след из символов кода.
 *
 * Почему канвас, а не DOM: точек около полутора тысяч, и каждая
 * шевелится каждый кадр. Полторы тысячи элементов с трансформами
 * положили бы прокрутку на любом ноутбуке.
 *
 * На телефоне сетка не запускается вовсе: курсора там нет, а
 * покадровая отрисовка фона сажает батарею. При системной
 * настройке «меньше движения» — тоже.
 */
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

const GAP = 34;            // шаг сетки, как на прежнем сайте
const RADIUS = 150;        // на каком расстоянии курсор толкает точку
const PUSH = 16;           // насколько толкает
const WAVE_SPEED = 620;    // пикселей в секунду
const WAVE_LIFE = 1.7;     // секунд до затухания
const WAVE_BAND = 70;      // толщина фронта
const GLYPHS = ['0', '1', '{', '}', '<', '>', '/', ';', '=', '$', '[', ']'];

export function GridCanvas() {
  const ref = useRef(null);
  const still = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || still) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let w = 0, h = 0, dots = [], raf = null;
    const pointer = { x: -9999, y: -9999 };
    const waves = [];
    const sparks = [];
    let lastSpark = 0;
    let lastAt = { x: 0, y: 0 };

    function build() {
      /* Ровно один пиксель на пиксель, даже на экранах с удвоенной
         плотностью. Точка здесь размером в пиксель и полупрозрачная:
         от DPR 2 она не становится красивее, а очищать и заливать
         приходится вчетверо больше — 5.2 миллиона пикселей вместо
         1.3 на обычном ноутбуке. Это и была главная цена кадра. */
      const dpr = 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      for (let x = 0; x <= w + GAP; x += GAP) {
        for (let y = 0; y <= h + GAP; y += GAP) dots.push({ x, y, ox: x, oy: y });
      }
    }

    /* Цвета заранее: раньше на каждую точку собиралась строка
       вида rgba(...), и это тысяча лишних строк в кадре. Теперь их
       шестнадцать на всю жизнь страницы, по ступеням яркости. */
    const STEPS = 16;
    const CALM = [];
    const HOT = [];
    for (let i = 0; i < STEPS; i++) {
      const a = (i + 1) / STEPS;
      CALM.push(`rgba(242, 239, 232, ${(a * 0.85).toFixed(3)})`);
      HOT.push(`rgba(216, 255, 62, ${(a * 0.85).toFixed(3)})`);
    }
    const RADIUS2 = RADIUS * RADIUS;
    /* Заводим один раз: массив, создаваемый в каждом кадре, — это
       шестьдесят лишних сборок мусора в секунду. */
    const lit = [];

    /* Сетка рисуется не чаще шестидесяти раз в секунду.
     
       На экране со 120 Гц кадр длится 8.3 мс, и всё, что успел
       занять фон, у содержимого отнято. Разницу между сеткой на 60
       и на 120 не видит никто: точки едут медленно и полупрозрачны.
       А вот прокрутка и анимации разницу чувствуют — им этот кадр
       нужен целиком.
     
       Пропущенный кадр не стоит почти ничего: выходим до очистки и
       до цикла по точкам, то есть до всей работы. */
    const DRAW_EVERY = 15;   // мс
    let lastDraw = 0;

    function frame(now) {
      raf = null;

      if (now - lastDraw < DRAW_EVERY) { start(); return; }
      lastDraw = now;

      ctx.clearRect(0, 0, w, h);
      const sec = now / 1000;

      // старые волны выбрасываем, чтобы массив не рос
      for (let i = waves.length - 1; i >= 0; i--) {
        if (sec - waves[i].t > WAVE_LIFE) waves.splice(i, 1);
      }

      const quiet = waves.length === 0 && pointer.x < -9000;
      let moving = false;

      /* Спокойные точки рисуем одной заливкой на всех: смена
         fillStyle — операция дорогая, и тысяча смен в кадре
         обходится дороже самой отрисовки. */
      ctx.fillStyle = CALM[1];
      ctx.beginPath();

      for (const d of dots) {
        let tx = d.ox;
        let ty = d.oy;
        let energy = 0;

        if (!quiet) {
          const dx = d.ox - pointer.x;
          const dy = d.oy - pointer.y;
          const dist2 = dx * dx + dy * dy;

          if (dist2 < RADIUS2) {
            const dist = Math.sqrt(dist2) || 1;
            const near = 1 - dist / RADIUS;
            energy = near;
            tx += (dx / dist) * near * PUSH;
            ty += (dy / dist) * near * PUSH;
          }

          for (const wv of waves) {
            const age = sec - wv.t;
            const wdx = d.ox - wv.x;
            const wdy = d.oy - wv.y;
            const wdist = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
            const delta = Math.abs(wdist - age * WAVE_SPEED);
            if (delta > WAVE_BAND) continue;

            const front = 1 - delta / WAVE_BAND;
            const fade = 1 - age / WAVE_LIFE;
            const force = front * fade * fade;
            energy += force;
            tx += (wdx / wdist) * force * 22;
            ty += (wdy / wdist) * force * 22;
          }
        }

        /* К новому месту подтягиваемся, а не прыгаем. Но у такого
           подтягивания длинный хвост: каждый кадр остаётся 86%
           пути, и последние доли пикселя ползут ещё секунды полторы
           после того, как глазу уже всё равно. Всё это время цикл
           считает себя занятым и жжёт кадры. Поэтому в конце просто
           ставим точку на место. */
        const ndx = tx - d.x;
        const ndy = ty - d.y;
        if (ndx * ndx + ndy * ndy > 0.02) {
          moving = true;
          d.x += ndx * 0.14;
          d.y += ndy * 0.14;
        } else {
          d.x = tx;
          d.y = ty;
        }

        if (energy < 0.02) {
          // в общую заливку, без своего цвета
          ctx.rect(d.x - 0.5, d.y - 0.5, 1, 1);
          continue;
        }

        /* Яркие откладываем: рисовать их прямо здесь нельзя —
           beginPath стёр бы всё, что уже накопилось в общем пути. */
        lit.push(d.x, d.y, energy > 1 ? 1 : energy);
      }

      ctx.fill();                 // все спокойные точки одной заливкой

      for (let i = 0; i < lit.length; i += 3) {
        const e = lit[i + 2];
        const size = 1 + e * 2.4;
        const bucket = (e * (STEPS - 1)) | 0;
        ctx.fillStyle = e > 0.4 ? HOT[bucket] : CALM[bucket];
        ctx.fillRect(lit[i] - size / 2, lit[i + 1] - size / 2, size, size);
      }
      lit.length = 0;

      // символы всплывают и гаснут
      if (sparks.length) {
        ctx.font = '11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          const age = sec - s.t;
          if (age > 1.1) { sparks.splice(i, 1); continue; }
          s.x += s.vx;
          s.y += s.vy;
          s.vy -= 0.03;
          ctx.fillStyle = `rgba(216, 255, 62, ${((1 - age / 1.1) * 0.75).toFixed(2)})`;
          ctx.fillText(s.char, s.x, s.y);
        }
        moving = true;
      }

      /* Ничего не движется — останавливаем цикл совсем.
       
         Здесь была ошибка, из-за которой вся работа выше шла
         впустую. Условие звучало «продолжай, пока что-то движется
         ИЛИ курсор на странице» — а курсор на странице почти
         всегда. Значит цикл не останавливался никогда: человек
         читал текст или прокручивал страницу, а сетка молча
         перерисовывала весь экран шестьдесят раз в секунду ради
         точек, которые давно стоят на месте.
       
         Правильный вопрос — не «где курсор», а «изменилось ли
         что-нибудь». Точки подтягиваются к новому месту и
         останавливаются; пока стоят они, волны отгремели и символы
         погасли — рисовать нечего, и последний кадр просто
         остаётся на холсте. */
      if (moving || waves.length || sparks.length) start();
      else raf = null;
    }

    /* Держим ровно один цикл отрисовки: браузер может придержать
       кадр на скрытой вкладке и отдать его уже после того, как мы
       запустили новый — так набегает второй цикл. */
    function start() { if (raf === null) raf = requestAnimationFrame(frame); }
    function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

    function onMove(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      start();                      // цикл мог остановиться — будим
      const now = performance.now();
      const moved = Math.hypot(e.clientX - lastAt.x, e.clientY - lastAt.y);
      if (now - lastSpark > 45 && moved > 16 && sparks.length < 26) {
        lastSpark = now;
        lastAt = { x: e.clientX, y: e.clientY };
        sparks.push({
          char: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          x: e.clientX + (Math.random() - 0.5) * 14,
          y: e.clientY + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -0.4 - Math.random() * 0.5,
          t: performance.now() / 1000
        });
      }
    }

    const onDown = e => {
      waves.push({ x: e.clientX, y: e.clientY, t: performance.now() / 1000 });
      start();
    };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; start(); };
    const onVisible = () => (document.hidden ? stop() : start());

    build();
    start();
    window.addEventListener('resize', build);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stop();
      window.removeEventListener('resize', build);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [still]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-55"
    />
  );
}

export default GridCanvas;
