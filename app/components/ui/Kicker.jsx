/**
 * Надзаголовок — маленькая строка над заголовком секции.
 *
 * Квадрат перед текстом кислотный: это одна из тех двух-трёх точек
 * на экран, где цвету вообще позволено появиться.
 */
import { cn } from '../../lib/cn.js';

export function Kicker({ children, className }) {
  return (
    <p className={cn('inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-faint', className)}>
      <span aria-hidden="true" className="size-1.5 bg-acid" />
      {children}
    </p>
  );
}

export default Kicker;
