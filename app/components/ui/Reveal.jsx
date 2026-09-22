/**
 * Появление блока, когда он доезжает до экрана.
 *
 * Пружина, а не кривая с длительностью. Кривая одинаково долго
 * едет и на 20 пикселей, и на 200; пружина считает время от
 * расстояния и жёсткости, поэтому мелкое движение выходит быстрым,
 * а крупное — весомым. Именно это читается как «дорого».
 *
 * `whileInView` с `once` — блок проявляется один раз: повторное
 * появление при возврате к нему выглядит как сбой, а не как приём.
 *
 * Motion сам уважает системную настройку «меньше движения»: там
 * блок просто появляется на месте.
 */
import { motion } from 'motion/react';

export const SPRING = { type: 'spring', stiffness: 220, damping: 30, mass: 0.9 };
export const SPRING_SOFT = { type: 'spring', stiffness: 130, damping: 24, mass: 1 };
export const SPRING_SNAP = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };

export function Reveal({ as = 'div', delay = 0, y = 26, className, children, ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ ...SPRING, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Лесенка: каждый следующий элемент списка трогается чуть позже.
 * Дальше шестого не считаем — низ длинного списка иначе ждёт своей
 * очереди уже заметно долго.
 */
export const step = i => Math.min(i, 6) * 0.06;

export default Reveal;
