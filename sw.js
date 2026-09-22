/**
 * Служебный воркер: быстрый повторный визит и работающий сайт без сети.
 *
 * Две разные стратегии, потому что у файлов разная природа:
 *
 *   страницы  — сначала сеть, кеш как запасной аэродром. Правку
 *               текста надо увидеть сразу, а без интернета лучше
 *               показать вчерашнюю версию, чем «страница недоступна».
 *   остальное — сначала кеш. К css и js сборка дописывает ?v=<версия>,
 *               так что адрес нового файла всегда другой; старый
 *               ответ отдавать безопасно, он уже не нужен.
 *
 * Чего воркер намеренно не делает: не трогает чужие домены (GitHub
 * API, курс НБУ, шрифты) — их ответы недолговечны, и держать их в
 * кеше значит однажды показать позавчерашний курс как сегодняшний.
 */
const VERSION = 'v1';
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;

/* Раньше здесь лежал список файлов первого экрана. Теперь у css и
   js имена с хешем — они меняются при каждой сборке, и перечислить
   их заранее нельзя. Кладём только саму страницу: остальное
   попадёт в кеш при первой же загрузке, стратегией ниже. */
const PRECACHE = ['./'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PAGES)
      // отдельные промахи не должны валить всю установку
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== PAGES && n !== ASSETS).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/** Кладём копию в кеш, но не ждём её: ответ уходит человеку сразу. */
function keep(cacheName, request, response) {
  if (!response || !response.ok || response.type !== 'basic') return response;
  const copy = response.clone();
  caches.open(cacheName).then(cache => cache.put(request, copy));
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // чужое не трогаем

  const isPage = request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    event.respondWith(
      fetch(request)
        .then(res => keep(PAGES, request, res))
        .catch(() => caches.match(request).then(hit => hit || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(res => keep(ASSETS, request, res));
    })
  );
});

/* Страница может попросить обновиться немедленно — например, когда
   человек нажал «перезагрузить» после правки. */
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
