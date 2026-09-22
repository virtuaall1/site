/**
 * Чем пишем.
 *
 * Список не выдуман: это то, с чем мы работаем каждый день.
 * Ничего «для солидности» сюда не дописываем.
 */
import { useI18n } from '../lib/i18n.jsx';
import { Section, SectionHead } from './ui/Section.jsx';
import { Reveal } from './ui/Reveal.jsx';
import { EXTRA_STACK } from '../lib/content.js';

export function Stack({ id = 'stack', items = EXTRA_STACK }) {
  const { t } = useI18n();
  return (
    <Section id={id}>
      <SectionHead kicker={t('stack.kicker')} title={t('stack.title')} lead={t('stack.lead')} />
      <Reveal>
        <ul className="flex flex-wrap gap-2">
          {items.map(name => (
            <li key={name}
                className="glass-plate rounded-full px-3.5 py-[7px] text-[0.82rem] text-muted
                           transition-colors hover:border-rule hover:text-acid">
              {name}
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}

export default Stack;
