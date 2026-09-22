/**
 * Число, которое досчитывает до своего значения.
 *
 * Считаем пружиной, а не линейно: цифры замедляются к концу, и
 * последнее значение не выскакивает рывком. Малые числа при этом
 * не ползут — пружина сама делает короткий путь быстрым.
 */
import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion, animate } from 'motion/react';

export function CountUp({ to = 0, className }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const still = useReducedMotion();
  const [shown, setShown] = useState(still ? to : 0);

  useEffect(() => {
    if (!seen) return;
    if (still) { setShown(to); return; }
    const run = animate(0, to, {
      duration: Math.min(1.4, 0.4 + to / 60),
      ease: [0.22, 1, 0.36, 1],
      onUpdate: v => setShown(Math.round(v))
    });
    return () => run.stop();
  }, [seen, still, to]);

  return <b ref={ref} className={className}>{shown}</b>;
}

export default CountUp;
