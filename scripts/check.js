#!/usr/bin/env node
/**
 * Проверки перед деплоем. Никаких зависимостей — чистый Node.
 *   node scripts/check.js
 *
 * Ловит: пропущенные переводы, битые якоря, забытые файлы,
 * раздувшийся вес страницы и синтаксические ошибки в JS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const problems = [];
const notes = [];

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const fail = msg => problems.push(msg);
const ok = msg => notes.push(msg);

/* ---------- 1. Файлы на месте ---------- */
const REQUIRED = ['index.html', 'css/style.css', 'js/app.js', 'js/content.js', 'robots.txt', 'sitemap.xml'];
for (const file of REQUIRED) {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`нет обязательного файла: ${file}`);
}

const html = read('index.html');
const css = read('css/style.css');
const appJs = read('js/app.js');
const contentJs = read('js/content.js');

/* ---------- 2. JS парсится ---------- */
for (const [name, src] of [['js/app.js', appJs], ['js/content.js', contentJs]]) {
  try {
    new vm.Script(src, { filename: name });
    ok(`${name} — синтаксис в порядке`);
  } catch (err) {
    fail(`${name} — синтаксическая ошибка: ${err.message}`);
  }
}

/* ---------- 3. Переводы: каждый ключ есть в обоих языках ---------- */
const sandbox = { window: {}, navigator: { language: 'ru' } };
vm.createContext(sandbox);
try {
  vm.runInContext(contentJs, sandbox, { filename: 'content.js' });
} catch (err) {
  fail(`не удалось выполнить content.js: ${err.message}`);
}

const SITE = sandbox.window.SITE;
if (!SITE) {
  fail('content.js не выставил window.SITE');
} else {
  const langs = Object.keys(SITE.I18N);
  const allKeys = new Set(langs.flatMap(l => Object.keys(SITE.I18N[l])));

  for (const lang of langs) {
    for (const key of allKeys) {
      if (!SITE.I18N[lang][key]) fail(`перевод "${key}" отсутствует для языка "${lang}"`);
    }
  }
  ok(`переводы: ${allKeys.size} ключей × ${langs.length} языка`);

  // Ключи из разметки должны существовать в словаре
  const used = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
  for (const key of new Set(used)) {
    if (!allKeys.has(key)) fail(`в разметке используется неизвестный ключ перевода: ${key}`);
  }
  ok(`разметка использует ${new Set(used).size} ключей — все найдены`);

  // Услуги и вопросы переведены на оба языка
  for (const lang of langs) {
    SITE.SERVICES.forEach(s => {
      if (!s[lang]) fail(`услуга "${s.id}" без перевода на "${lang}"`);
    });
    SITE.FAQ.forEach((f, i) => {
      if (!f[lang]) fail(`вопрос #${i + 1} без перевода на "${lang}"`);
    });
    SITE.PROCESS.forEach((p, i) => {
      if (!p[lang]) fail(`шаг #${i + 1} без перевода на "${lang}"`);
    });
    (SITE.PROJECTS || []).forEach((p, i) => {
      if (!p[lang]) fail(`проект #${i + 1} без перевода на "${lang}"`);
      else if (!p[lang].name) fail(`у проекта #${i + 1} (${lang}) нет названия`);
    });
  }
  ok(`услуги (${SITE.SERVICES.length}), шаги (${SITE.PROCESS.length}) и вопросы (${SITE.FAQ.length}) переведены`);
}

/* ---------- 3.5. app.js берёт из SITE только то, что там есть ---------- */
if (SITE) {
  const destructured = appJs.match(/const\s*\{([\s\S]*?)\}\s*=\s*window\.SITE/);
  if (!destructured) {
    fail('в app.js не найдено получение данных из window.SITE');
  } else {
    const names = destructured[1]
      .split(',')
      .map(s => s.trim().split(':')[0].trim())
      .filter(Boolean);
    for (const name of names) {
      if (!(name in SITE)) fail(`app.js ждёт SITE.${name}, но content.js его не отдаёт`);
    }
    ok(`app.js использует ${names.length} полей конфига — все есть в content.js`);
  }

  // и наоборот: обращения вида PLURALS[...] к полям, которых нет
  // формы числа должны покрывать все категории, которые вернёт Intl.PluralRules
  const LOCALES = { uk: 'uk-UA', en: 'en-GB' };
  const plurals = SITE.PLURALS || {};
  for (const [lng, keys] of Object.entries(plurals)) {
    const categories = new Intl.PluralRules(LOCALES[lng] || lng).resolvedOptions().pluralCategories;
    for (const [key, forms] of Object.entries(keys)) {
      for (const category of categories) {
        if (!forms[category]) fail(`формы числа "${key}" (${lng}) не покрывают категорию "${category}"`);
      }
    }
  }
  ok('формы числа покрывают все категории Intl.PluralRules');
}

/* ---------- 4. Внутренние якоря никуда не ведут в пустоту ---------- */
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
for (const anchor of new Set(anchors)) {
  if (!ids.has(anchor)) fail(`ссылка на #${anchor}, но такого id в разметке нет`);
}
ok(`якоря: ${new Set(anchors).size} ссылок ведут на существующие секции`);

/* ---------- 5. Безопасность ---------- */
if (!/Content-Security-Policy/i.test(html)) fail('в index.html нет мета-тега CSP');
else ok('CSP на месте');

const externalLinks = [...html.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)].map(m => m[0]);
for (const link of externalLinks) {
  if (!/rel="[^"]*noopener/.test(link)) fail(`внешняя ссылка без rel="noopener": ${link.slice(0, 80)}…`);
}
ok(`внешние ссылки: ${externalLinks.length} шт., все с noopener`);

if (/\.innerHTML\s*=/.test(appJs)) {
  fail('в app.js есть присваивание innerHTML — данные из API должны идти через textContent');
} else {
  ok('innerHTML не используется — XSS через данные GitHub исключён');
}

/* ---------- 6. Бюджет по весу ---------- */
/* Бюджет считаем в несжатом виде; по сети те же файлы уходят под gzip
   примерно вчетверо меньше, а на сервер и вовсе едет минифицированная
   сборка — она вдвое легче исходников. Поднимался дважды: 120 → 130
   под конвертер валют, 130 → 145 под движение (лесенка появления,
   полоса прочитанного, вытирание снимков, перетекание при смене
   языка и валюты).

   145 → 160 под ускорение и доступность: <picture> с avif и webp,
   отложенный поход в GitHub, подсказка браузеру о следующей
   странице, регистрация служебного воркера, ловушка фокуса в меню и
   подсветка текущего раздела.

   Тут стоит держать в голове, что вес исходников и вес, который
   реально уезжает человеку, — разные числа. Исходники подросли на
   три килобайта, а первая загрузка полегчала на полторы сотни:
   снимки кейсов ушли в avif. Точное число показывает
   scripts/perfcheck.js. */
const BUDGET_KB = 160;
const totalKb = [['index.html', html], ['css/style.css', css], ['js/app.js', appJs], ['js/content.js', contentJs]]
  .reduce((sum, [, src]) => sum + Buffer.byteLength(src, 'utf8'), 0) / 1024;

if (totalKb > BUDGET_KB) fail(`страница весит ${totalKb.toFixed(1)} КБ — больше бюджета ${BUDGET_KB} КБ`);
else ok(`вес собственных файлов: ${totalKb.toFixed(1)} КБ из ${BUDGET_KB} КБ бюджета`);

/* ---------- 6б. Снимки кейсов есть во всех трёх форматах ----------
   Пропущенный avif или webp виден не сразу: <picture> молча съедет на
   jpg, и человек просто получит втрое больше байт. */
{
  const dir = path.join(ROOT, 'img', 'cases');
  const shots = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.jpg')) : [];
  const missing = [];
  let jpgBytes = 0, avifBytes = 0;

  for (const jpg of shots) {
    const base = jpg.slice(0, -4);
    jpgBytes += fs.statSync(path.join(dir, jpg)).size;
    for (const ext of ['webp', 'avif']) {
      const file = path.join(dir, `${base}.${ext}`);
      if (!fs.existsSync(file)) missing.push(`${base}.${ext}`);
      else if (ext === 'avif') avifBytes += fs.statSync(file).size;
    }
  }

  if (!shots.length) ok('снимков кейсов нет — проверять нечего');
  else if (missing.length) {
    fail(`нет пережатых снимков: ${missing.join(', ')} — запусти python3 scripts/images.py`);
  } else {
    const win = 1 - avifBytes / jpgBytes;
    ok(`снимки кейсов: ${shots.length} шт. в jpg, webp и avif (avif легче на ${(win * 100).toFixed(0)}%)`);
  }
}

/* ---------- 6в. Одинаковых id на странице быть не должно ----------
   Дубль id — это тихая поломка: getElementById возьмёт первый, а
   человек будет смотреть на второй и не понимать, почему не работает. */
{
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const seen = new Set();
  const dupes = [...new Set(ids.filter(id => seen.has(id) || (seen.add(id), false)))];
  if (dupes.length) fail(`id повторяются: ${dupes.join(', ')}`);
  else ok(`id уникальны — ${ids.length} шт.`);
}

/* ---------- 6г. Внутренние ссылки ведут в существующие файлы ---------- */
{
  const hrefs = [...html.matchAll(/href="(?!https?:|mailto:|#|data:)([^"]+)"/g)].map(m => m[1]);
  const broken = hrefs.filter(href => {
    const clean = href.split(/[?#]/)[0];
    if (!clean || clean === './') return false;
    const target = path.join(ROOT, clean);
    return !fs.existsSync(target) && !fs.existsSync(path.join(target, 'index.html'));
  });
  if (broken.length) fail(`ссылки в никуда: ${broken.join(', ')}`);
  else ok(`внутренние ссылки: ${hrefs.length} шт., все на месте`);
}

/* ---------- 6д. Структурированные данные собираются ----------
   JSON-LD строится на сборке из content.js. Если там что-то сломали,
   узнать об этом лучше сейчас, а не из панели вебмастера через месяц. */
try {
  const { loadSite, jsonLd } = require('./seo.js');
  const ld = jsonLd(loadSite(ROOT), 'https://example.com/');
  const parsed = JSON.parse(JSON.stringify(ld));
  const types = parsed['@graph'].map(n => n['@type']);
  const offers = parsed['@graph'].find(n => n['@type'] === 'OfferCatalog');
  if (!offers || !offers.itemListElement.length) throw new Error('в каталоге нет ни одной цены');
  ok(`структурированные данные: ${types.join(', ')}, цен — ${offers.itemListElement.length}`);
} catch (e) {
  fail(`JSON-LD не собирается: ${e.message}`);
}

/* ---------- 6е. Служебный воркер и заголовки кеша ---------- */
{
  const sw = path.join(ROOT, 'sw.js');
  if (!fs.existsSync(sw)) fail('нет sw.js — сайт не будет открываться без сети');
  else if (!/'sw\.js'/.test(appJs)) fail('sw.js есть, но app.js его не регистрирует');
  else ok('служебный воркер на месте и регистрируется');

  const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
  const need = ['/css/*', '/js/*', '/sw.js'];
  const absent = need.filter(rule => !headers.includes(rule));
  if (absent.length) fail(`в _headers нет правил кеша для: ${absent.join(', ')}`);
  else if (!/\/sw\.js[\s\S]*?no-cache/.test(headers)) fail('sw.js должен отдаваться с no-cache');
  else ok('заголовки кеша: css и js навсегда, воркер — без кеша');
}

/* ---------- 7. Доступность по мелочи ---------- */
if (!/lang="(ru|uk)"/.test(html)) fail('у <html> нет атрибута lang');
if (!/class="skip-link"/.test(html)) fail('нет ссылки «пропустить к содержимому»');
if (!/prefers-reduced-motion/.test(css)) fail('в CSS нет блока prefers-reduced-motion');
ok('базовая доступность: lang, skip-link, reduced-motion');

/* ---------- Итог ---------- */
notes.forEach(n => console.log(`  ok   ${n}`));

if (problems.length) {
  console.error('\nПроблемы:');
  problems.forEach(p => console.error(`  FAIL ${p}`));
  console.error(`\n${problems.length} проблем(ы) — деплой остановлен.\n`);
  process.exit(1);
}

console.log('\nВсе проверки пройдены.\n');
