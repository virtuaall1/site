/**
 * Полоса, которая пробегает по экрану при смене языка.
 *
 * Нужна не для красоты: переход между двумя кадрами страницы сам
 * по себе бесшумный, и глаз не понимает, что именно произошло.
 * Полоса даёт событию направление — слева направо, как читается
 * текст, — и мозг достраивает «строки перебрались».
 *
 * Рисуется только во время перехода и ничего не перекрывает:
 * сквозь неё проходят и клики, и наведение.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';

export function LangSweep() {
  const { swapping } = useI18n();

  return (
    <AnimatePresence>
      {swapping && (
        <motion.div
          key="sweep"
          aria-hidden="true"
          className="pointer-events-none fixed inset-y-0 left-0 z-[90] w-[26vw]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(216,255,62,0.03) 58%, rgba(216,255,62,0.3))',
            maskImage: 'linear-gradient(90deg, transparent, #000 40%, #000)'
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '240%' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </AnimatePresence>
  );
}

export default LangSweep;
