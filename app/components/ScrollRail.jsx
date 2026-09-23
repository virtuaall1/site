/**
 * Волосяная линия по левому краю, которая растёт вместе с
 * прокруткой: видно, сколько страницы уже позади.
 *
 * Значение кладём в css-переменную, а не в высоту элемента:
 * градиент пересчитывает браузер, и прокрутка не дёргается от
 * перерисовок React.
 */
import { useEffect, useRef } from 'react';
import { useScroll, useReducedMotion } from 'motion/react';

export function ScrollRail() {
  const ref = useRef(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    if (still) return;
    /* Отдаём долю от нуля до единицы, а не проценты: в css из неё
       получаются и масштаб линии, и сдвиг квадрата — обе величины
       браузер умеет двигать, не трогая раскладку. */
    return scrollYProgress.on('change', v => {
      if (ref.current) ref.current.style.setProperty('--read', v.toFixed(4));
    });
  }, [scrollYProgress, still]);

  if (still) return null;
  return <div ref={ref} aria-hidden="true" className="rail" />;
}

export default ScrollRail;
