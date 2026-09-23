/**
 * Значение, которое перекатывается при смене.
 *
 * Нужно там, где число меняется не потому, что человек перешёл на
 * другую страницу, а потому, что он сам что-то переключил: валюту,
 * язык. Если просто подменить текст, глаз не успевает заметить
 * подмену и человек не уверен, сработала ли кнопка. Старое значение
 * уезжает вниз, новое приходит сверху — и переключатель отвечает.
 *
 * Оба значения лежат в одной ячейке сетки, поэтому наезжают друг на
 * друга, а не толкаются: строка не меняет ширину и ничего вокруг не
 * дёргается.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING_SNAP } from './Reveal.jsx';
import { cn } from '../../lib/cn.js';

export function Roll({ value, className }) {
  const still = useReducedMotion();

  // «Меньше движения» — просто текст: перекат здесь не несёт
  // смысла, которого не было бы в самом значении.
  if (still) return <span className={className}>{value}</span>;

  return (
    <span className={cn('inline-grid overflow-hidden', className)}>
      <AnimatePresence initial={false}>
        <motion.span
          key={String(value)}
          initial={{ y: '-110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '110%', opacity: 0 }}
          transition={SPRING_SNAP}
          className="col-start-1 row-start-1 whitespace-nowrap"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default Roll;
