/**
 * «Расшифровка» заголовка.
 *
 * Буквы перебирают символы кода и встают на места слева направо.
 * Приём фирменный, поэтому вернулся вместе с сеткой точек.
 *
 * Две вещи, из-за которых это обычно выглядит плохо и которых
 * здесь нет:
 *
 *   — пробелы не перебираются, иначе слова слипаются в кашу;
 *   — ширина не скачет: символы взяты из того же начертания, а
 *     заголовок уже отрисован сборкой, поэтому место под него
 *     занято до первого кадра.
 *
 * Срабатывает один раз, когда строка доехала до экрана. При
 * системной настройке «меньше движения» текст просто стоит.
 */
import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

const GLYPHS = '01{}<>/;=$[]#*';
const STEP = 28;          // мс на кадр перебора
const PER_CHAR = 2.2;     // сколько кадров живёт одна буква

export function Scramble({ text, as: Tag = 'span', className, ...rest }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const still = useReducedMotion();
  const [shown, setShown] = useState(text);

  useEffect(() => { setShown(text); }, [text]);

  useEffect(() => {
    if (!seen || still) return;
    let frame = 0;
    const total = Math.ceil(text.length * PER_CHAR) + 6;

    const id = setInterval(() => {
      frame += 1;
      const done = frame / PER_CHAR;
      setShown([...text].map((ch, i) => {
        if (ch === ' ' || i < done) return ch;
        return GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join(''));
      if (frame > total) { clearInterval(id); setShown(text); }
    }, STEP);

    return () => clearInterval(id);
  }, [seen, still, text]);

  return <Tag ref={ref} className={className} {...rest}>{shown}</Tag>;
}

export default Scramble;
