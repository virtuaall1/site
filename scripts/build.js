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
const { loadSite, jsonLd, sitemap, RATE } = require('./seo.js');
const prerender = require('./prerender.js');
const { split } = require('./lang.js');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');

/* Что берём. Всё остальное на сервер не едет. */
/* preview/ — черновики оформления. Они выкладываются вместе с сайтом
   (иначе их не посмотреть с телефона), но закрыты от поиска в
   robots.txt и не значатся в sitemap. */
const INCLUDE = ['index.html', 'robots.txt', 'sitemap.xml', '_headers', 'sw.js',
  'css', 'js', 'img', 'fonts', 'cases', 'preview'];

/* Временно снятые кейсы. Исходники остаются в репозитории — они ещё
   пригодятся, — но в dist не попадают, иначе страница осталась бы
   доступной по прямому адресу. Чтобы вернуть, достаточно убрать
   строку отсюда и вернуть запись в PROJECTS. */
const SKIP_CASES = ['orbita', 'plitkarka'];
const skipped = rel =>
  SKIP_CASES.some(name =>
    rel === `cases/${name}` ||                       // папка кейса целиком
    new RegExp(`^img/cases/${name}\\.[a-z0-9]+$`).test(rel));  // снимок в любом формате
/* Что выкидываем даже изнутри включённых папок. */
const DROP = /(^|\/)(README\.md|\.DS_Store)$/;

const version = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);

/* Адрес сайта. В исходниках он записан как GitHub Pages, потому что
   сейчас сайт живёт там. При переезде (Cloudflare Pages, Netlify,
   свой домен) достаточно задать SITE_URL в настройках сборки — и
   canonical, og:url, sitemap и ссылки на кейсы поедут за ним.
   Внутренние ссылки везде относительные, их менять не нужно. */
const HOME = 'https://virtuaall1.github.io/site/';
const site = (process.env.SITE_URL || HOME).replace(/\/*$/, '/');

/* Библиотеки анимации, если их успел скачать scripts/vendor.js.
   Есть папка — переписываем адреса на свои и убираем чужие домены
   из CSP: на странице не останется ни одного стороннего скрипта.
   Нет папки (обычная локальная разработка) — всё как было, с CDN. */
const VENDOR_SWAP = [
  ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js', 'vendor/gsap.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js', 'vendor/scrolltrigger.min.js'],
  ['https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js', 'vendor/lenis.min.js']
];

/* Проверяем файлы, а не папку: vendor.js создаёт каталог до
   скачивания, и если скачать не вышло, остаётся пустая папка.
   По ней сборка раньше решала, что библиотеки на месте, и
   переписывала адреса на файлы, которых нет, — сайт уезжал наружу
   без анимаций и молча. */
const hasVendor = VENDOR_SWAP.every(([, local]) => {
  const file = path.join(root, local);
  return fs.existsSync(file) && fs.statSync(file).size > 5000;
});

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

/* Свой код по языкам — то же, что GitHub рисует у репозитория.
   Считаем сами, потому что приватный репозиторий языки наружу не
   отдаёт, а код в нём остаётся нашим: сайт студии и три сайта из
   кейсов, почти 300 КБ. Раскладку подставляем в content.js. */
const LANG_BY_EXT = { '.js': 'JavaScript', '.css': 'CSS', '.html': 'HTML' };
const NOT_CODE = new Set(['node_modules', 'dist', 'vendor', '.git']);

function ownCode(dir = root, acc = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (NOT_CODE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { ownCode(full, acc); continue; }
    const lang = LANG_BY_EXT[path.extname(entry.name)];
    if (lang) acc[lang] = (acc[lang] || 0) + fs.statSync(full).size;
  }
  return acc;
}

const OWN_CODE = ownCode();

async function shrink(file, src) {
  const ext = path.extname(file);
  if (site !== HOME) src = src.split(HOME).join(site);
  /* content.js собираем заново, а не сжимаем исходник. В нём оба
     языка лежат вперемешку — так удобно править, но в браузер
     уезжало вдвое больше нужного. Здесь остаётся общее плюс
     украинский; английский ждёт отдельным файлом и приезжает,
     только если человек переключил язык. */
  if (file.endsWith('content.js')) {
    const [base] = split(loadSite(root));
    base.OWN_CODE = OWN_CODE;
    base.EN_FILE = `js/lang-en.js?v=${version}`;   // адрес меняется вместе со сборкой
    let json = JSON.stringify(base);
    if (site !== HOME) json = json.split(HOME).join(site);
    return `window.SITE=${json};`;
  }
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
    /* Структурированные данные. Блок с type="application/ld+json" —
       не скрипт, а данные: браузер его не исполняет, и строгий CSP
       ему не мешает. */
    if (stamped.includes('<!--JSON-LD-->')) {
      const ld = JSON.stringify(jsonLd(loadSite(root), site));
      stamped = stamped.replace('<!--JSON-LD-->',
        `<script type="application/ld+json">${ld}</script>`);
    }
    /* Списки кейсов, цен, шагов и вопросов — сразу в разметку.
       До этого их рисовал только скрипт, и без него страница была
       пустой: четыре заголовка и ничего под ними. */
    if (file === 'index.html') {
      const data = loadSite(root);
      stamped = prerender.inject(stamped, prerender.make(data, RATE));
    }
    return minifyHtml(stamped, HTML_OPTS);
  }
  return null;                        // картинки и прочее копируем как есть
}

async function walk(rel) {
  const from = path.join(root, rel);
  const to = path.join(out, rel);

  // проверяем до statSync: снятый кейс может быть и папкой, и файлом
  if (skipped(rel.split(path.sep).join('/'))) return;

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
  if (rel.split(path.sep)[0] === 'vendor' || !/\.(js|css|html|xml|txt)$/.test(rel)) {
    fs.copyFileSync(from, to);        // картинки и прочее — как есть
    return;
  }
  if (/\.(xml|txt)$/.test(rel)) {    // адрес подменить, но не сжимать
    const src = fs.readFileSync(from, 'utf8');
    fs.writeFileSync(to, site === HOME ? src : src.split(HOME).join(site));
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

  /* Английский — отдельным файлом. Его никто не подключает в
     разметке: app.js сходит за ним сам и только при переключении
     языка. Для того, кто читает по-украински, этих байт нет. */
  {
    const [, en] = split(loadSite(root));
    let json = JSON.stringify(en);
    if (site !== HOME) json = json.split(HOME).join(site);
    const body = `window.SITE_EN=${json};`;
    fs.writeFileSync(path.join(out, 'js', 'lang-en.js'), body);
    console.log(`Английский вынесен в js/lang-en.js — ${(Buffer.byteLength(body, 'utf8') / 1024).toFixed(1)} КБ, ` +
                'страница берёт его только при переключении языка.');
  }

  /* Карту сайта пишем последней и по готовому dist: в неё попадает
     ровно то, что уехало, — снятый кейс сам собой выпадает. */
  fs.writeFileSync(path.join(out, 'sitemap.xml'), sitemap(out, site));
  const codeLine = Object.entries(OWN_CODE).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${(v / 1024).toFixed(0)} КБ`).join(', ');
  console.log(`Свой код: ${codeLine} — подставлен в полосу языков.`);
  console.log(`Адрес сайта: ${site}${site === HOME ? ' (по умолчанию; переопределяется SITE_URL)' : ' — из SITE_URL'}`);
  console.log(hasVendor
    ? '\nБиблиотеки взяты из vendor/ — сторонних скриптов на странице не осталось.'
    : '\nvendor/ нет: gsap и lenis останутся на CDN (для локальной сборки это нормально).');
  console.log(`\nСборка в dist/: ${(total / 1024).toFixed(1)} КБ текста сжато до ` +
              `${((total - saved) / 1024).toFixed(1)} КБ (−${Math.round(saved / total * 100)}%), версия ${version}.`);
})().catch(err => { console.error('Сборка не собралась:', err.message); process.exit(1); });
