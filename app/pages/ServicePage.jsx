/**
 * Страница одной группы услуг: боты, сайты, бекенд.
 *
 * Все три собраны одним компонентом — отличаются только списком
 * услуг и текстом первого экрана. Три копии одного и того же
 * разошлись бы в первый же месяц.
 *
 * Кейсы показываем те, что относятся к теме: человек пришёл по
 * запросу «бот під ключ», и смотреть он будет на ботов.
 */
import { useI18n } from '../lib/i18n.jsx';
import { Hero } from '../components/Hero.jsx';
import { Cases } from '../components/Cases.jsx';
import { Prices } from '../components/Prices.jsx';
import { Steps } from '../components/Steps.jsx';
import { Faq } from '../components/Faq.jsx';
import { LeadForm } from '../components/LeadForm.jsx';
import { PROJECTS } from '../lib/content.js';

export function ServicePage({ name, services, cases }) {
  const { t } = useI18n();
  /* Показываем только те кейсы, что относятся к теме страницы.
     `cases: null` — значит подходящих демо пока нет, и раздел не
     появляется вовсе.

     Соблазн показать все четыре везде большой, но на странице про
     сайты четыре демо телеграм-ботов — это обещание не того, за
     чем человек пришёл. Появится демо сайта — добавится сюда. */
  const shown = cases
    ? PROJECTS.filter(p => cases.some(part => (p.link || '').includes(part)))
    : [];

  return (
    <>
      <Hero
        kicker={t(`page.${name}.kicker`)}
        title={t(`page.${name}.title`)}
        lead={t(`page.${name}.lead`)}
        cta={t('hero.cta')}
      />
      {shown.length > 0 && <Cases items={shown} />}
      <Prices only={services} />
      <Steps />
      <Faq />
      <LeadForm />
    </>
  );
}

export default ServicePage;
