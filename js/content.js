/**
 * Весь редактируемый контент сайта в одном месте.
 * Меняешь цены, услуги, контакты — только здесь, разметку трогать не нужно.
 * Языки: uk (основной) и en. Каждый блок должен иметь оба.
 */
window.SITE = (() => {
  'use strict';

  const LINKS = {
    github: 'https://github.com/virtuaall1',
    telegram: 'https://t.me/virtuaall',
    telegramHandle: '@virtuaall',
    email: 'virtuaall0@gmail.com'
  };

  const GITHUB_USER = 'virtuaall1';

  /* Репозитории, которые не нужно показывать в списке работ
     (например, сам этот сайт — он и так перед глазами) */
  const HIDDEN_REPOS = ['site'];

  /**
   * Проекты, которых нет на GitHub: боты обычно лежат в приватных
   * репозиториях у заказчика. Добавляй сюда РЕАЛЬНЫЕ работы —
   * этот блок показывается выше репозиториев.
   *
   * Пример:
   * {
   *   year: '2026',
   *   link: 'https://t.me/имя_бота',   // необязательно
   *   uk: { name: 'Бот-магазин одягу', desc: 'Каталог на 400 позицій, оплата карткою, 1200 замовлень за перший місяць.', tags: ['aiogram', 'PostgreSQL'] },
   *   en: { name: 'Clothing shop bot',  desc: '400-item catalogue, card payments, 1,200 orders in the first month.',    tags: ['aiogram', 'PostgreSQL'] }
   * }
   */
  const PROJECTS = [];

  const SERVICES = [
    {
      id: 'webapp',
      price: '$400+',
      featured: true,
      uk: {
        name: 'Вебзастосунок з адмінкою',
        desc: 'Сервіс під задачу бізнесу: особисті кабінети, ролі та права, панель керування, звіти.',
        bullets: ['Авторизація і ролі', 'Адмінпанель', 'База даних', 'Звіти та вивантаження']
      },
      en: {
        name: 'Web app with admin panel',
        desc: 'A service built around your process: user accounts, roles and permissions, dashboard, reports.',
        bullets: ['Auth and roles', 'Admin panel', 'Database', 'Reports and exports']
      }
    },
    {
      id: 'backend',
      price: '$350+',
      uk: {
        name: 'Бекенд і API',
        desc: 'Серверна частина на Java зі Spring Boot або на Python: REST API, база, інтеграції із зовнішніми сервісами.',
        bullets: ['Java · Spring Boot', 'Python · FastAPI', 'REST API', 'Docker і деплой']
      },
      en: {
        name: 'Backend and APIs',
        desc: 'Server side in Java with Spring Boot or in Python: REST APIs, database, third-party integrations.',
        bullets: ['Java · Spring Boot', 'Python · FastAPI', 'REST API', 'Docker and deploy']
      }
    },
    {
      id: 'landing',
      price: '$150+',
      uk: {
        name: 'Сайт-візитка та лендинг',
        desc: 'Швидка сторінка під послугу або товар: адаптив, форми заявок, підключення аналітики.',
        bullets: ['Адаптив під телефон', 'Форма заявки', 'Швидкість і SEO', 'Запуск за 3–5 днів']
      },
      en: {
        name: 'Landing page',
        desc: 'A fast page for one product or service: responsive layout, lead forms, analytics wired up.',
        bullets: ['Mobile-first layout', 'Lead form', 'Speed and SEO', 'Live in 3–5 days']
      }
    },
    {
      id: 'shop-bot',
      price: '$250+',
      uk: {
        name: 'Telegram-бот з оплатою',
        desc: 'Каталог, кошик, приймання платежів, сповіщення про замовлення та адмінка для керування товарами.',
        bullets: ['Каталог і категорії', 'Оплата карткою / крипта', 'Адмінпанель', 'Вивантаження замовлень']
      },
      en: {
        name: 'Telegram shop bot',
        desc: 'Catalogue, cart, payments, order notifications and an admin panel to manage the products.',
        bullets: ['Catalogue and categories', 'Card / crypto payments', 'Admin panel', 'Order exports']
      }
    },
    {
      id: 'bot',
      price: '$120+',
      uk: {
        name: 'Бот: розсилки, заявки, модерація',
        desc: 'Від автовідповідача до міні-CRM із сегментами, відкладеним постингом і антиспамом у чаті.',
        bullets: ['Заявки власнику', 'Розсилки по базі', 'Капча й антиспам', 'Статистика']
      },
      en: {
        name: 'Bot: broadcasts, leads, moderation',
        desc: 'From a simple auto-reply to a mini CRM with segments, scheduled posts and chat anti-spam.',
        bullets: ['Leads to your inbox', 'Broadcasts', 'Captcha and anti-spam', 'Statistics']
      }
    },
    {
      id: 'automation',
      price: '$120+',
      uk: {
        name: 'Парсинг і автоматизація',
        desc: 'Збирає дані із сайтів, стежить за змінами і переносить рутину у скрипти за розкладом.',
        bullets: ['Збір даних 24/7', 'Вивантаження в таблиці', 'Сповіщення', 'Робота за розкладом']
      },
      en: {
        name: 'Scraping and automation',
        desc: 'Collects data from websites, watches for changes and moves routine work into scheduled scripts.',
        bullets: ['24/7 data collection', 'Export to spreadsheets', 'Alerts', 'Runs on a schedule']
      }
    },
    {
      id: 'custom',
      price: '?',
      uk: {
        name: 'Нестандартне завдання',
        desc: 'Доопрацювання чужого коду, інтеграції між сервісами, перенесення на новий сервер, прискорення повільного проєкту.',
        bullets: ['Доопрацювання проєкту', 'Інтеграції сервісів', 'Переїзд і деплой', 'Оптимізація']
      },
      en: {
        name: 'Something else',
        desc: 'Picking up someone else’s code, wiring services together, moving to a new server, speeding up a slow project.',
        bullets: ['Take over a project', 'Service integrations', 'Migration and deploy', 'Optimisation']
      }
    }
  ];

  const PROCESS = [
    {
      uk: { title: 'Розбір задачі', desc: 'Зідзвонюємось або листуємось, я ставлю питання і фіксую, що саме має вміти проєкт.' },
      en: { title: 'Understanding the task', desc: 'We talk it through, I ask questions and write down exactly what the project has to do.' }
    },
    {
      uk: { title: 'Кошторис і строки', desc: 'Надсилаю фіксовану ціну й дату здачі. Передоплата — половина, решта після приймання.' },
      en: { title: 'Quote and timeline', desc: 'You get a fixed price and a delivery date. Half up front, the rest once you accept the work.' }
    },
    {
      uk: { title: 'Розробка', desc: 'Показую проміжні версії, щоб правки не накопичувались до самого кінця.' },
      en: { title: 'Development', desc: 'I show work in progress, so changes get caught early instead of piling up at the end.' }
    },
    {
      uk: { title: 'Запуск і підтримка', desc: 'Розгортаю на сервері, віддаю вихідники і місяць правлю баги безкоштовно.' },
      en: { title: 'Launch and support', desc: 'I deploy it, hand over the source code and fix bugs free of charge for a month.' }
    }
  ];

  const FAQ = [
    {
      uk: {
        q: 'Скільки триває розробка?',
        a: 'Лендинг або простий бот — 3–5 днів. Магазин з оплатою — від півтора тижня. Вебзастосунок з адмінкою та бекендом — від трьох тижнів. Точний строк називаю після розбору завдання і фіксую в домовленості.'
      },
      en: {
        q: 'How long does it take?',
        a: 'A landing page or a simple bot takes 3–5 days. A shop with payments starts at a week and a half. A web app with an admin panel and backend starts at three weeks. I give you an exact date after we scope the task, and it stays fixed.'
      }
    },
    {
      uk: {
        q: 'Вихідники залишаються в мене?',
        a: 'Так. Після фінальної оплати передаю весь код і доступи. Жодної прив’язки до мене: інший розробник зможе продовжити роботу.'
      },
      en: {
        q: 'Do I get the source code?',
        a: 'Yes. Once the final payment is through, you get all the code and credentials. Nothing is locked to me — another developer can pick it up.'
      }
    },
    {
      uk: {
        q: 'Як оплачувати?',
        a: 'Половина до старту, половина після приймання. Картка або крипта — як зручніше. Для великих завдань можна розбити на етапи.'
      },
      en: {
        q: 'How does payment work?',
        a: 'Half before we start, half when you accept the work. Card or crypto, whichever suits you. Larger projects can be split into stages.'
      }
    },
    {
      uk: {
        q: 'А якщо після запуску щось зламається?',
        a: 'Місяць після здачі правлю баги безкоштовно. Далі — за домовленістю: разово або щомісячна підтримка з моніторингом.'
      },
      en: {
        q: 'What if something breaks after launch?',
        a: 'I fix bugs free for a month after delivery. After that it is either one-off fixes or a monthly support plan with monitoring.'
      }
    },
    {
      uk: {
        q: 'Де все це працюватиме?',
        a: 'Розгортаю на твоєму сервері або підбираю недорогий VPS: домен, SSL, автозапуск, логи та перезапуск при падінні. Доступи лишаються в тебе.'
      },
      en: {
        q: 'Where does it run?',
        a: 'On your server, or on an inexpensive VPS I pick for you: domain, SSL, autostart, logs and automatic restart on failure. The credentials stay yours.'
      }
    }
  ];

  const TICKER = {
    uk: ['Java', 'Spring Boot', 'Python', 'FastAPI', 'Вебзастосунки', 'REST API', 'PostgreSQL', 'Telegram Bot API', 'Docker', 'Деплой на VPS'],
    en: ['Java', 'Spring Boot', 'Python', 'FastAPI', 'Web apps', 'REST API', 'PostgreSQL', 'Telegram Bot API', 'Docker', 'VPS deployment']
  };

  /* Технологии, которых может не быть в GitHub-статистике, но с ними я работаю */
  const EXTRA_STACK = [
    'Java', 'Spring Boot', 'Python', 'FastAPI', 'REST API', 'Telegram Bot API',
    'aiogram', 'PostgreSQL', 'SQLite', 'Redis', 'Docker', 'nginx', 'Git', 'Linux'
  ];

  /* Формы множественного числа по категориям Intl.PluralRules */
  const PLURALS = {
    uk: {
      repos: { one: 'репозиторій', few: 'репозиторії', many: 'репозиторіїв', other: 'репозиторіїв' },
      stars: { one: 'зірка', few: 'зірки', many: 'зірок', other: 'зірок' },
      followers: { one: 'підписник', few: 'підписники', many: 'підписників', other: 'підписників' },
      years: { one: 'рік на GitHub', few: 'роки на GitHub', many: 'років на GitHub', other: 'років на GitHub' }
    },
    en: {
      repos: { one: 'repository', other: 'repositories' },
      stars: { one: 'star', other: 'stars' },
      followers: { one: 'follower', other: 'followers' },
      years: { one: 'year on GitHub', other: 'years on GitHub' }
    }
  };

  const I18N = {
    uk: {
      'meta.title': 'Розробка сайтів, сервісів і Telegram-ботів — Python, Java, Spring',
      'meta.desc': 'Вебзастосунки, бекенд на Java і Spring Boot, сайти, Telegram-боти та автоматизація. Фіксована ціна, вихідники та місяць підтримки.',
      'nav.services': 'Послуги',
      'nav.process': 'Як працюю',
      'nav.work': 'Роботи',
      'nav.faq': 'Питання',
      'nav.contact': 'Контакти',
      'nav.order': 'Написати',
      'hero.status': 'Беру замовлення',
      'hero.title.1': 'Сайти, сервіси',
      'hero.title.2': 'і боти, які',
      'hero.title.3': 'працюють за вас',
      'hero.lead': 'Пишу вебзастосунки, бекенд і Telegram-ботів: Python, Java, Spring Boot, бази даних, інтеграції з чужими API. Фіксована ціна, вихідники на руки, місяць підтримки після запуску.',
      'hero.cta': 'Обговорити задачу',
      'hero.cta2': 'Код на GitHub',
      'hero.figures': ['Вихідники твої', 'Фіксована ціна', 'Місяць підтримки'],
      'services.kicker': 'Що замовляють',
      'services.title': 'Послуги та ціни',
      'services.lead': 'Ціни стартові, фінальна залежить від обсягу. Точний кошторис називаю після короткої розмови.',
      'services.from': 'від',
      'services.custom': 'ціна за задачею',
      'services.order': 'Замовити',
      'services.featured': 'хіт',
      'services.orderText': 'Вітаю! Цікавить: {name}. Розкажіть, будь ласка, про строки та ціну.',
      'process.kicker': 'Як це влаштовано',
      'process.title': 'Чотири кроки до запуску',
      'work.kicker': 'Відкритий код',
      'work.title': 'Репозиторії',
      'work.lead': 'Підтягується з GitHub автоматично — сортування за зірками.',
      'work.empty': 'Поки немає публічних репозиторіїв.',
      'work.error': 'GitHub не відповідає. Зазирни в профіль напряму.',
      'work.updated': 'оновлено',
      'work.all': 'Увесь профіль',
      'stack.kicker': 'Інструменти',
      'stack.title': 'Чим пишу',
      'stack.lead': 'Мови пораховані за моїми публічними репозиторіями, решта — те, з чим працюю щодня.',
      'faq.kicker': 'Без сюрпризів',
      'faq.title': 'Часті питання',
      'contact.kicker': 'Далі',
      'contact.title': 'Розкажи, що треба автоматизувати',
      'contact.lead': 'Опиши задачу в двох словах — відповім, чи реально це, скільки коштуватиме і скільки триватиме.',
      'contact.tg': 'Написати в Telegram',
      'contact.tgText': 'Вітаю! Хочу обговорити проєкт.',
      'contact.mail': 'Пошта',
      'footer.rights': 'Зібрано вручну, без конструкторів.'
    },
    en: {
      'meta.title': 'Web apps, backends and Telegram bots — Python, Java, Spring',
      'meta.desc': 'Web applications, Java and Spring Boot backends, landing pages, Telegram bots and automation. Fixed price, source code included, a month of support.',
      'nav.services': 'Services',
      'nav.process': 'Process',
      'nav.work': 'Work',
      'nav.faq': 'FAQ',
      'nav.contact': 'Contact',
      'nav.order': 'Get in touch',
      'hero.status': 'Available for work',
      'hero.title.1': 'Sites, services',
      'hero.title.2': 'and bots that',
      'hero.title.3': 'work for you',
      'hero.lead': 'I build web apps, backends and Telegram bots: Python, Java, Spring Boot, databases, third-party API integrations. Fixed price, source code included, a month of support after launch.',
      'hero.cta': 'Discuss your project',
      'hero.cta2': 'Code on GitHub',
      'hero.figures': ['You own the code', 'Fixed price', 'A month of support'],
      'services.kicker': 'What people order',
      'services.title': 'Services and pricing',
      'services.lead': 'These are starting prices — the final one depends on scope. I quote exactly after a short conversation.',
      'services.from': 'from',
      'services.custom': 'quoted per project',
      'services.order': 'Order',
      'services.featured': 'top',
      'services.orderText': 'Hi! I am interested in: {name}. Could you tell me about the timeline and price?',
      'process.kicker': 'How it works',
      'process.title': 'Four steps to launch',
      'work.kicker': 'Open source',
      'work.title': 'Repositories',
      'work.lead': 'Pulled from GitHub automatically, sorted by stars.',
      'work.empty': 'No public repositories yet.',
      'work.error': 'GitHub is not responding. Have a look at the profile directly.',
      'work.updated': 'updated',
      'work.all': 'Full profile',
      'stack.kicker': 'Tools',
      'stack.title': 'What I build with',
      'stack.lead': 'Languages are counted from my public repositories; the rest is what I work with day to day.',
      'faq.kicker': 'No surprises',
      'faq.title': 'Frequently asked',
      'contact.kicker': 'Next',
      'contact.title': 'Tell me what needs automating',
      'contact.lead': 'Describe the task in a couple of sentences — I will tell you if it is doable, what it costs and how long it takes.',
      'contact.tg': 'Message on Telegram',
      'contact.tgText': 'Hi! I would like to discuss a project.',
      'contact.mail': 'Email',
      'footer.rights': 'Hand-built, no page builders.'
    }
  };

  return { LINKS, GITHUB_USER, HIDDEN_REPOS, PROJECTS, SERVICES, PROCESS, FAQ, TICKER, EXTRA_STACK, PLURALS, I18N };
})();
