/**
 * Живые кейсы: не картинки, а рабочие страницы.
 *
 * Снимок внутри рамки едет чуть медленнее самой карточки при
 * прокрутке — этого почти не замечаешь, но именно из таких мелочей
 * складывается ощущение глубины.
 *
 * Карточка слегка наклоняется к курсору. Наклон маленький нарочно:
 * заметный поворот превращает премиальное в ярмарочное.
 */
import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';
import { Section, SectionHead } from './ui/Section.jsx';
import { Reveal, step, SPRING_SOFT } from './ui/Reveal.jsx';
import { PROJECTS } from '../lib/content.js';

function CaseCard({ project, index }) {
  const { lang, t } = useI18n();
  const copy = project[lang] || project.uk;
  const base = project.shot.replace(/\.jpg$/, '');
  const first = index === 0;

  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const shotY = useTransform(scrollYProgress, [0, 1], ['-3%', '3%']);

  return (
    <Reveal as="li" delay={step(index)}>
      <motion.a
        ref={ref}
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        onPointerMove={e => {
          const box = e.currentTarget;
          const r = box.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          setTilt({ x, y });
          // Пятно света держим на css-переменных, а не на состоянии:
          // перерисовывать React на каждое движение мыши дорого, а
          // градиент браузер пересчитает сам.
          box.style.setProperty('--mx', `${e.clientX - r.left}px`);
          box.style.setProperty('--my', `${e.clientY - r.top}px`);
          box.style.setProperty('--glow', '1');
        }}
        onPointerLeave={e => {
          setTilt({ x: 0, y: 0 });
          e.currentTarget.style.setProperty('--glow', '0');
        }}
        animate={{ rotateX: -tilt.y * 4, rotateY: tilt.x * 4, y: tilt.x || tilt.y ? -4 : 0 }}
        transition={SPRING_SOFT}
        style={{ transformPerspective: 900 }}
        className="spotlight glass-plate group block h-full rounded-2xl p-4 pb-6 transition-colors duration-300 hover:bg-glass-2 hover:border-rule"
      >
        <span className="block overflow-hidden rounded-xl border border-rule-soft bg-ink-3">
          <picture>
            <source srcSet={`${base}.avif`} type="image/avif" />
            <source srcSet={`${base}.webp`} type="image/webp" />
            <motion.img
              style={{ y: shotY }}
              src={project.shot}
              alt={copy.name}
              width="960"
              height="600"
              decoding="async"
              loading={first ? 'eager' : 'lazy'}
              fetchPriority={first ? 'high' : undefined}
              className="aspect-[8/5] w-full scale-[1.06] object-cover"
            />
          </picture>
        </span>

        <h3 className="mt-6 font-display text-[1.12rem] font-semibold tracking-[-0.03em] transition-colors group-hover:text-acid">
          {copy.name}
        </h3>

        <span className="mt-3 flex flex-wrap gap-2">
          {(copy.tags || []).slice(0, 3).map(tag => (
            <span key={tag} className="rounded-full border border-rule-soft px-2.5 py-[3px] text-[0.72rem] text-faint">
              {tag}
            </span>
          ))}
        </span>

        <span className="mt-4 flex items-center gap-2 border-t border-rule-soft pt-4 text-[0.85rem] text-muted transition-colors group-hover:text-paper">
          {t('cases.open')}<span aria-hidden="true">↗</span>
        </span>
      </motion.a>
    </Reveal>
  );
}

export function Cases({ items = PROJECTS }) {
  const { t } = useI18n();
  const shown = items.filter(p => p.shot && p.link);
  if (!shown.length) return null;

  return (
    <Section id="cases">
      <SectionHead kicker={t('cases.kicker')} title={t('cases.title')} lead={t('cases.lead')} />
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((project, i) => <CaseCard key={project.link} project={project} index={i} />)}
      </ul>
    </Section>
  );
}

export default Cases;
