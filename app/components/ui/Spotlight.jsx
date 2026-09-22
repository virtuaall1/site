/**
 * Пятно света под курсором на стеклянной плите.
 *
 * Держится на двух css-переменных, которые обновляет обработчик:
 * сам градиент рисует браузер. Так на движение мыши не приходится
 * ни одной перерисовки React — иначе карточка с тяжёлым
 * содержимым заметно тормозит.
 */
import { useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../../lib/cn.js';

export function Spotlight({ as: As = 'div', className, children, ...rest }) {
  const ref = useRef(null);
  const still = useReducedMotion();

  return (
    <As
      ref={ref}
      onPointerMove={e => {
        if (still || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
        ref.current.style.setProperty('--my', `${e.clientY - r.top}px`);
        ref.current.style.setProperty('--glow', '1');
      }}
      onPointerLeave={() => ref.current && ref.current.style.setProperty('--glow', '0')}
      className={cn('spotlight', className)}
      {...rest}
    >
      {children}
    </As>
  );
}

export default Spotlight;
