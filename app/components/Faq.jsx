/**
 * Частые вопросы.
 *
 * Раскрыт может быть любой, в том числе несколько сразу: человек
 * читает не сценарий, а то, что ему нужно, и схлопывать соседний
 * ответ за него незачем.
 */
import { useState } from 'react';
import { useI18n } from '../lib/i18n.jsx';
import { Section, SectionHead } from './ui/Section.jsx';
import { Reveal, step } from './ui/Reveal.jsx';
import { Collapsible, ToggleSign } from './ui/Collapsible.jsx';
import { FAQ } from '../lib/content.js';

export function Faq({ items = FAQ, id = 'faq' }) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(() => new Set());

  const toggle = i => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  return (
    <Section id={id}>
      <SectionHead kicker={t('faq.kicker')} title={t('faq.title')} />
      <div className="max-w-[900px] border-t border-rule-soft">
        {items.map((item, i) => {
          const copy = item[lang] || item.uk;
          const isOpen = open.has(i);
          return (
            <Reveal key={copy.q} delay={step(i)} className="border-b border-rule-soft">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => toggle(i)}
                  className="flex min-h-11 w-full items-center justify-between gap-6 py-6 text-left
                             font-display text-[1.05rem] font-medium tracking-[-0.02em]
                             transition-colors hover:text-acid"
                >
                  {copy.q}
                  <ToggleSign open={isOpen} />
                </button>
              </h3>
              <Collapsible open={isOpen} id={`faq-a-${i}`}>
                <p className="max-w-[74ch] pb-6 text-[0.95rem] text-muted">{copy.a}</p>
              </Collapsible>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export default Faq;
