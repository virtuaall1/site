/**
 * Волосяная линия, которая прочерчивается слева направо, когда
 * доезжает до экрана.
 *
 * Зачем она вообще нужна: длинная страница из одинаковых по
 * плотности секций читается как один бесконечный свиток. Линия,
 * которая рисуется на глазах, ставит точку отсчёта — «здесь
 * закончилась шапка и началось содержимое». Это не украшение, а
 * знак препинания.
 *
 * Двигаем scaleX, а не width. Ширина заставляет браузер пересчитать
 * раскладку каждый кадр — а значит, и всё, что ниже по странице.
 * Масштаб живёт на композиторе и не стоит почти ничего.
 *
 * Кривая, а не пружина: линия не предмет, у неё нет массы, и
 * отыгрывать в конце ей нечем.
 */
import { motion } from 'motion/react';
import { cn } from '../../lib/cn.js';

export function Rule({ className, delay = 0, duration = 0.9 }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn('block h-px origin-left bg-rule-soft', className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration, ease: [0.22, 1, 0.36, 1], delay }}
    />
  );
}

export default Rule;
