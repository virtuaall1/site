/**
 * Отчёты об ошибках.
 *
 * Адрес проекта (DSN) приходит переменной сборки VITE_SENTRY_DSN.
 * Её нет — не подключается вообще ничего: сборщик видит, что
 * условие ниже никогда не выполнится, и выбрасывает и сам импорт,
 * и пакет. Ни запроса, ни килобайта.
 *
 * Главное решение здесь: пакет грузится не при открытии страницы,
 * а при первой ошибке.
 *
 * Сам Sentry весит около 150 КБ в сжатом виде — больше, чем весь
 * наш сайт. Отдавать его каждому посетителю ради события, которое
 * у большинства не случится никогда, — плохая сделка. Поэтому
 * сначала висят два обработчика на двадцать строк; они ловят
 * ошибку, придерживают её и только тогда идут за пакетом. Ни одна
 * ошибка при этом не теряется: очередь отправляется, как только
 * Sentry доехал.
 */
const DSN = import.meta.env.VITE_SENTRY_DSN;

let loading = null;
let queue = [];

/** Грузим и настраиваем — ровно один раз, сколько бы ошибок ни пришло. */
function load() {
  if (loading) return loading;

  loading = import('@sentry/browser').then(Sentry => {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE || undefined,

      /* Только ошибки, без измерения скорости: трассировка — самая
         тяжёлая часть пакета, а скорость мы меряем сами
         (scripts/perfcheck.js) на своей машине, не за счёт
         посетителя. */
      defaultIntegrations: false,
      integrations: [
        Sentry.globalHandlersIntegration(),
        Sentry.linkedErrorsIntegration(),
        Sentry.dedupeIntegration()
      ],

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

    // Граница ошибок — обычный класс React, и тянуть Sentry прямо
    // в неё значит тащить его в основной кусок. Поэтому он кладёт
    // себя сюда сам, а граница просто проверяет, появился ли он.
    window.Sentry = Sentry;

    // Свои обработчики снимаем: дальше слушает сам Sentry, и две
    // пары обработчиков дали бы каждую ошибку дважды.
    stopListening();

    for (const item of queue) Sentry.captureException(item);
    queue = [];

    return Sentry;
  }).catch(() => {
    // Не доехало — сайт работает как работал. Очередь бросаем,
    // иначе она растёт молча и держит ссылки на ошибки.
    queue = [];
  });

  return loading;
}

function onError(event) {
  const problem = event.error || event.reason || event.message || 'unknown';
  if (queue.length < 10) queue.push(problem);   // потолок на случай цикла
  load();
}

let stopListening = () => {};

export function initSentry() {
  if (!DSN || typeof window === 'undefined') return;

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);

  stopListening = () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onError);
  };
}

/** Позвать вручную — из границы ошибок React. */
export function reportError(error, extra) {
  if (!DSN || typeof window === 'undefined') return;
  if (queue.length < 10) queue.push(error);
  load().then(Sentry => {
    if (Sentry && extra) Sentry.setContext('react', extra);
  });
}
