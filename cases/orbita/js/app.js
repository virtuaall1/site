/**
 * Орбіта — демонстрація ролей.
 * Дані одні, а видимість різна: менеджер веде всі заявки, майстер
 * бачить лише свої наряди без сум, власник — гроші й підсумки.
 * Усе рахується з тих самих записів, нічого не намальовано наперед.
 */
(() => {
  'use strict';

  const { today, masters, orders, weeks, labels } = window.SHOP;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ORDER = ['new', 'work', 'wait', 'done'];
  const ME = 'md';                       // роль майстра показуємо від імені Мирослави
  const money = n => n.toLocaleString('uk-UA');
  const masterName = id => (masters.find(m => m.id === id) || {}).name || '—';

  const dayMs = 86400000;
  const daysLate = due => Math.round((Date.parse(today) - Date.parse(due)) / dayMs);

  let filter = 'all';

  /* =======================================================
     Ролі
     ======================================================= */
  const views = {
    manager: $('#view-manager'),
    master: $('#view-master'),
    owner: $('#view-owner')
  };

  $$('.role').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;

      $$('.role').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', String(on));
      });

      Object.entries(views).forEach(([name, node]) => { node.hidden = name !== role; });
      $('#tbRole').textContent = btn.querySelector('.role-n').textContent;

      if (role === 'owner') drawOwner();
    });
  });

  /* =======================================================
     Менеджер: фільтри, таблиця, підсумки
     ======================================================= */
  function buildFilters() {
    const box = $('#filters');
    box.textContent = '';

    const make = (key, text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('aria-pressed', String(filter === key));
      b.append(document.createTextNode(text));

      const count = document.createElement('b');
      count.textContent = String(key === 'all'
        ? orders.length
        : orders.filter(o => o.status === key).length);
      b.append(count);

      b.addEventListener('click', () => { filter = key; buildFilters(); buildRows(); });
      box.append(b);
    };

    make('all', 'Усі');
    ORDER.forEach(k => make(k, labels[k]));
  }

  function buildRows() {
    const body = $('#rows');
    body.textContent = '';

    const list = orders.filter(o => filter === 'all' || o.status === filter);

    list.forEach(o => {
      const tr = document.createElement('tr');

      const cell = (cls, text) => {
        const td = document.createElement('td');
        td.className = cls;
        td.textContent = text;
        tr.append(td);
        return td;
      };

      cell('c-no', o.no);
      cell('c-client', o.client);
      cell('c-device', o.device);
      cell('c-master', masterName(o.master));

      const due = cell('c-due', o.due.slice(8) + '.' + o.due.slice(5, 7));
      const late = daysLate(o.due);
      if (o.status !== 'done' && late > 0) {
        due.classList.add('is-late');
        const note = document.createElement('small');
        note.textContent = `+${late} дн.`;
        due.append(note);
      }

      // статус — кнопка: клік проводить заявку далі по колу
      const tdSt = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `st st-${o.status}`;
      btn.textContent = labels[o.status];
      btn.title = 'Наступний статус';
      btn.addEventListener('click', () => {
        o.status = ORDER[(ORDER.indexOf(o.status) + 1) % ORDER.length];
        if (o.status === 'done' && !o.week) o.week = 36;
        buildFilters();
        buildRows();
        buildTotals();
      });
      tdSt.append(btn);
      tr.append(tdSt);

      cell('c-sum', money(o.sum) + ' ₴');
      body.append(tr);
    });

    if (!list.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'c-device';
      td.textContent = 'За цим статусом заявок немає.';
      tr.append(td);
      body.append(tr);
    }
  }

  function buildTotals() {
    const open = orders.filter(o => o.status !== 'done');
    const late = open.filter(o => daysLate(o.due) > 0);
    const inWork = open.reduce((s, o) => s + o.sum, 0);

    const box = $('#totals');
    box.textContent = '';

    [
      ['Відкритих заявок', String(open.length)],
      ['Прострочено', String(late.length)],
      ['Грошей у роботі', money(inWork) + ' ₴'],
      ['Закрито всього', String(orders.filter(o => o.status === 'done').length)]
    ].forEach(([k, v]) => {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      wrap.append(dt, dd);
      box.append(wrap);
    });
  }

  /* =======================================================
     Майстер: тільки свої наряди, із чек-листом
     ======================================================= */
  function buildJobs() {
    const box = $('#jobs');
    box.textContent = '';

    orders
      .filter(o => o.master === ME && o.status !== 'done')
      .forEach(o => {
        const li = document.createElement('li');
        li.className = 'job';

        const top = document.createElement('div');
        top.className = 'job-top';
        const no = document.createElement('span');
        no.className = 'job-no';
        no.textContent = '№ ' + o.no;
        const st = document.createElement('span');
        st.className = `st st-${o.status}`;
        st.style.cursor = 'default';
        st.textContent = labels[o.status];
        top.append(no, st);

        const device = document.createElement('p');
        device.className = 'job-device';
        device.textContent = o.device;

        const client = document.createElement('p');
        client.className = 'job-client';
        client.textContent = `${o.client} · до ${o.due.slice(8)}.${o.due.slice(5, 7)}`;

        const checks = document.createElement('ul');
        checks.className = 'job-checks';

        const progress = document.createElement('div');
        progress.className = 'job-progress';
        const track = document.createElement('span');
        track.className = 'job-track';
        const fill = document.createElement('i');
        fill.className = 'job-fill';
        track.append(fill);
        const count = document.createElement('span');
        progress.append(track, count);

        const boxes = [];
        const refresh = () => {
          const done = boxes.filter(b => b.checked).length;
          fill.style.width = `${(done / boxes.length) * 100}%`;
          count.textContent = `${done}/${boxes.length}`;
        };

        o.checks.forEach((text, i) => {
          const item = document.createElement('li');
          const label = document.createElement('label');
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = o.status === 'work' && i === 0;
          const mark = document.createElement('span');
          mark.className = 'box';
          const txt = document.createElement('span');
          txt.className = 'txt';
          txt.textContent = text;
          input.addEventListener('change', refresh);
          label.append(input, mark, txt);
          item.append(label);
          checks.append(item);
          boxes.push(input);
        });

        refresh();
        li.append(top, device, client, checks, progress);
        box.append(li);
      });
  }

  /* =======================================================
     Власник: гроші, тижні, майстри
     ======================================================= */
  function drawOwner() {
    const done = orders.filter(o => o.status === 'done');
    const total = done.reduce((s, o) => s + o.sum, 0);
    const avg = done.length ? Math.round(total / done.length) : 0;

    const kpi = $('#kpi');
    kpi.textContent = '';
    [
      ['Виторг за місяць', money(total), '₴'],
      ['Закритих нарядів', String(done.length), ''],
      ['Середній чек', money(avg), '₴'],
      ['У роботі зараз', String(orders.filter(o => o.status !== 'done').length), '']
    ].forEach(([k, v, unit]) => {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      if (unit) {
        const u = document.createElement('span');
        u.className = 'unit';
        u.textContent = unit;
        dd.append(u);
      }
      wrap.append(dt, dd);
      kpi.append(wrap);
    });

    drawChart(done);
    drawMasters(done, total);
  }

  /** Стовпчики виторгу по тижнях. Підпис над кожним — те саме число,
   *  яке дає висота, тож графік не треба «читати на око». */
  function drawChart(done) {
    const data = weeks.map(w => ({
      label: w.label,
      value: done.filter(o => o.week === w.n).reduce((s, o) => s + o.sum, 0)
    }));

    const max = Math.max(...data.map(d => d.value), 1);
    const W = 720, H = 260;
    const padL = 16, padR = 16, padT = 34, padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const step = plotW / data.length;
    const barW = Math.min(74, step * 0.5);

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'chart');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label',
      'Виторг за тижнями: ' + data.map(d => `${d.label} — ${d.value} гривень`).join(', '));

    const el = (name, attrs, text) => {
      const node = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
      if (text !== undefined) node.textContent = text;
      svg.append(node);
      return node;
    };

    // базова лінія
    el('line', { class: 'axis', x1: padL, y1: padT + plotH, x2: W - padR, y2: padT + plotH });

    data.forEach((d, i) => {
      const h = (d.value / max) * plotH;
      const x = padL + step * i + (step - barW) / 2;
      const y = padT + plotH - h;

      el('rect', {
        class: i === data.length - 1 ? 'bar-last' : 'bar',
        x, y, width: barW, height: Math.max(h, 2)
      });
      el('text', { class: 'val', x: x + barW / 2, y: y - 10, 'text-anchor': 'middle' }, money(d.value));
      el('text', { class: 'lbl', x: x + barW / 2, y: padT + plotH + 22, 'text-anchor': 'middle' }, d.label);
    });

    const wrap = $('#chart');
    wrap.textContent = '';
    wrap.append(svg);
  }

  function drawMasters(done, total) {
    const box = $('#bars');
    box.textContent = '';

    masters
      .map(m => ({ ...m, sum: done.filter(o => o.master === m.id).reduce((s, o) => s + o.sum, 0) }))
      .sort((a, b) => b.sum - a.sum)
      .forEach(m => {
        const li = document.createElement('li');

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = m.name;

        const track = document.createElement('span');
        track.className = 'track';
        const fill = document.createElement('i');
        fill.className = 'fill';
        fill.style.width = `${total ? (m.sum / total) * 100 : 0}%`;
        track.append(fill);

        const sum = document.createElement('span');
        sum.className = 'sum';
        sum.textContent = money(m.sum) + ' ₴';

        li.append(name, track, sum);
        box.append(li);
      });
  }

  /* =======================================================
     Старт
     ======================================================= */
  buildFilters();
  buildRows();
  buildTotals();
  buildJobs();
})();
