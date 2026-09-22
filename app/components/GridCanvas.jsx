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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    function frame(now) {
      raf = null;
      ctx.clearRect(0, 0, w, h);
      const sec = now / 1000;

      // старые волны выбрасываем, чтобы массив не рос
      for (let i = waves.length - 1; i >= 0; i--) {
        if (sec - waves[i].t > WAVE_LIFE) waves.splice(i, 1);
      }

      for (const d of dots) {
        const dx = d.ox - pointer.x;
        const dy = d.oy - pointer.y;
        const dist = Math.hypot(dx, dy);
        const near = dist < RADIUS ? 1 - dist / RADIUS : 0;

        let tx = d.ox + (dx / (dist || 1)) * near * PUSH;
        let ty = d.oy + (dy / (dist || 1)) * near * PUSH;

        let wave = 0;
        for (const wv of waves) {
          const age = sec - wv.t;
          const wdx = d.ox - wv.x;
          const wdy = d.oy - wv.y;
          const wdist = Math.hypot(wdx, wdy) || 1;
          const delta = Math.abs(wdist - age * WAVE_SPEED);
          if (delta > WAVE_BAND) continue;

          const front = 1 - delta / WAVE_BAND;
          const fade = 1 - age / WAVE_LIFE;
          const force = front * fade * fade;
          wave += force;
          tx += (wdx / wdist) * force * 22;
          ty += (wdy / wdist) * force * 22;
        }

        // к новому месту подтягиваемся, а не прыгаем: иначе сетка
        // дёргается при каждом движении мыши
        d.x += (tx - d.x) * 0.14;
        d.y += (ty - d.y) * 0.14;

        const energy = Math.min(1, near + wave);
        const size = 1 + energy * 2.4;
        const alpha = 0.13 + energy * 0.72;
        ctx.fillStyle = energy > 0.4
          ? `rgba(216, 255, 62, ${alpha})`
          : `rgba(242, 239, 232, ${alpha})`;
        ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
      }

      // символы всплывают и гаснут
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        const age = sec - s.t;
        if (age > 1.1) { sparks.splice(i, 1); continue; }
        s.x += s.vx;
        s.y += s.vy;
        s.vy -= 0.03;
        ctx.fillStyle = `rgba(216, 255, 62, ${(1 - age / 1.1) * 0.75})`;
        ctx.fillText(s.char, s.x, s.y);
      }

      start();
    }

    /* Держим ровно один цикл отрисовки: браузер может придержать
       кадр на скрытой вкладке и отдать его уже после того, как мы
       запустили новый — так набегает второй цикл. */
    function start() { if (raf === null) raf = requestAnimationFrame(frame); }
    function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

    function onMove(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
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

    const onDown = e => waves.push({ x: e.clientX, y: e.clientY, t: performance.now() / 1000 });
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };
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
