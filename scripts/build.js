#!/usr/bin/env node
/**
 * Собирает то, что реально уезжает на сервер.
 *
 *   node scripts/build.js   →   dist/
 *
 * Исходники в репозитории остаются читаемыми: с комментариями,
 * отступами и длинными именами. На сервер едет сжатая копия —
 * комментарии сняты, пробелы убраны, локальные имена укорочены.
 *
 * Это не защита. Любой фронтенд браузер обязан получить целиком, и
 * из минифицированного файла та же логика достаётся за полчаса.
 * Смысл другой: не отдавать вместе с кодом объяснения к нему и
 * возить по сети меньше байт.
 *
 * Заодно из сборки выпадает всё, чему на сайте делать нечего:
 * макеты для инстаграма (19 МБ), сами скрипты сборки и readme.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { minify: minifyJs } = require('terser');
const CleanCss = require('clean-css');
const { minify: minifyHtml } = require('html-minifier-terser');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');

/* Что берём. Всё остальное на сервер не едет. */
const INCLUDE = ['index.html', 'robots.txt', 'sitemap.xml', '_headers', 'css', 'js', 'img', 'cases'];
/* Что выкидываем даже изнутри включённых папок. */
const DROP = /(^|\/)(README\.md|\.DS_Store)$/;

const version = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);

/* Библиотеки анимации, если их успел скачать scripts/vendor.js.
   Есть папка — переписываем адреса на свои и убираем чужие домены
   из CSP: на странице не останется ни одного стороннего скрипта.
   Нет папки (обычная локальная разработка) — всё как было, с CDN. */
const hasVendor = fs.existsSync(path.join(root, 'vendor'));
const VENDOR_SWAP = [
  ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js', 'vendor/gsap.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js', 'vendor/scrolltrigger.min.js'],
  ['https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js', 'vendor/lenis.min.js']
];

const css = new CleanCss({ level: 1, format: false });

const HTML_OPTS = {
  collapseWhitespace: true,
  conservativeCollapse: false,
  removeComments: true,
  removeRedundantAttributes: false,   // type="button" тут несёт смысл
  keepClosingSlash: true,             // внутри svg это обязательно
  minifyCSS: true,
  minifyJS: true
};

let saved = 0;
let total = 0;

async function shrink(file, src) {
  const ext = path.extname(file);
  if (ext === '.js') {
    if (hasVendor) for (const [from, to] of VENDOR_SWAP) src = src.split(from).join(to);
    return (await minifyJs(src, { format: { comments: false } })).code;
  }
  if (ext === '.css') {
    const res = css.minify(src);
    if (res.errors.length) throw new Error(res.errors.join('; '));
    return res.styles;
  }
  if (ext === '.html') {
    /* Версия своим css и js: браузер иначе месяцами держит в кеше
       старый скрипт рядом со свежей разметкой, и сайт ломается
       ровно наполовину. Чужие адреса и шрифты не трогаем. */
    let stamped = src.replace(/(src|href)="((?:\.\.\/)*(?:js|css)\/[^"?]+)"/g,
      (_, attr, url) => `${attr}="${url}?v=${version}"`);
    if (hasVendor) {
      stamped = stamped.replace("script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
                                "script-src 'self'");
    }
    return minifyHtml(stamped, HTML_OPTS);
  }
  return null;                        // картинки и прочее копируем как есть
}

async function walk(rel) {
  const from = path.join(root, rel);
  const to = path.join(out, rel);
  const stat = fs.statSync(from);

  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) await walk(path.join(rel, name));
    return;
  }
  if (DROP.test(rel.split(path.sep).join('/'))) return;

  fs.mkdirSync(path.dirname(to), { recursive: true });
  // vendor/ уже минифицирован автором библиотеки — второй проход
  // ничего не сэкономит и только даёт шанс что-нибудь сломать
  if (rel.split(path.sep)[0] === 'vendor' || !/\.(js|css|html)$/.test(rel)) {
    fs.copyFileSync(from, to);        // картинки и прочее — как есть
    return;
  }

  const min = await shrink(rel, fs.readFileSync(from, 'utf8'));
  const before = stat.size;
  fs.writeFileSync(to, min);
  total += before;
  saved += before - Buffer.byteLength(min, 'utf8');
  console.log(`  ${rel.padEnd(34)} ${(before / 1024).toFixed(1)} → ${(Buffer.byteLength(min, 'utf8') / 1024).toFixed(1)} КБ`);
}

(async () => {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const item of INCLUDE) await walk(item);
  if (hasVendor) await walk('vendor');
  console.log(hasVendor
    ? '\nБиблиотеки взяты из vendor/ — сторонних скриптов на странице не осталось.'
    : '\nvendor/ нет: gsap и lenis останутся на CDN (для локальной сборки это нормально).');
  console.log(`\nСборка в dist/: ${(total / 1024).toFixed(1)} КБ текста сжато до ` +
              `${((total - saved) / 1024).toFixed(1)} КБ (−${Math.round(saved / total * 100)}%), версия ${version}.`);
})().catch(err => { console.error('Сборка не собралась:', err.message); process.exit(1); });
