/**
 * Главная. Самое короткое описание того, что мы делаем, и дальше
 * по убыванию: сначала то, что можно открыть и потрогать, потом
 * цены, потом как это устроено.
 */
import { useI18n } from '../lib/i18n.jsx';
import { Hero } from '../components/Hero.jsx';
import { Cases } from '../components/Cases.jsx';
import { Prices } from '../components/Prices.jsx';
import { Steps } from '../components/Steps.jsx';
import { Work } from '../components/Work.jsx';
import { Stack } from '../components/Stack.jsx';
import { Faq } from '../components/Faq.jsx';
import { LeadForm } from '../components/LeadForm.jsx';

export function Home() {
  const { t } = useI18n();
  const creed = [1, 2, 3].map(n => ({ title: t(`studio.${n}.t`), desc: t(`studio.${n}.d`) }));

  return (
    <>
      <Hero
        kicker={t('hero.status')}
        title={[t('hero.title.1'), t('hero.title.2'), t('hero.title.3')]}
        lead={t('hero.lead')}
        cta={t('hero.cta')}
        figures={t('hero.figures')}
      />
      <Cases />
      <Prices />
      <Steps />
      <Work />
      <Stack />
      <Steps
        id="studio"
        items={creed}
        kicker={t('studio.kicker')}
        title={t('studio.title')}
        numbered={false}
        sunken
      />
      <Faq />
      <LeadForm />
    </>
  );
}

export default Home;
