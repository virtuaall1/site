/**
 * Страница, которой нет.
 *
 * Обычная 404 — тупик: человек пришёл по ссылке, которая где-то
 * сломалась, и упирается в пустоту. Поэтому здесь не только
 * извинение, но и выходы: разделы сайта и кнопка написать.
 *
 * Номер набран крупно и кислотным нарочно — это единственное
 * место, где такой акцент уместен: он не продаёт, а объясняет,
 * что произошло.
 */
import { useI18n } from '../lib/i18n.jsx';
import { Section } from '../components/ui/Section.jsx';
import { Kicker } from '../components/ui/Kicker.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Magnetic } from '../components/ui/Magnetic.jsx';
import { ROUTES } from '../lib/routes.js';

export function NotFound() {
  const { t } = useI18n();
  const pages = ROUTES.filter(r => r.nav);

  return (
    <Section id="notfound">
      <Kicker className="mb-4">404</Kicker>

      <h1 className="max-w-[20ch] font-display text-[clamp(2.4rem,7vw,5.4rem)] font-extrabold leading-[0.96] tracking-[-0.05em]">
        {t('nf.title')}
      </h1>

      <p className="mt-6 max-w-[54ch] text-[1.02rem] text-muted">{t('nf.lead')}</p>

      <div className="mt-12 flex flex-wrap gap-3">
        <Magnetic><Button as="a" href="/" variant="solid" size="lg">{t('nf.home')}</Button></Magnetic>
        <Magnetic><Button as="a" href="/#contact" size="lg">{t('hero.cta')}</Button></Magnetic>
      </div>

      <nav aria-label={t('nf.where')} className="mt-16 border-t border-rule-soft pt-8">
        <p className="mb-4 text-[0.74rem] uppercase tracking-[0.1em] text-faint">{t('nf.where')}</p>
        <ul className="flex flex-wrap gap-2">
          {pages.map(page => (
            <li key={page.path}>
              <a
                href={page.path}
                className="glass-plate inline-flex rounded-full px-4 py-2 text-[0.88rem] text-muted
                           transition-colors hover:border-rule hover:text-acid"
              >
                {t(page.nav)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </Section>
  );
}

export default NotFound;
