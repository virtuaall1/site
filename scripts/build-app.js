#!/usr/bin/env node
/**
 * Сборка сайта.
 *
 *   node scripts/build-app.js   →   dist/
 *
 * Три шага:
 *
 *   1. Vite собирает приложение для браузера — один бандл на все
 *      страницы, имена файлов с хешем.
 *   2. Vite собирает то же самое для Node, и здесь каждая страница
 *      рисуется в готовую разметку. Поисковик и человек с
 *      выключенным JS видят текст сразу, а браузер потом только
 *      привязывает обработчики к тому, что уже на экране.
 *   3. Рядом кладётся статика, которой в бандлере делать нечего:
 *      шрифты, снимки кейсов, сами страницы кейсов, воркер и
 *      заголовки. Картинки уже пережаты в avif и webp — гонять их
 *      через сборщик незачем.
 *
 * Карта сайта и структурированные данные собираются здесь же из
 * тех же данных, что рисуют страницы: второй копии правды нет.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
const CLIENT = path.join(root, '.vite');
const SSR = path.join(root, '.vite-ssr');

const HOME = 'https://vrtll.dev/';
const site = (process.env.SITE_URL || HOME).replace(/\/*$/, '/');

/* Временно снятые кейсы. Исходники остаются в репозитории — они ещё
   пригодятся, — но в dist не попадают, иначе страница осталась бы
   доступной по прямому адресу. */
const SKIP_CASES = ['orbita', 'plitkarka'];
const skipped = rel =>
  SKIP_CASES.some(name =>
    rel === `cases/${name}` ||
    new RegExp(`^img/cases/${name}\\.[a-z0-9]+$`).test(rel));

/* Что кладём рядом с собранным приложением, как есть. */
const STATIC = ['fonts', 'img', 'cases', 'css/fonts.css', 'sw.js', '_headers', 'robots.txt'];

function copy(rel) {
  const from = path.join(root, rel);
  const to = path.join(out, rel);
  if (!fs.existsSync(from)) return;
  if (skipped(rel)) return;

  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) copy(path.posix.join(rel, name));
    return;
  }
  if (/(^|\/)(README\.md|\.DS_Store)$/.test(rel)) return;

  fs.mkdirSync(path.dirname(to), { recursive: true });
  // адрес сайта может быть переопределён при сборке чернового слепка
  if (/\.(html|xml|txt|css|js)$/.test(rel) && site !== HOME) {
    fs.writeFileSync(to, fs.readFileSync(from, 'utf8').split(HOME).join(site));
  } else {
    fs.copyFileSync(from, to);
  }
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

(async () => {
  const vite = ['npx', ['vite', 'build']];

  console.log('1/3  приложение для браузера');
  execFileSync(vite[0], vite[1], { cwd: root, stdio: 'inherit' });

  console.log('\n2/3  отрисовка страниц');
  execFileSync('npx', ['vite', 'build', '--ssr', 'entry-server.jsx', '--outDir', '../.vite-ssr'],
    { cwd: root, stdio: 'inherit' });

  const { render } = await import(path.join(SSR, 'entry-server.js'));
  const { ROUTES, NOT_FOUND } = await import(path.join(root, 'app', 'lib', 'routes.js'));
  const { loadSite, jsonLd, sitemap, breadcrumbs } = require('./seo.js');
  const data = await loadSite(root);
  const graph = jsonLd(data, site);

  const template = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  for (const route of [...ROUTES, NOT_FOUND]) {
    /* Структурированные данные у каждой страницы свои: общий граф
       плюс хлебные крошки там, где есть второй уровень. */
    const crumbs = breadcrumbs(site, route, route.nav ? data.I18N.uk[route.nav] : '');
    const ld = JSON.stringify(crumbs
      ? { ...graph, '@graph': [...graph['@graph'], crumbs] }
      : graph);

    const html = template
      .replace('<!--app-html-->', render(route.page, route.path))
      .replace('<!--title-->', esc(route.uk.title))
      .replace(/<!--desc-->/g, esc(route.uk.desc))
      .replace(/<!--canonical-->/g, esc(site.replace(/\/$/, '') + route.path))
      .replace('<!--og-title-->', esc(route.uk.title.split(' | ')[0]))
      .replace('<!--JSON-LD-->', `<script type="application/ld+json">${ld}</script>`)
      .replace('data-page="Home"', `data-page="${route.page}"`)
      .replace('data-path="/"', `data-path="${route.path}"`);

    const file = path.join(out, route.file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
    console.log(`  ${route.file.padEnd(22)} ${(Buffer.byteLength(html) / 1024).toFixed(1)} КБ`);
  }

  console.log('\n3/3  статика рядом');
  // собранные css и js
  fs.cpSync(path.join(CLIENT, 'assets'), path.join(out, 'assets'), { recursive: true });
  for (const rel of STATIC) copy(rel);

  fs.writeFileSync(path.join(out, 'sitemap.xml'), sitemap(out, site, ROUTES.map(r => r.path)));

  const weigh = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const full = path.join(dir, e.name);
    return sum + (e.isDirectory() ? weigh(full) : fs.statSync(full).size);
  }, 0);

  console.log(`\nГотово: dist/ — ${(weigh(out) / 1024 / 1024).toFixed(1)} МБ, адрес ${site}`);
})().catch(err => {
  console.error('Сборка не собралась:', err.message);
  process.exit(1);
});
