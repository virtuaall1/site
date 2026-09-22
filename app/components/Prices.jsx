/**
 * Услуги и цены.
 *
 * Курс тянем из НБУ — он отдаёт его без ключа и без регистрации.
 * Не ответил — считаем по запасному, тому же, что подставляется в
 * структурированные данные. Цена в долларах округляется до
 * пятёрки: это цена, а не результат деления.
 */
import { useEffect, useState } from 'react';
import { useI18n, FALLBACK_RATE } from '../lib/i18n.jsx';
import { Section, SectionHead } from './ui/Section.jsx';
import { Reveal, step } from './ui/Reveal.jsx';
import { Collapsible, ToggleSign } from './ui/Collapsible.jsx';
import { Mock } from './Mock.jsx';
import { SERVICES, LINKS } from '../lib/content.js';
import { cn } from '../lib/cn.js';

const NBU = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json';

function tgLink(text) {
  return `${LINKS.telegram}?text=${encodeURIComponent(text)}`;
}

function PriceRow({ service, index, openFirst }) {
  const { lang, t, money, currency } = useI18n();
  const copy = service[lang] || service.uk;
  const example = service.example && (service.example[lang] || service.example.uk);
  const [open, setOpen] = useState(Boolean(openFirst));
  const panelId = `example-${service.id}`;
  const other = currency === 'uah' ? 'usd' : 'uah';

  return (
    <Reveal as="li" delay={step(index)}>
      <div className={cn(
        'glass-plate rounded-2xl transition-colors duration-300',
        open ? 'border-rule bg-glass-2' : 'hover:bg-glass-2'
      )}>
        <div className="p-6 md:px-8">
          <div className="grid items-start gap-x-8 gap-y-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="md:col-start-1">
              <h3 className="flex flex-wrap items-center gap-3 font-display text-[1.22rem] font-semibold tracking-[-0.03em]">
                {copy.name}
                {service.featured && (
                  <span className="rounded-full bg-acid px-2.5 py-0.5 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-acid-ink">
                    {t('services.featured')}
                  </span>
                )}
              </h3>
              <p className="mt-2 max-w-[56ch] text-[0.95rem] text-muted">{copy.desc}</p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-4 md:col-start-2 md:row-span-2 md:justify-end">
              {example && (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpen(v => !v)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule-soft px-4 py-2.5
                             text-[0.84rem] text-muted transition-colors hover:border-rule hover:text-paper"
                >
                  {t('services.example')}
                  <ToggleSign open={open} />
                </button>
              )}

              <span className="grid text-left md:text-right">
                {service.price ? (
                  <>
                    <span className="tabular whitespace-nowrap font-display text-[1.28rem] font-semibold tracking-[-0.03em]">
                      {t('services.from')} {money(service.price)}
                    </span>
                    <span className="tabular text-[0.78rem] text-faint">≈ {money(service.price, other)}</span>
                  </>
                ) : (
                  <span className="text-base text-muted">{t('services.custom')}</span>
                )}
              </span>

              <a
                href={tgLink(t('services.orderText').replace('{name}', copy.name))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-rule bg-glass px-5
                           py-2.5 text-[0.86rem] transition-colors hover:border-acid hover:bg-acid hover:text-acid-ink"
              >
                {t('services.order')} →
              </a>
            </div>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-rule-soft pt-4 text-[0.85rem] text-faint">
            {copy.bullets.map(b => (
              <li key={b} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1 rounded-full bg-acid opacity-60" />{b}
              </li>
            ))}
          </ul>
        </div>

        {example && (
          <Collapsible open={open} id={panelId}>
            <div className="grid gap-8 px-6 pb-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:px-8">
              <div className="overflow-hidden rounded-xl border border-rule-soft bg-ink">
                <Mock id={service.id} />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[0.92rem] text-muted">{example}</p>
                {service.caseLink && (
                  <a href={service.caseLink} target="_blank" rel="noopener noreferrer"
                     className="mt-4 inline-flex items-center gap-2 text-[0.9rem] text-muted transition-colors hover:text-paper">
                    {t('services.case')} →
                  </a>
                )}
              </div>
            </div>
          </Collapsible>
        )}
      </div>
    </Reveal>
  );
}

export function Prices({ only = null, id = 'services' }) {
  const { t, setRate, locale } = useI18n();
  const [note, setNote] = useState('');
  const list = only ? SERVICES.filter(s => only.includes(s.id)) : SERVICES;

  /* За курсом идём один раз и не на первом экране: цена в гривне
     верна и без него, а доллар пересчитается, когда ответ приедет. */
  useEffect(() => {
    let alive = true;
    fetch(NBU)
      .then(r => r.json())
      .then(data => {
        const row = Array.isArray(data) && data[0];
        if (!alive || !row || !row.rate) return;
        setRate({ usd: row.rate, date: row.exchangedate });
        setNote(t('services.rateLive').replace('{rate}', row.rate.toFixed(2)).replace('{date}', row.exchangedate));
      })
      .catch(() => {
        setNote(t('services.rateOld').replace('{rate}', FALLBACK_RATE.toFixed(2)).replace('{date}', '03.09.2026'));
      });
    return () => { alive = false; };
  }, [locale]);

  return (
    <Section id={id} sunken>
      <SectionHead kicker={t('services.kicker')} title={t('services.title')} lead={t('services.lead')}>
        <CurrencySwitch note={note} />
      </SectionHead>
      <ul className="grid gap-3">
        {list.map((service, i) => (
          <PriceRow key={service.id} service={service} index={i} openFirst={i === 0} />
        ))}
      </ul>
    </Section>
  );
}

function CurrencySwitch({ note }) {
  const { currency, setCurrency, t } = useI18n();
  return (
    <div role="group" aria-label={t('services.currency')} className="mt-6 flex items-center gap-2">
      {[['uah', '₴'], ['usd', '$']].map(([code, sign]) => (
        <button
          key={code}
          type="button"
          aria-pressed={currency === code}
          onClick={() => setCurrency(code)}
          className={cn(
            'h-[34px] w-[38px] rounded-md border text-[0.9rem] transition-colors',
            currency === code
              ? 'border-rule bg-glass-2 text-paper'
              : 'border-rule-soft bg-glass text-faint hover:text-paper'
          )}
        >
          {sign}
        </button>
      ))}
      {note && <span className="ml-2 text-[0.76rem] text-faint">{note}</span>}
    </div>
  );
}

export default Prices;
