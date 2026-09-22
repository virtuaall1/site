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
import { flushSync } from 'react-dom';
import { I18N, PLURALS } from './content.js';

const LANGS = ['uk', 'en'];
const SUPPORTED = LANGS;
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
  /* Идёт ли переход прямо сейчас — по этому рисуется полоса,
     которая пробегает по экрану вместе со сменой языка. */
  const [swapping, setSwapping] = useState(false);

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

  /**
   * Смена языка.
   *
   * Просто заменить текст — значит моргнуть всей страницей: меняются
   * все строки разом, высота блоков едет, глаз не успевает понять,
   * что произошло.
   *
   * Поэтому переход отдаём браузеру: startViewTransition снимает
   * кадр «до», даёт нам поменять состояние и сам разводит два кадра.
   * Как именно разводит — описано в main.css под [data-lang-swap].
   *
   * flushSync обязателен: браузер ждёт синхронного изменения DOM
   * внутри колбэка, а React по умолчанию откладывает перерисовку
   * на потом — и снимок «после» вышел бы тем же, что и «до».
   */
  const switchLang = next => {
    if (next === lang || !SUPPORTED.includes(next)) return;

    const apply = () => flushSync(() => setLang(next));
    const still = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (still || typeof document === 'undefined' || !document.startViewTransition) {
      apply();
      return;
    }

    const root = document.documentElement;
    root.dataset.langSwap = '1';
    setSwapping(true);

    const view = document.startViewTransition(apply);
    view.finished.finally(() => {
      delete root.dataset.langSwap;
      setSwapping(false);
    });
  };

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

    return {
      lang, setLang: switchLang, swapping,
      currency, setCurrency, rate, setRate,
      t, money, plural, locale: LOCALES[lang]
    };
  }, [lang, currency, rate, swapping]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n вызван вне I18nProvider');
  return ctx;
}
