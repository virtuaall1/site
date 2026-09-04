/**
 * Демонстраційні дані майстерні. Замовлення вигадані, але структура
 * така сама, як у робочій базі: одна заявка — один рядок, статус
 * і виконавець змінюються, сума фіксується на момент прийому.
 */
window.SHOP = {
  today: '2026-09-04',

  masters: [
    { id: 'md', name: 'Мирослава Д.', role: 'Пайка, мікросхеми' },
    { id: 'iv', name: 'Ігор В.',      role: 'Дисплеї, корпуси' },
    { id: 'tk', name: 'Тарас К.',     role: 'Ноутбуки, чистка' }
  ],

  /* status: new | work | wait | done */
  orders: [
    { no: '2461', client: 'Оксана Л.',  device: 'iPhone 12, не тримає заряд',      master: 'md', status: 'work', due: '2026-09-05', sum: 1850,
      checks: ['Діагностика', 'Заміна акумулятора', 'Тест 24 год'] },
    { no: '2460', client: 'СТО «Вектор»', device: 'Ноутбук Dell, чистка + термопаста', master: 'tk', status: 'work', due: '2026-09-04', sum: 900,
      checks: ['Розбір', 'Чистка радіатора', 'Заміна термопасти', 'Складання'] },
    { no: '2459', client: 'Богдан Р.',  device: 'Samsung A54, розбите скло',       master: 'iv', status: 'wait', due: '2026-09-02', sum: 2400,
      checks: ['Діагностика', 'Замовити скло', 'Заміна', 'Перевірка сенсора'] },
    { no: '2458', client: 'Кав’ярня «Зерно»', device: 'Термінал оплати, не бачить мережу', master: 'md', status: 'new', due: '2026-09-06', sum: 1200,
      checks: ['Діагностика', 'Ремонт модуля', 'Тест на місці'] },
    { no: '2457', client: 'Ірина П.',   device: 'MacBook Air, залито водою',       master: 'tk', status: 'wait', due: '2026-09-09', sum: 5600,
      checks: ['Ультразвукова чистка', 'Заміна ланцюга живлення', 'Тест 48 год'] },
    { no: '2456', client: 'Дмитро Ш.',  device: 'PS5, перегрів',                   master: 'iv', status: 'work', due: '2026-09-07', sum: 1400,
      checks: ['Розбір', 'Чистка', 'Термопрокладки'] },
    { no: '2455', client: 'Аптека №4',  device: 'Принтер етикеток, зажовує',       master: 'md', status: 'new', due: '2026-09-08', sum: 750,
      checks: ['Діагностика', 'Заміна ролика'] },

    { no: '2454', client: 'Марта С.',   device: 'iPhone 13, заміна екрана',        master: 'iv', status: 'done', due: '2026-09-01', sum: 4100, week: 36 },
    { no: '2453', client: 'Олег Т.',    device: 'Xiaomi, не заряджається',         master: 'md', status: 'done', due: '2026-09-01', sum: 950,  week: 36 },
    { no: '2452', client: 'Школа №3',   device: 'Проєктор, лампа',                 master: 'tk', status: 'done', due: '2026-08-29', sum: 3200, week: 35 },
    { no: '2451', client: 'Андрій К.',  device: 'Ноутбук HP, SSD + пам’ять',       master: 'tk', status: 'done', due: '2026-08-28', sum: 2800, week: 35 },
    { no: '2450', client: 'Юлія В.',    device: 'iPad, заміна скла',               master: 'iv', status: 'done', due: '2026-08-27', sum: 3400, week: 35 },
    { no: '2449', client: 'Ремонт «Кліщі»', device: 'Паяльна станція, калібрування', master: 'md', status: 'done', due: '2026-08-22', sum: 1600, week: 34 },
    { no: '2448', client: 'Наталя Б.',  device: 'Samsung S21, батарея',            master: 'md', status: 'done', due: '2026-08-21', sum: 1700, week: 34 },
    { no: '2447', client: 'Тарас О.',   device: 'Монітор LG, підсвітка',           master: 'iv', status: 'done', due: '2026-08-19', sum: 2100, week: 34 },
    { no: '2446', client: 'Сергій М.',  device: 'ПК, збірка + перенос даних',      master: 'tk', status: 'done', due: '2026-08-14', sum: 4500, week: 33 },
    { no: '2445', client: 'Ольга Ж.',   device: 'Робот-пилосос, не тримає карту',  master: 'md', status: 'done', due: '2026-08-13', sum: 1250, week: 33 }
  ],

  weeks: [
    { n: 33, label: '11–17 серп' },
    { n: 34, label: '18–24 серп' },
    { n: 35, label: '25–31 серп' },
    { n: 36, label: '1–7 вер' }
  ],

  labels: {
    new:  'Нова',
    work: 'В роботі',
    wait: 'Чекає деталь',
    done: 'Готово'
  }
};
