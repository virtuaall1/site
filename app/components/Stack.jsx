/**
 * Чем пишем.
 *
 * Список не выдуман: это то, с чем мы работаем каждый день.
 * Ничего «для солидности» сюда не дописываем.
 */
import { useI18n } from '../lib/i18n.jsx';
import { Section, SectionHead } from './ui/Section.jsx';
import { Reveal } from './ui/Reveal.jsx';
import { Marquee } from './ui/Marquee.jsx';
import { EXTRA_STACK } from '../lib/content.js';

export function Stack({ id = 'stack', items = EXTRA_STACK }) {
  const { t } = useI18n();
  return (
    <Section id={id}>
      <SectionHead kicker={t('stack.kicker')} title={t('stack.title')} lead={t('stack.lead')} />
      <Reveal>
        <Marquee items={items} />
      </Reveal>
    </Section>
  );
}

export default Stack;
