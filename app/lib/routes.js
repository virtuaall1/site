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
    }
  },
  {
    path: '/boty/',
    file: 'boty/index.html',
    page: 'Boty',
    nav: 'nav.boty',
    services: ['bot', 'shop-bot'],
    uk: {
      title: 'Telegram-боти під ключ — розробка з оплатою та адмінкою | v.studio',
      desc: 'Боти для замовлень, розсилок, заявок і модерації чатів. Каталог, оплата карткою, адмінпанель. Фіксована ціна, вихідники на руки.'
    }
  },
  {
    path: '/sajty/',
    file: 'sajty/index.html',
    page: 'Sajty',
    nav: 'nav.sajty',
    services: ['landing', 'webapp'],
    uk: {
      title: 'Сайти й вебзастосунки — лендинги та сервіси з адмінкою | v.studio',
      desc: 'Лендинг під послугу або вебзастосунок із кабінетами, ролями і звітами. Адаптив, швидкість, SEO. Фіксована ціна і вихідники.'
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
    }
  }
];

export const byPath = path => ROUTES.find(r => r.path === path);

export default ROUTES;
