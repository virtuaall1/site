/**
 * Отчёты об ошибках.
 *
 * Адрес проекта (DSN) приходит переменной сборки VITE_SENTRY_DSN.
 * Её нет — Sentry не подключается вовсе: ни запроса, ни единого
 * лишнего килобайта. Так сайт остаётся рабочим у того, кто
 * собирает его без наших ключей.
 *
 * Сам пакет грузится отдельным куском и только после первой
 * отрисовки: отчёты об ошибках не должны задерживать первый экран.
 */
const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN || typeof window === 'undefined') return;

  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE || undefined,

      /* Доля сеансов, по которым собираем скорость. Сотая часть —
         этого хватает, чтобы увидеть тренд, и не хватает, чтобы
         упереться в лимит бесплатного тарифа. */
      tracesSampleRate: 0.01,

      /* Чужих ошибок нам не надо: расширения браузера и скрипты с
         других доменов шумят сильнее, чем наш собственный код. */
      allowUrls: [/vrtll\.dev/, /localhost/],

      /* Ничего личного в отчёт не попадает: заявку человек пишет в
         форме, и её текст не должен уехать третьей стороне. */
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request) delete event.request.cookies;
        return event;
      }
    });
  }).catch(() => { /* не доехало — сайт работает как работал */ });
}
