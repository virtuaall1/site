/**
 * «Расшифровка» заголовка.
 *
 * Буквы перебирают символы кода и встают на места слева направо.
 * Запускается дважды: когда строка доехала до экрана и когда
 * поменялся текст — то есть при смене языка. Второй случай и
 * делает переключение языка расшифровкой, а не подменой.
 *
 * Четыре вещи, из-за которых это обычно дёргается и которых здесь
 * нет:
 *
 * 1. **Строка не меняет ширину.** Символы кода узкие, буквы
 *    широкие, и если просто подменять текст, заголовок дёргается
 *    каждый кадр, а вместе с ним переезжает половина страницы.
 *    Поэтому настоящий текст остаётся в потоке и держит размер —
 *    он просто прозрачный, — а перебор рисуется поверх.
 * 2. **React в переборе не участвует.** Шестьдесят перерисовок
 *    компонента в секунду ради одной строки — это шестьдесят
 *    сверок дерева на пустом месте. Пишем прямо в узел.
 * 3. **Идём по кадрам браузера, а не по таймеру.** setInterval не
 *    совпадает с кадрами и раз в несколько шагов даёт лишнюю
 *    перерисовку.
 * 4. **Читалке достаётся настоящий текст.** Перебор помечен
 *    aria-hidden: озвучивать «Ж;** $==$$» незачем.
 *
 * При системной настройке «меньше движения» текст просто стоит.
 */
import { useEffect, useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/cn.js';

const GLYPHS = '01{}<>/;=$[]#*';
const STEP = 32;          // мс на один шаг перебора
const PER_CHAR = 2.2;     // сколько шагов живёт одна буква

export function Scramble({ text, as: Tag = 'span', className, ...rest }) {
  const ref = useRef(null);
  const real = useRef(null);
  const noise = useRef(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const still = useReducedMotion();

  useEffect(() => {
    const overlay = noise.current;
    const under = real.current;
    if (!overlay || !under) return;

    const finish = () => {
      overlay.textContent = '';
      overlay.hidden = true;
      under.style.opacity = '';
    };

    if (!seen || still) { finish(); return; }

    const chars = [...text];
    const total = chars.length * PER_CHAR * STEP + 180;
    let started = 0;
    let raf = null;

    const tick = now => {
      if (!started) started = now;
      const passed = now - started;

      if (passed >= total) { finish(); return; }

      const done = passed / STEP / PER_CHAR;
      let out = '';
      for (let i = 0; i < chars.length; i++) {
        out += (chars[i] === ' ' || i < done)
          ? chars[i]
          : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      overlay.textContent = out;
      raf = requestAnimationFrame(tick);
    };

    overlay.hidden = false;
    under.style.opacity = '0';
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      finish();
    };
  }, [seen, still, text]);

  return (
    <Tag ref={ref} className={cn('relative block', className)} {...rest}>
      {/* Настоящий текст: держит размер и достаётся читалке */}
      <span ref={real}>{text}</span>
      {/* Перебор поверх него, в том же месте */}
      <span ref={noise} aria-hidden="true" hidden className="absolute inset-0" />
    </Tag>
  );
}

export default Scramble;
