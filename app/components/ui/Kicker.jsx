/**
 * Надзаголовок — маленькая строка над заголовком секции.
 *
 * Квадрат перед текстом кислотный: это одна из тех двух-трёх точек
 * на экран, где цвету вообще позволено появиться.
 */
import { motion } from 'motion/react';
import { cn } from '../../lib/cn.js';

export function Kicker({ children, className }) {
  return (
    <p className={cn('inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-faint', className)}>
      <motion.span
        aria-hidden="true"
        className="size-1.5 bg-acid"
        initial={{ scale: 0, rotate: -45 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      />
      {children}
    </p>
  );
}

export default Kicker;
