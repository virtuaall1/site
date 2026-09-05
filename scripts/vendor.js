#!/usr/bin/env node
/**
 * Складывает чужие библиотеки к себе.
 *
 *   node scripts/vendor.js   →   vendor/
 *
 * Зачем: пока gsap, ScrollTrigger и lenis грузятся с cdnjs и
 * jsdelivr, у страницы два чужих домена, которым разрешено
 * исполнять код в браузере посетителя. Взломают любой из них —
 * и на сайте выполнится что угодно.
 *
 * После этого шага сборка подменяет адреса на локальные, и в CSP
 * остаётся script-src 'self'. Скачивание происходит один раз на
 * сборочной машине, а не у каждого посетителя.
 *
 * Версии прибиты гвоздями. Не скачалось — сборка падает, и наружу
 * едет прошлая рабочая версия сайта, а не сломанная новая.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILES = [
  { name: 'gsap.min.js', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js' },
  { name: 'scrolltrigger.min.js', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js' },
  { name: 'lenis.min.js', url: 'https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js' }
];

const MIN_BYTES = 5000;   // меньше — значит вместо библиотеки приехала страница ошибки

const dir = path.join(__dirname, '..', 'vendor');

(async () => {
  fs.mkdirSync(dir, { recursive: true });

  for (const { name, url } of FILES) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} — HTTP ${res.status}`);

    const body = Buffer.from(await res.arrayBuffer());
    if (body.length < MIN_BYTES) throw new Error(`${url} — всего ${body.length} байт`);

    fs.writeFileSync(path.join(dir, name), body);
    const sum = crypto.createHash('sha384').update(body).digest('base64');
    console.log(`  ${name.padEnd(22)} ${(body.length / 1024).toFixed(1)} КБ  sha384-${sum}`);
  }

  console.log('\nБиблиотеки лежат в vendor/ — сборка подставит их вместо CDN.');
})().catch(err => { console.error('Библиотеки не скачались:', err.message); process.exit(1); });
