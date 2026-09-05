/**
 * Данные демо. Те же услуги, мастера и график, что в config.py у бота —
 * страница показывает ровно то, что делает настоящий код.
 */
window.SALON = {
  services: [
    { code: 'haircut', title: 'Чоловіча стрижка', minutes: 45, price: 45000 },
    { code: 'beard',   title: 'Борода й вуса',    minutes: 30, price: 30000 },
    { code: 'combo',   title: 'Стрижка + борода', minutes: 75, price: 65000 },
    { code: 'kids',    title: 'Дитяча стрижка',   minutes: 30, price: 35000 }
  ],
  masters: [
    { code: 'ihor',  name: 'Ігор',  does: ['haircut', 'beard', 'combo', 'kids'] },
    { code: 'taras', name: 'Тарас', does: ['haircut', 'combo'] },
    { code: 'olya',  name: 'Оля',   does: ['haircut', 'kids'] }
  ],
  /* смена по дням недели: 0 — понедельник, пусто — выходной */
  hours: { 0: [10, 20], 1: [10, 20], 2: [10, 20], 3: [10, 20], 4: [10, 21], 5: [11, 18] },
  step: 15,
  /* уже занятое — чтобы сетка не была пустой и было видно, как окна схлопываются */
  taken: [
    { master: 'ihor',  day: 0, from: '11:00', minutes: 75 },
    { master: 'ihor',  day: 0, from: '15:30', minutes: 45 },
    { master: 'taras', day: 0, from: '12:00', minutes: 45 },
    { master: 'olya',  day: 0, from: '13:00', minutes: 30 },
    { master: 'ihor',  day: 1, from: '10:00', minutes: 45 },
    { master: 'taras', day: 1, from: '16:00', minutes: 75 },
    { master: 'ihor',  day: 2, from: '18:00', minutes: 30 }
  ]
};
