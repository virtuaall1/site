/**
 * Язык и валюта — один контекст на всё приложение.
 *
 * Выбор запоминается в localStorage, но читается только в браузере:
 * при сборке страницы рисуются на сервере, где localStorage нет, и
 * обращение к нему уронило бы рендер. Поэтому стартовое значение
 * всегда украинский, а сохранённое подхватывается уже в браузере,
 * после первой отрисовки — иначе разметка сервера и клиента
 * разойдутся, и React перерисует страницу целиком.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18N, PLURALS } from './content.js';

const LANGS = ['uk', 'en'];
const CURRENCIES = ['uah', 'usd'];
const LOCALES = { uk: 'uk-UA', en: 'en-GB' };

/* Запасной курс — тот же, что подставляется в структурированные
   данные. Настоящий приезжает из НБУ, если он ответит. */
export const FALLBACK_RATE = 44.61;

const Ctx = createContext(null);

function saved(key, allowed) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : null;
  } catch (e) {
    return null;                       // приватный режим
  }
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('uk');
  const [currency, setCurrency] = useState('uah');
  const [rate, setRate] = useState({ usd: FALLBACK_RATE, date: null });

  // Первый кадр обязан совпасть с тем, что нарисовала сборка.
  // Всё, что зависит от браузера, подхватываем следующим шагом.
  useEffect(() => {
    const fromStore = saved('lang', LANGS);
    const fromBrowser = (navigator.language || '').toLowerCase().startsWith('uk') ? 'uk' : 'en';
    const next = fromStore || fromBrowser;
    setLang(next);
    setCurrency(saved('currency', CURRENCIES) || (next === 'uk' ? 'uah' : 'usd'));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) { /* noop */ }
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem('currency', currency); } catch (e) { /* noop */ }
  }, [currency]);

  const value = useMemo(() => {
    const t = key => (I18N[lang] && I18N[lang][key]) || I18N.uk[key] || key;

    /** Доллар округляем до пятёрки: это цена, а не результат деления. */
    const money = (n, cur = currency) => (cur === 'uah'
      ? '₴' + n.toLocaleString(LOCALES.uk)
      : '$' + Math.round(n / rate.usd / 5) * 5);

    const plural = (n, name) => {
      const forms = (PLURALS[lang] || PLURALS.uk)[name] || {};
      const rule = new Intl.PluralRules(LOCALES[lang]).select(n);
      return forms[rule] || forms.other || '';
    };

    return { lang, setLang, currency, setCurrency, rate, setRate, t, money, plural, locale: LOCALES[lang] };
  }, [lang, currency, rate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n вызван вне I18nProvider');
  return ctx;
}
