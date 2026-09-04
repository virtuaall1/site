#!/usr/bin/env node
/**
 * Проставляет версию своим css/js в index.html перед публикацией:
 *   js/app.js  →  js/app.js?v=<хеш коммита>
 *
 * Без этого браузер может месяцами держать в кеше старый скрипт рядом со
 * свежей разметкой — и сайт ломается ровно наполовину. Запускается в CI,
 * локальные файлы при разработке остаются с чистыми путями.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
const version = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);

let html = fs.readFileSync(file, 'utf8');
let count = 0;

// только свои файлы: внешние CDN и шрифты не трогаем
html = html.replace(/(src|href)="((?:js|css)\/[^"?]+)"/g, (_, attr, url) => {
  count++;
  return `${attr}="${url}?v=${version}"`;
});

fs.writeFileSync(file, html);
console.log(`Проставлена версия ${version} для ${count} файлов.`);
