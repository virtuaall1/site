/**
 * Весь редактируемый контент сайта в одном месте.
 * Меняешь цены, услуги, контакты — только здесь, разметку трогать не нужно.
 * Языки: uk (основной) и en. Каждый блок должен иметь оба.
 */
window.SITE = (() => {
  'use strict';

  /**
   * Адреса и то, как они подписаны, — разные вещи.
   *
   * В подвале стоит домен студии, а не личный ник: домен переживёт
   * смену мессенджера и его не стыдно печатать на визитке. Ссылка с
   * него ведёт на сам сайт, поэтому она рабочая и до того, как домен
   * куплен и привязан.
   *
   * Личные контакты никуда не делись — они в разделе «Далі», где им
   * и место: там кнопка в Telegram и почта.
   */
  const LINKS = {
    github: 'https://github.com/virtuaall1',
    telegram: 'https://t.me/virtuaall01',
    email: 'virtuaall0@gmail.com',

    domain: 'vstudio.dev'
  };

  const GITHUB_USER = 'virtuaall1';

  /* Репозитории, которые не нужно показывать в списке работ
     (например, сам этот сайт — он и так перед глазами) */
  const HIDDEN_REPOS = ['site'];

  /* Имя этого самого репозитория. Нужно, чтобы не посчитать его код
     дважды: свои байты мы и так знаем из OWN_CODE. */
  const SELF_REPO = 'site';

  /**
   * Объём собственного кода по языкам — сайт студии и три сайта из
   * кейсов. Подставляется при сборке (scripts/build.js), поэтому в
   * исходниках здесь null: при разработке полоса языков живёт на
   * одних данных GitHub.
   *
   * Зачем вообще считать самим: если репозиторий станет приватным,
   * GitHub перестанет отдавать по нему языки — и почти 300 КБ
   * своего js, html и css исчезнут из полосы, хотя код никуда не
   * денется.
   */
  const OWN_CODE = null;

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
  const PROJECTS = [
    {
      year: '2026',
      link: 'https://virtuaall1.github.io/site/cases/booking/',
      shot: 'img/cases/booking.jpg',
      uk: {
        name: 'Запис до майстра — Telegram-бот',
        desc: 'Демо бота запису. Вільні вікна рахуються з графіка й уже зайнятого часу, причому послуга займає не клітинку, а свою тривалість — тому «стрижка з бородою» не пропонується за чверть години до закриття. Подвійний запис неможливий: унікальність тримає сама база, а не перевірка в коді. Бот нагадує за добу й за дві години, а на скасування сам зве першого з листа очікування.',
        tags: ['Python', 'aiogram', 'SQLite']
      },
      en: {
        name: 'Appointment booking Telegram bot',
        desc: 'A booking bot demo. Free slots come from the schedule and what is already taken, and a service occupies its real duration — so a 75-minute job is never offered fifteen minutes before closing. Double booking is impossible: uniqueness is held by the database itself, not by a check in the code. The bot reminds a day and two hours ahead, and on a cancellation it calls the first person on the waitlist by itself.',
        tags: ['Python', 'aiogram', 'SQLite']
      }
    },
    {
      year: '2026',
      link: 'https://virtuaall1.github.io/site/cases/guard/',
      shot: 'img/cases/guard.jpg',
      uk: {
        name: 'Модератор чату — Telegram-бот',
        desc: 'Демо бота модерації. Новачкам капча, посилання від них видаляються, розсилки й повтори ловляться навіть коли їх пишуть латиницею всередині кирилиці. Покарання йдуть драбинкою, а лічильник порушень старіє за тиждень. Кожна дія пояснюється причиною: без неї адміністратор перестає довіряти боту й вимикає його.',
        tags: ['Python', 'aiogram', 'SQLite']
      },
      en: {
        name: 'Chat moderation Telegram bot',
        desc: 'A moderation bot demo. Newcomers get a captcha, their links are removed, and spam or repeats are caught even when written in Latin letters inside Cyrillic words. Penalties escalate step by step, and the strike counter ages out over a week. Every action states its reason: without one, an admin stops trusting the bot and turns it off.',
        tags: ['Python', 'aiogram', 'SQLite']
      }
    },
    {
      year: '2026',
      link: 'https://virtuaall1.github.io/site/cases/spend/',
      shot: 'img/cases/spend.jpg',
      uk: {
        name: 'Облік витрат — Telegram-бот',
        desc: 'Демо бота обліку без жодного меню: пишеш «120 кава» — і все. Сума читається в будь-якому порядку слів, категорія підбирається за словником і за основою слова, бо українська відмінюється. Виправив категорію — бот запамʼятав це слово за нею, і твій словник стає головнішим за загальний. Ліміти попереджають на 80 %, а не коли гроші вже скінчились.',
        tags: ['Python', 'aiogram', 'SQLite']
      },
      en: {
        name: 'Expense tracking Telegram bot',
        desc: 'An expense bot demo with no menus at all: you type “120 coffee” and that is it. The amount is read in any word order, and the category is guessed from a dictionary and from word stems, because Ukrainian inflects. Correct a category once and the bot remembers that word for it, so your own vocabulary outranks the built-in one. Limits warn at 80 %, not after the money is gone.',
        tags: ['Python', 'aiogram', 'SQLite']
      }
    },
    /* «Орбіта» і «Пліткарка» тимчасово прибрані з сайта: записи
       лежать в історії git, повернути можна одним revert. Самі
       сторінки кейсів у cases/ на місці, але в збірку не потрапляють
       (список SKIP у scripts/build.js) і нізвідки не лінкуються. */
    {
      year: '2026',
      link: 'https://virtuaall1.github.io/site/cases/shop-bot/',
      shot: 'img/cases/shop-bot.jpg',
      uk: {
        name: 'Telegram-бот магазину',
        desc: 'Каталог за категоріями, кошик, оформлення замовлення в три кроки і сповіщення адміну про кожну покупку. Ціни зберігаються в копійках, а назва й ціна фіксуються на момент покупки — зміна каталогу не переписує старі замовлення. Бота можна пройти прямо в браузері: замовлення, яке ти оформиш, одразу зʼявиться в панелі власника поруч.',
        tags: ['Python', 'aiogram 3', 'SQLite']
      },
      en: {
        name: 'Telegram shop bot',
        desc: 'Catalogue by category, cart, a three-step checkout and an instant admin notification for every order. Prices are stored in cents, and each order keeps the title and price it was made with, so catalogue edits never rewrite past orders.',
        tags: ['Python', 'aiogram 3', 'SQLite']
      }
    }
  ];

  const SERVICES = [
    {
      id: 'landing',
      // caseLink прибрано разом із «Пліткаркою»: посилання на кейс,
      // якого на сайті немає, вело б у нікуди
      example: {
        uk: 'Приклад: сторінка стоматології. Один екран із цінами, форма запису — заявка одразу падає в Telegram власнику.',
        en: "Example: a page for a dental clinic. One screen with prices and a booking form — each request lands straight in the owner's Telegram."
      },
      price: 2000,
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
      caseLink: 'https://virtuaall1.github.io/site/cases/shop-bot/',
      example: {
        uk: 'Приклад: магазин кави. Клієнт обирає обсяг і помел, оплачує карткою в боті, ти бачиш замовлення з адресою в адмінці.',
        en: "Example: a coffee shop. The buyer picks grind and weight, pays by card inside the bot, and you see the order with its address in the admin panel."
      },
      price: 3500,
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
      caseLink: 'https://virtuaall1.github.io/site/cases/guard/',
      example: {
        uk: 'Приклад: бот стоматології нагадує про візит за добу і збирає відгуки, а нових у чаті зустрічає капча.',
        en: "Example: a clinic bot reminds patients a day before the visit and collects reviews, while a captcha meets newcomers in the chat."
      },
      price: 1500,
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
      id: 'webapp',
      // caseLink прибрано разом з «Орбітою» — див. вище
      example: {
        uk: 'Приклад: облік замовлень для майстерні. Менеджер веде заявки, майстер бачить лише свої, власник — виторг за місяць.',
        en: "Example: an order tracker for a workshop. Managers handle requests, each technician sees only their own, the owner sees monthly revenue."
      },
      price: 6000,
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
      example: {
        uk: 'Приклад: API для мобільного застосунку. Реєстрація, кошик і історія замовлень — фронтенд просто звертається до готових методів.',
        en: "Example: an API for a mobile app. Sign-up, cart and order history — the frontend just calls ready-made endpoints."
      },
      price: 4500,
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
      id: 'automation',
      example: {
        uk: 'Приклад: стеження за цінами конкурентів. Щоранку збирає прайси у таблицю і пише в Telegram, якщо щось подешевшало.',
        en: "Example: competitor price tracking. Every morning it collects prices into a spreadsheet and pings Telegram when something drops."
      },
      price: 1200,
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
      example: {
        uk: 'Приклад: старий сайт на чужому коді гальмував і падав. Розібрали, полагодили, перенесли на новий сервер — сторінки відкриваються вчетверо швидше.',
        en: "Example: an inherited site kept stalling and crashing. We dug in, fixed it and moved it to a new server — pages now open four times faster."
      },
      price: null,
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
      uk: { title: 'Розбір задачі', desc: 'Зідзвонюємось або листуємось, ставимо питання і фіксуємо, що саме має вміти проєкт.' },
      en: { title: 'Understanding the task', desc: 'We talk it through, ask questions and write down exactly what the project has to do.' }
    },
    {
      uk: { title: 'Кошторис і строки', desc: 'Надсилаємо фіксовану ціну й дату здачі. Передоплата — половина, решта після приймання.' },
      en: { title: 'Quote and timeline', desc: 'You get a fixed price and a delivery date. Half up front, the rest once you accept the work.' }
    },
    {
      uk: { title: 'Розробка', desc: 'Показую проміжні версії, щоб правки не накопичувались до самого кінця.' },
      en: { title: 'Development', desc: 'We show work in progress, so changes get caught early instead of piling up at the end.' }
    },
    {
      uk: { title: 'Запуск і підтримка', desc: 'Розгортаємо на сервері, віддаємо вихідники і місяць правимо баги безкоштовно.' },
      en: { title: 'Launch and support', desc: 'We deploy it, hand over the source code and fix bugs free of charge for a month.' }
    }
  ];

  const FAQ = [
    {
      uk: {
        q: 'Скільки триває розробка?',
        a: 'Лендинг або простий бот — 3–5 днів. Магазин з оплатою — від півтора тижня. Вебзастосунок з адмінкою та бекендом — від трьох тижнів. Точний строк називаємо після розбору завдання і фіксуємо в домовленості.'
      },
      en: {
        q: 'How long does it take?',
        a: 'A landing page or a simple bot takes 3–5 days. A shop with payments starts at a week and a half. A web app with an admin panel and backend starts at three weeks. We give you an exact date after we scope the task, and it stays fixed.'
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
        a: 'Розгортаємо на твоєму сервері або підбираємо недорогий VPS: домен, SSL, автозапуск, логи та перезапуск при падінні. Доступи лишаються в тебе.'
      },
      en: {
        q: 'Where does it run?',
        a: 'On your server, or on an inexpensive VPS I pick for you: domain, SSL, autostart, logs and automatic restart on failure. The credentials stay yours.'
      }
    }
  ];

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
      'meta.title': 'v.studio — сайти, сервіси і Telegram-боти на Python, Java, Spring',
      'meta.desc': 'Вебзастосунки, бекенд на Java і Spring Boot, сайти, Telegram-боти та автоматизація. Фіксована ціна, вихідники та місяць підтримки.',
      'nav.cases': 'Кейси',
      'nav.services': 'Послуги',
      'nav.process': 'Як працюємо',
      'nav.work': 'Кейси',
      'nav.faq': 'Питання',
      'nav.contact': 'Контакти',
      'nav.order': 'Написати',
      'nav.theme': 'Змінити тему',
      'hero.status': 'Студія розробки · беремо проєкти',
      'hero.title.1': 'Сайти, сервіси',
      'hero.title.2': 'і боти, які',
      'hero.title.3': 'працюють за вас',
      'hero.lead': 'Пишемо вебзастосунки, бекенд і Telegram-ботів: Python, Java, Spring Boot, бази даних, інтеграції з чужими API. Фіксована ціна, вихідники на руки, місяць підтримки після запуску.',
      'hero.cta': 'Обговорити задачу',
      'hero.cta2': 'Код на GitHub',
      'hero.figures': ['Вихідники твої', 'Фіксована ціна', 'Місяць підтримки'],
      'cases.kicker': 'Можна відкрити',
      'cases.title': 'Живі кейси',
      'cases.lead': 'Не картинки, а робочі сторінки: бота можна пройти до кінця, а в застосунку перемкнути роль.',
      'cases.open': 'Відкрити',
      'services.kicker': 'Що замовляють',
      'services.title': 'Послуги та ціни',
      'services.lead': 'Ціни стартові, фінальна залежить від обсягу. Точний кошторис називаємо після короткої розмови.',
      'services.from': 'від',
      'services.currency': 'Валюта',
      'services.rateLive': 'Курс НБУ на {date} — {rate} ₴/$',
      'services.rateOld': 'Курс {rate} ₴/$ станом на {date}',
      'services.custom': 'ціна за задачею',
      'services.order': 'Замовити',
      'services.featured': 'хіт',
      'services.example': 'Приклад',
      'services.case': 'Живий кейс',
      'services.orderText': 'Вітаю! Цікавить: {name}. Розкажіть, будь ласка, про строки та ціну.',
      'process.kicker': 'Як це влаштовано',
      'process.title': 'Чотири кроки до запуску',
      'work.kicker': 'Зроблено',
      'work.title': 'Кейси',
      'work.lead': 'Проєкти студії та відкритий код. Репозиторії підтягуються з GitHub автоматично, тому список завжди свіжий.',
      'work.empty': 'Поки немає публічних репозиторіїв.',
      'work.error': 'GitHub не відповідає. Зазирни в профіль напряму.',
      'work.updated': 'оновлено',
      'work.all': 'Увесь профіль',
      'stack.kicker': 'Інструменти',
      'stack.title': 'Чим пишемо',
      'stack.lead': 'Це те, з чим працюємо щодня.',
      'stack.langs': 'Пораховано за обсягом коду: сайт студії і три сайти з кейсів — із цього репозиторію, решта — з публічних репозиторіїв на GitHub.',
      'studio.kicker': 'Студія',
      'studio.title': 'Три речі, про які варто домовитись на березі',
      'studio.1.t': 'Фіксована ціна, а не години',
      'studio.1.d': 'Кошторис називаємо до старту й тримаємо його. Якщо задача виросла — узгоджуємо окремо, а не дописуємо в рахунок.',
      'studio.2.t': 'Код і доступи — твої',
      'studio.2.d': 'Віддаємо вихідники, репозиторій і всі акаунти. Захочеш продовжити з іншими — нічого не лишається в заручниках.',
      'studio.3.t': 'Без конструкторів',
      'studio.3.d': 'Пишемо руками: Python, Java, Spring Boot. Тому проєкт не впирається в ліміти шаблону, коли задача виростає.',
      'faq.kicker': 'Без сюрпризів',
      'faq.title': 'Часті питання',
      'contact.kicker': 'Далі',
      'contact.title': 'Розкажи, що треба автоматизувати',
      'contact.lead': 'Опиши задачу в двох словах — відповімо, чи реально це, скільки коштуватиме і скільки триватиме.',
      'contact.tg': 'Написати в Telegram',
      'contact.tgText': 'Вітаю! Хочу обговорити проєкт.',
      'contact.mail': 'Пошта',
      'lead.name': 'Як до вас звертатись',
      'lead.contact': 'Куди відповісти',
      'lead.task': 'Що треба зробити',
      'lead.send': 'Надіслати заявку',
      'lead.note': 'Заявка прилетить мені в Telegram. Збираю тільки те, що в цих трьох полях.',
      'lead.or': 'Або одразу:',
      'lead.required': 'Заповніть імʼя, контакт і опишіть задачу хоча б одним реченням.',
      'lead.sending': 'Надсилаю…',
      'lead.ok': 'Заявка пішла. Відповім тим самим каналом, який ви вказали.',
      'lead.offline': 'Форма зараз не відповідає. Напишіть у Telegram або на пошту — кнопки нижче.'
    },
    en: {
      'meta.title': 'v.studio — web apps, backends and Telegram bots',
      'meta.desc': 'Web applications, Java and Spring Boot backends, landing pages, Telegram bots and automation. Fixed price, source code included, a month of support.',
      'nav.cases': 'Cases',
      'nav.services': 'Services',
      'nav.process': 'Process',
      'nav.work': 'Work',
      'nav.faq': 'FAQ',
      'nav.contact': 'Contact',
      'nav.order': 'Get in touch',
      'nav.theme': 'Switch theme',
      'hero.status': 'Development studio · taking projects',
      'hero.title.1': 'Sites, services',
      'hero.title.2': 'and bots that',
      'hero.title.3': 'work for you',
      'hero.lead': 'We build web apps, backends and Telegram bots: Python, Java, Spring Boot, databases, third-party API integrations. Fixed price, source code included, a month of support after launch.',
      'hero.cta': 'Discuss your project',
      'hero.cta2': 'Code on GitHub',
      'hero.figures': ['You own the code', 'Fixed price', 'A month of support'],
      'cases.kicker': 'You can open these',
      'cases.title': 'Live cases',
      'cases.lead': 'Not screenshots but working pages: you can run the bot to the end and switch roles inside the app.',
      'cases.open': 'Open',
      'services.kicker': 'What people order',
      'services.title': 'Services and pricing',
      'services.lead': 'These are starting prices — the final one depends on scope. We quote exactly after a short conversation.',
      'services.from': 'from',
      'services.currency': 'Currency',
      'services.rateLive': 'NBU rate for {date} — {rate} UAH/USD',
      'services.rateOld': 'Rate {rate} UAH/USD as of {date}',
      'services.custom': 'quoted per project',
      'services.order': 'Order',
      'services.featured': 'top',
      'services.example': 'Example',
      'services.case': 'Live case',
      'services.orderText': 'Hi! I am interested in: {name}. Could you tell me about the timeline and price?',
      'process.kicker': 'How it works',
      'process.title': 'Four steps to launch',
      'work.kicker': 'Shipped',
      'work.title': 'Work',
      'work.lead': 'Studio projects and open source. Repositories are pulled from GitHub automatically, so the list is always current.',
      'work.empty': 'No public repositories yet.',
      'work.error': 'GitHub is not responding. Have a look at the profile directly.',
      'work.updated': 'updated',
      'work.all': 'Full profile',
      'stack.kicker': 'Tools',
      'stack.title': 'What we build with',
      'stack.lead': 'This is what we work with day to day.',
      'stack.langs': 'Measured by code volume: the studio site and the three case sites from this repository, the rest from our public repositories on GitHub.',
      'studio.kicker': 'Studio',
      'studio.title': 'Three things worth settling up front',
      'studio.1.t': 'A fixed price, not hours',
      'studio.1.d': 'We quote before the start and hold that number. If the scope grows, we agree on it separately instead of quietly adding it to the invoice.',
      'studio.2.t': 'The code and accounts are yours',
      'studio.2.d': 'You get the source, the repository and every account. If you carry on with someone else, nothing stays hostage.',
      'studio.3.t': 'No page builders',
      'studio.3.d': 'We write it by hand: Python, Java, Spring Boot. So the project does not hit a template ceiling once the task grows.',
      'faq.kicker': 'No surprises',
      'faq.title': 'Frequently asked',
      'contact.kicker': 'Next',
      'contact.title': 'Tell us what needs automating',
      'contact.lead': 'Describe the task in a couple of sentences — we will tell you if it is doable, what it costs and how long it takes.',
      'contact.tg': 'Message on Telegram',
      'contact.tgText': 'Hi! I would like to discuss a project.',
      'contact.mail': 'Email',
      'lead.name': 'What should I call you',
      'lead.contact': 'Where to reply',
      'lead.task': 'What needs building',
      'lead.send': 'Send the request',
      'lead.note': 'The request lands in my Telegram. Nothing is collected beyond these three fields.',
      'lead.or': 'Or straight away:',
      'lead.required': 'Add a name, a contact, and describe the task in at least one sentence.',
      'lead.sending': 'Sending…',
      'lead.ok': 'Sent. I will reply through the channel you gave.',
      'lead.offline': 'The form is not answering right now. Write on Telegram or by email — buttons below.'
    }
  };

  return { LINKS, GITHUB_USER, HIDDEN_REPOS, SELF_REPO, OWN_CODE, PROJECTS, SERVICES, PROCESS, FAQ, EXTRA_STACK, PLURALS, I18N };
})();
