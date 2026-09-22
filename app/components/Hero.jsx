/**
 * Первый экран.
 *
 * Строки заголовка выезжают из-под маски одна за другой: у каждой
 * своя обёртка с overflow-hidden, и движется внутренность, а не
 * сама строка. Так буквы «появляются из-за края», а не выплывают
 * из пустоты.
 *
 * При прокрутке экран медленно отпускает страницу — это не
 * параллакс ради параллакса, а способ показать, что ниже ещё есть
 * содержимое.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';
import { Button } from './ui/Button.jsx';
import { Magnetic } from './ui/Magnetic.jsx';
import { SPRING, SPRING_SOFT } from './ui/Reveal.jsx';
import { Scramble } from './ui/Scramble.jsx';
import { LINKS } from '../lib/content.js';

export function Hero({ title, lead, cta, kicker, figures = [] }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.35]);

  return (
    <motion.section ref={ref} style={{ y, opacity }}
      className="mx-auto max-w-page px-5 pb-32 pt-[clamp(72px,12vh,140px)] sm:px-8 lg:px-[88px]">
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.1 }}
        className="glass-plate inline-flex items-center gap-2 rounded-full py-[7px] pl-2.5 pr-3.5 text-[0.8rem] text-muted"
      >
        <span aria-hidden="true" className="relative size-[7px] rounded-full bg-acid">
          <span className="absolute inset-0 animate-ping rounded-full bg-acid opacity-60" />
        </span>
        {kicker}
      </motion.p>

      <h1 className="mt-8 font-display text-[clamp(2.6rem,8vw,6.6rem)] font-extrabold leading-[0.95] tracking-[-0.055em]">
        {title.map((line, i) => (
          <span key={i} className="block overflow-hidden">
            <motion.span
              className={i === title.length - 1 ? 'block text-acid' : 'block'}
              initial={{ y: '115%' }}
              animate={{ y: '0%' }}
              transition={{ ...SPRING_SOFT, delay: i * 0.075 }}
            >
              <Scramble text={line} />
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.42 }}
        className="mt-16 grid items-end gap-12 border-t border-rule-soft pt-8 md:grid-cols-[minmax(0,1fr)_auto]"
      >
        <p className="max-w-[54ch] text-[1.05rem] text-muted">{lead}</p>
        <div className="flex flex-wrap gap-3">
          <Magnetic><Button as="a" href="/#contact" variant="solid">{cta}</Button></Magnetic>
          <Magnetic>
            <Button as="a" href={LINKS.github} target="_blank" rel="noopener noreferrer">
              {t('hero.cta2')}
            </Button>
          </Magnetic>
        </div>
      </motion.div>

      {/* Подсказка, что ниже ещё есть страница. Линия ездит вниз и
          растворяется — стрелку рисовать не нужно, движение само
          говорит, куда смотреть. */}
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="mt-12 block h-10 w-px overflow-hidden bg-rule"
      >
        <motion.span
          className="block h-3 w-px bg-acid"
          animate={{ y: [-12, 40], opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
        />
      </motion.span>

      {figures.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 flex flex-wrap gap-8 text-[0.8rem] text-faint"
        >
          {figures.map(f => <span key={f}>— {f}</span>)}
        </motion.p>
      )}
    </motion.section>
  );
}

export default Hero;
