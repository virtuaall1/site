/**
 * Страницы сайта.
 *
 * Один список на всё: по нему собираются статические файлы, из
 * него же берутся title и description, и он же идёт в карту сайта.
 * Второго перечня страниц нет — добавил сюда, и страница появилась
 * везде сразу.
 *
 * `services` — какие услуги показывать на странице. Цены, примеры и
 * описания берутся из общих данных: отдельной копии текста под
 * каждую страницу не заводим, иначе они разойдутся в первый же
 * месяц.
 */
export const ROUTES = [
  {
    path: '/',
    file: 'index.html',
    page: 'Home',
    uk: {
      title: 'v.studio — сайти, сервіси і Telegram-боти на Python, Java, Spring',
      desc: 'Вебзастосунки, бекенд на Java і Spring Boot, сайти, Telegram-боти та автоматизація. Фіксована ціна, вихідники та місяць підтримки.'
    },
    en: {
      title: 'v.studio — websites, services and Telegram bots in Python, Java, Spring',
      desc: 'Web apps, backends in Java and Spring Boot, websites, Telegram bots and automation. Fixed price, source code and a month of support.'
    }
  },
  {
    path: '/bots/',
    file: 'bots/index.html',
    page: 'Bots',
    nav: 'nav.bots',
    services: ['bot', 'shop-bot'],
    uk: {
      title: 'Telegram-боти під ключ — розробка з оплатою та адмінкою | v.studio',
      desc: 'Боти для замовлень, розсилок, заявок і модерації чатів. Каталог, оплата карткою, адмінпанель. Фіксована ціна, вихідники на руки.'
    },
    en: {
      title: 'Telegram bots built end to end — payments and an admin panel | v.studio',
      desc: 'Bots for orders, broadcasts, leads and chat moderation. Catalogue, card payments, admin panel. Fixed price, the source code is yours.'
    }
  },
  {
    path: '/websites/',
    file: 'websites/index.html',
    page: 'Websites',
    nav: 'nav.websites',
    services: ['landing', 'webapp'],
    uk: {
      title: 'Сайти й вебзастосунки — лендинги та сервіси з адмінкою | v.studio',
      desc: 'Лендинг під послугу або вебзастосунок із кабінетами, ролями і звітами. Адаптив, швидкість, SEO. Фіксована ціна і вихідники.'
    },
    en: {
      title: 'Websites and web apps — landing pages and services with an admin panel | v.studio',
      desc: 'A landing page for one service, or a web app with accounts, roles and reports. Responsive, fast, SEO-ready. Fixed price and source code.'
    }
  },
  {
    path: '/backend/',
    file: 'backend/index.html',
    page: 'Backend',
    nav: 'nav.backend',
    services: ['backend', 'automation', 'custom'],
    uk: {
      title: 'Бекенд, API та автоматизація — Java, Spring Boot, Python | v.studio',
      desc: 'Серверна частина на Java зі Spring Boot або Python: REST API, база, інтеграції. Парсинг і рутина за розкладом.'
    },
    en: {
      title: 'Backend, APIs and automation — Java, Spring Boot, Python | v.studio',
      desc: 'Server side in Java with Spring Boot or Python: REST APIs, a database, integrations. Scraping and routine work on a schedule.'
    }
  }
];

/* Страница, которой нет. В навигации её нет и в карте сайта тоже:
   поисковику она не нужна, а нужна человеку, который пришёл по
   сломанной ссылке. Воркер отдаёт её с кодом 404 — иначе
   поисковик решит, что это обычная страница, и начнёт её
   индексировать. */
export const NOT_FOUND = {
  path: '/404',
  file: '404.html',
  page: 'NotFound',
  uk: {
    title: 'Сторінку не знайдено — v.studio',
    desc: 'Такої сторінки немає. Можливо, адреса застаріла або в ній помилка.'
  },
  en: {
    title: 'Page not found — v.studio',
    desc: 'This page does not exist. The address may be out of date, or there is a typo in it.'
  }
};

export const byPath = path => ROUTES.find(r => r.path === path);

export default ROUTES;
