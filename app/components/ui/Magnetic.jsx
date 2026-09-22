/**
 * Магнитная кнопка: тянется к курсору и отпружинивает обратно.
 *
 * Сдвиг маленький — четверть расстояния до курсора и не больше
 * десяти пикселей. Заметный магнит превращается в аттракцион, а
 * здесь он должен только намекнуть, что элемент живой.
 *
 * На тач-экранах не включается: там нет курсора, к которому
 * тянуться, а обработчик движения только жрёт батарею.
 */
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

export function Magnetic({ children, strength = 0.25, max = 10, className }) {
  const ref = useRef(null);
  const still = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 18, mass: 0.6 });
  const y = useSpring(my, { stiffness: 260, damping: 18, mass: 0.6 });

  const clamp = v => Math.max(-max, Math.min(max, v));

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x: still ? 0 : x, y: still ? 0 : y, display: 'inline-block' }}
      onPointerMove={e => {
        if (still || e.pointerType === 'touch') return;
        const r = ref.current.getBoundingClientRect();
        mx.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
        my.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      {children}
    </motion.span>
  );
}

export default Magnetic;
