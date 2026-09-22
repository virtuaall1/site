/**
 * Шаги: и процесс работы, и «три вещи, о которых стоит
 * договориться на берегу». Компонент один — отличается только
 * нумерацией, а это проп, а не вторая копия кода.
 */
import { useI18n } from '../lib/i18n.jsx';
import { Section, SectionHead } from './ui/Section.jsx';
import { Reveal, step } from './ui/Reveal.jsx';
import { PROCESS } from '../lib/content.js';
import { cn } from '../lib/cn.js';

export function Steps({ id = 'process', items, kicker, title, numbered = true, sunken = false }) {
  const { lang, t } = useI18n();
  const list = items || PROCESS.map(s => s[lang] || s.uk);

  return (
    <Section id={id} sunken={sunken}>
      <SectionHead kicker={kicker || t('process.kicker')} title={title || t('process.title')} />
      <ol className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((item, i) => (
          <Reveal as="li" key={item.title} delay={step(i)}>
            <div className="glass-plate group grid h-full content-start gap-4 rounded-2xl px-6 py-8 transition-colors hover:bg-glass-2">
              <span
                aria-hidden="true"
                className={cn(
                  'font-display font-extrabold tracking-[-0.05em] transition-colors',
                  numbered
                    ? 'text-[2.2rem] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.08)] group-hover:text-acid group-hover:[-webkit-text-stroke-color:transparent]'
                    : 'text-[1.1rem] text-acid'
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-[1.02rem] font-semibold tracking-[-0.02em]">{item.title}</h3>
                <p className="mt-2 text-[0.92rem] text-muted">{item.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

export default Steps;
