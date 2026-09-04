/**
 * Демонстрація бота магазину.
 *
 * Той самий сценарій, що й у робочого бота на aiogram: каталог за
 * категоріями, кошик, оформлення трьома кроками з перевіркою, а далі
 * замовлення падає власнику. Тут «власник» — панель праворуч, і вона
 * читає рівно ті записи, які склав чат.
 *
 * Гроші всюди в копійках цілими числами; кома зʼявляється лише
 * у money() перед виводом.
 */
(() => {
  'use strict';

  const { brand, categories, products, delivery } = window.SHOP;

  const $ = sel => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const chat = $('#chat');
  const input = $('#input');
  const sendBtn = $('#send');
  const form = $('#say');
  const botState = $('#botState');
  const ordersBox = $('#orders');
  const emptyMsg = $('#empty');
  const adminSum = $('#adminSum');

  const money = kop => (kop / 100).toFixed(2).replace('.', ',') + ' ₴';

  let cart = [];        // [{ id, qty }]
  let step = 'idle';    // idle | name | phone | address
  let draft = {};
  let orders = [];
  let nextNo = 1001;

  /* =======================================================
     Малювання повідомлень
     ======================================================= */
  function scrollDown() { chat.scrollTop = chat.scrollHeight; }

  /** Текст бота: рядки з * стають напівжирними, з ~ — тьмяними */
  function botLine(text) {
    const node = document.createElement('div');
    node.className = 'msg msg-bot';

    text.split('\n').forEach((line, i) => {
      if (i) node.append(document.createElement('br'));

      if (line.startsWith('*')) {
        const b = document.createElement('b');
        b.textContent = line.slice(1);
        node.append(b);
      } else if (line.startsWith('~')) {
        const dim = document.createElement('span');
        dim.className = 'dim';
        dim.textContent = line.slice(1);
        node.append(dim);
      } else {
        node.append(document.createTextNode(line));
      }
    });

    chat.append(node);
    scrollDown();
    return node;
  }

  function meLine(text) {
    const node = document.createElement('div');
    node.className = 'msg msg-me';
    node.textContent = text;
    chat.append(node);
    scrollDown();
  }

  /** Кнопки під повідомленням. Після натискання зникають — як у боті. */
  function keys(list) {
    const row = document.createElement('div');
    row.className = 'keys';

    list.forEach(([label, action, main]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = main ? 'key key-main' : 'key';
      b.textContent = label;
      b.addEventListener('click', () => {
        meLine(label);
        row.remove();
        action();
      });
      row.append(b);
    });

    chat.append(row);
    scrollDown();
    return row;
  }

  /** Невелика пауза, щоб репліки не сипалися одночасно */
  function say(text, after) {
    if (reduceMotion) { botLine(text); if (after) after(); return; }

    botState.textContent = 'друкує…';
    setTimeout(() => {
      botState.textContent = 'бот';
      botLine(text);
      if (after) after();
    }, 260);
  }

  /* =======================================================
     Кроки сценарію
     ======================================================= */
  function start() {
    say(`*${brand} — магазин кави\nОбирай зерно, а ми привеземо. Доставка ${money(delivery)}.`, () => {
      keys([
        ['Каталог', showCategories, true],
        ['Кошик', showCart]
      ]);
    });
  }

  function showCategories() {
    say('Обери категорію:', () => {
      keys([
        ...categories.map(c => [c.name, () => showCategory(c.id)]),
        ['← Назад', start]
      ]);
    });
  }

  function showCategory(catId) {
    const list = products.filter(p => p.cat === catId);
    const text = list
      .map(p => `*${p.title}\n~${p.note} · ${p.unit}\n${money(p.price)}`)
      .join('\n\n');

    say(text, () => {
      keys([
        ...list.map(p => [`+ ${p.title}`, () => addToCart(p.id)]),
        ['← Категорії', showCategories]
      ]);
    });
  }

  function addToCart(id) {
    const line = cart.find(i => i.id === id);
    if (line) line.qty += 1;
    else cart.push({ id, qty: 1 });

    const p = products.find(x => x.id === id);
    say(`Додано: *${p.title}\nУ кошику ${count()} поз. на ${money(sum())}`, () => {
      keys([
        ['Оформити', showCart, true],
        ['Ще щось', showCategories]
      ]);
    });
  }

  const count = () => cart.reduce((s, i) => s + i.qty, 0);
  const sum = () => cart.reduce((s, i) => s + products.find(p => p.id === i.id).price * i.qty, 0);

  function showCart() {
    if (!cart.length) {
      say('Кошик порожній.', () => keys([['Каталог', showCategories, true]]));
      return;
    }

    const lines = cart.map(i => {
      const p = products.find(x => x.id === i.id);
      return `${p.title} × ${i.qty} — ${money(p.price * i.qty)}`;
    }).join('\n');

    say(`*Кошик\n${lines}\n~Доставка — ${money(delivery)}\n*До сплати: ${money(sum() + delivery)}`, () => {
      keys([
        ['Оформити замовлення', askName, true],
        ['Очистити', clearCart],
        ['← Каталог', showCategories]
      ]);
    });
  }

  function clearCart() {
    cart = [];
    say('Кошик очищено.', () => keys([['Каталог', showCategories, true]]));
  }

  /* --- оформлення: по одному питанню за раз --- */
  function ask(field, text) {
    step = field;
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    say(text);
  }

  const askName = () => ask('name', 'Крок 1 з 3.\nЯк до вас звертатися?');
  const askPhone = () => ask('phone', 'Крок 2 з 3.\nТелефон для звʼязку?');
  const askAddress = () => ask('address', 'Крок 3 з 3.\nКуди везти? Місто, відділення або адреса.');

  function handleAnswer(value) {
    const text = value.trim();
    if (!text) return;

    meLine(text);
    input.value = '';

    if (step === 'name') {
      if (text.length < 2) { say('Замало. Напишіть імʼя повністю.'); return; }
      draft.name = text;
      askPhone();
      return;
    }

    if (step === 'phone') {
      const digits = text.replace(/\D/g, '');
      if (digits.length < 10) { say('Схоже на неповний номер. Потрібно щонайменше 10 цифр.'); return; }
      draft.phone = text;
      askAddress();
      return;
    }

    if (step === 'address') {
      if (text.length < 5) { say('Опишіть докладніше — місто й відділення або вулицю.'); return; }
      draft.address = text;
      confirm();
    }
  }

  function confirm() {
    step = 'idle';
    input.disabled = true;
    sendBtn.disabled = true;

    say(`*Перевірте замовлення\n${draft.name}\n${draft.phone}\n${draft.address}\n*До сплати: ${money(sum() + delivery)}`, () => {
      keys([
        ['Підтверджую', place, true],
        ['Змінити дані', askName]
      ]);
    });
  }

  function place() {
    const now = new Date();

    // назва й ціна фіксуються тут: зміна каталогу вже не перепише чек
    const order = {
      no: nextNo++,
      when: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      name: draft.name,
      phone: draft.phone,
      address: draft.address,
      lines: cart.map(i => {
        const p = products.find(x => x.id === i.id);
        return { title: p.title, qty: i.qty, price: p.price };
      }),
      total: sum() + delivery
    };

    orders.unshift(order);
    renderAdmin();

    say(`*Замовлення №${order.no} прийнято\nВласник уже отримав сповіщення.\n~Дивись панель праворуч — запис зʼявився там.`, () => {
      cart = [];
      draft = {};
      keys([['Замовити ще', showCategories, true]]);
    });
  }

  /* =======================================================
     Панель власника
     ======================================================= */
  function renderAdmin() {
    if (emptyMsg) emptyMsg.remove();
    ordersBox.textContent = '';

    orders.forEach(o => {
      const box = document.createElement('article');
      box.className = 'order';

      const top = document.createElement('div');
      top.className = 'order-top';
      const no = document.createElement('span');
      no.className = 'order-no';
      no.textContent = `№ ${o.no}`;
      const when = document.createElement('span');
      when.className = 'order-when';
      when.textContent = o.when;
      top.append(no, when);

      const who = document.createElement('p');
      who.className = 'order-who';
      who.textContent = o.name;
      const contacts = document.createElement('span');
      contacts.textContent = ` · ${o.phone} · ${o.address}`;
      who.append(contacts);

      const lines = document.createElement('ul');
      lines.className = 'order-lines';
      o.lines.forEach(l => {
        const li = document.createElement('li');
        const t = document.createElement('span');
        t.textContent = l.title;
        const q = document.createElement('span');
        q.className = 'q';
        q.textContent = `× ${l.qty}`;
        const s = document.createElement('span');
        s.className = 's';
        s.textContent = money(l.price * l.qty);
        li.append(t, q, s);
        lines.append(li);
      });

      const total = document.createElement('div');
      total.className = 'order-total';
      const tl = document.createElement('span');
      tl.textContent = 'Разом із доставкою';
      const tv = document.createElement('span');
      tv.textContent = money(o.total);
      total.append(tl, tv);

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Сповіщення надіслано';

      box.append(top, who, lines, total, badge);
      ordersBox.append(box);
    });

    adminSum.textContent = '';
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    [
      ['Замовлень', String(orders.length)],
      ['Виторг', money(revenue)],
      ['Середній чек', orders.length ? money(Math.round(revenue / orders.length)) : '—']
    ].forEach(([k, v]) => {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      wrap.append(dt, dd);
      adminSum.append(wrap);
    });
  }

  /* =======================================================
     Ввід і перезапуск
     ======================================================= */
  form.addEventListener('submit', event => {
    event.preventDefault();
    handleAnswer(input.value);
  });

  $('#restart').addEventListener('click', () => {
    chat.textContent = '';
    cart = [];
    draft = {};
    step = 'idle';
    input.disabled = true;
    sendBtn.disabled = true;
    start();
  });

  start();
})();
