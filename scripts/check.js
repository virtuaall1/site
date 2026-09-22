#!/usr/bin/env node
/**
 * Проверки перед выкаткой. Браузер не нужен.
 *
 *   node scripts/check.js
 *
 * Смотрит на собранный dist — то, что реально уедет на сервер, а
 * не на исходники. Ошибка в сборке важнее опечатки в исходнике:
 * первую увидит посетитель, вторую — только мы.
 *
 * Каждая проверка отвечает на вопрос «что сломается у человека,
 * если этого не проверить». Проверок ради проверок тут нет.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

let failed = 0;
const ok = msg => console.log(`  ok   ${msg}`);
const fail = msg => { console.log(`  ПЛОХО ${msg}`); failed++; };

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('Нет dist/index.html — сначала node scripts/build-app.js');
  process.exit(1);
}

const read = rel => fs.readFileSync(path.join(DIST, rel), 'utf8');
const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(path.relative(DIST, full).split(path.sep).join('/'));
  }
  return acc;
};
const FILES = walk(DIST);

(async () => {
  const { ROUTES } = await import(path.join(ROOT, 'app', 'lib', 'routes.js'));
  const { I18N, SERVICES, PROJECTS, FAQ } = await import(path.join(ROOT, 'app', 'lib', 'content.js'));

  /* ---------- 1. Все страницы собрались ---------- */
  {
    const missing = ROUTES.filter(r => !FILES.includes(r.file));
    if (missing.length) fail(`не собрались страницы: ${missing.map(r => r.file).join(', ')}`);
    else ok(`страницы собраны: ${ROUTES.length} шт.`);
  }

  /* ---------- 2. Текст уехал в разметку, а не остался в скрипте ----------
     Главное, ради чего затевалась отрисовка на сборке. Если
     заголовок есть только в js, поисковик и человек без скриптов
     увидят пустую страницу — а узнаем мы об этом через месяц. */
  for (const route of ROUTES) {
    const html = read(route.file);
    const body = html.slice(html.indexOf('<div id="root">'));
    const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 1200) fail(`${route.file}: в разметке всего ${text.length} символов текста`);
    else if (!/<h1/.test(body)) fail(`${route.file}: нет заголовка h1`);
    else ok(`${route.file}: ${(text.length / 1000).toFixed(1)} тыс. символов текста в разметке`);
  }

  /* ---------- 3. Цены и вопросы дошли до страницы ---------- */
  {
    const home = read('index.html');
    const priced = SERVICES.filter(s => s.price);
    const missing = priced.filter(s => !home.includes(s.uk.name));
    const noFaq = FAQ.filter(f => !home.includes(f.uk.q.slice(0, 20)));
    if (missing.length) fail(`на главной нет услуг: ${missing.map(s => s.id).join(', ')}`);
    else if (noFaq.length) fail(`на главной нет вопросов: ${noFaq.length} шт.`);
    else ok(`на главной ${SERVICES.length} услуг и ${FAQ.length} вопросов`);
  }

  /* ---------- 4. Переводы полные ----------
     Ключ, которого нет во втором языке, виден не сразу: страница
     показывает сам ключ вместо текста. */
  {
    const uk = Object.keys(I18N.uk);
    const en = Object.keys(I18N.en);
    const gaps = uk.filter(k => !(k in I18N.en));
    const extra = en.filter(k => !(k in I18N.uk));
    if (gaps.length || extra.length) fail(`переводы разошлись: ${[...gaps, ...extra].slice(0, 5).join(', ')}`);
    else ok(`переводы: ${uk.length} ключей × 2 языка`);
  }

  /* ---------- 5. Ссылки между страницами не в никуда ---------- */
  {
    const broken = [];
    for (const route of ROUTES) {
      const html = read(route.file);
      for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const clean = href.replace(/^\//, '');
        if (!clean) continue;
        const asFile = FILES.includes(clean);
        const asDir = FILES.includes(`${clean.replace(/\/$/, '')}/index.html`);
        if (!asFile && !asDir) broken.push(`${route.file} → ${href}`);
      }
    }
    if (broken.length) fail(`ссылки в никуда: ${[...new Set(broken)].slice(0, 4).join(', ')}`);
    else ok('внутренние ссылки ведут в существующие файлы');
  }

  /* ---------- 6. Снимки кейсов в трёх форматах ----------
     <picture> отдаёт avif, потом webp и только потом jpg. Забыли
     прогнать scripts/images.py — и браузер тихо съедет на тяжёлый
     jpg, а заметит это только счётчик трафика. */
  {
    const shots = [...new Set(PROJECTS.filter(p => p.shot).map(p => p.shot))];
    const gaps = [];
    let jpg = 0, avif = 0;
    for (const shot of shots) {
      const base = shot.replace(/\.jpg$/, '');
      for (const ext of ['jpg', 'webp', 'avif']) {
        const rel = `${base}.${ext}`;
        if (!FILES.includes(rel)) { gaps.push(rel); continue; }
        const size = fs.statSync(path.join(DIST, rel)).size;
        if (ext === 'jpg') jpg += size;
        if (ext === 'avif') avif += size;
      }
    }
    if (gaps.length) fail(`нет пережатых снимков: ${gaps.join(', ')}`);
    else ok(`снимки кейсов: ${shots.length} шт. в трёх форматах (avif легче на ${Math.round((1 - avif / jpg) * 100)}%)`);
  }

  /* ---------- 7. Свои шрифты, без чужих доменов ---------- */
  {
    const home = read('index.html');
    const css = FILES.includes('css/fonts.css') ? read('css/fonts.css') : '';
    const used = [...new Set([...css.matchAll(/url\(\.\.\/fonts\/([^)]+)\)/g)].map(m => m[1]))];
    const missing = used.filter(name => !FILES.includes(`fonts/${name}`));

    if (!css) fail('нет css/fonts.css — запусти python3 scripts/fonts.py');
    else if (missing.length) fail(`css/fonts.css зовёт файлы, которых нет: ${missing.join(', ')}`);
    else if (/fonts\.(googleapis|gstatic)\.com/.test(home)) fail('страница всё ещё ходит за шрифтами в гугл');
    else if (!/rel="preload"[^>]*fonts\//.test(home)) fail('шрифты свои, но не предзагружаются — текст всё равно ждёт');
    else {
      const bytes = used.reduce((sum, n) => sum + fs.statSync(path.join(DIST, 'fonts', n)).size, 0);
      ok(`свои шрифты: ${used.length} файлов, ${(bytes / 1024).toFixed(0)} КБ`);
    }
  }

  /* ---------- 8. Политика безопасности ----------
     script-src 'self' — единственное, что стоит между посетителем
     и чужим кодом. Уступка сделана только стилям: Motion
     анимирует через атрибут style. */
  {
    const home = read('index.html');
    const csp = (/Content-Security-Policy" content="([^"]+)"/.exec(home) || [])[1] || '';
    if (!csp) fail('на странице нет CSP');
    else if (!/script-src 'self'(;| )/.test(csp)) fail('script-src разрешает не только свой домен');
    else if (/script-src[^;]*unsafe/.test(csp)) fail('script-src содержит unsafe — так защита не работает');
    else if (!/form-action 'self'/.test(csp)) fail('form-action не ограничен своим доменом');
    else ok('CSP: чужим скриптам выполняться негде');
  }

  /* ---------- 9. Форма заявки и воркер сходятся ----------
     Ломается тихо: адрес ручки разошёлся — заявки просто перестают
     приходить, а страница выглядит целой. */
  {
    const worker = path.join(ROOT, 'worker', 'index.js');
    const problems = [];
    if (!fs.existsSync(worker)) problems.push('нет worker/index.js — принимать заявки некому');
    else {
      const code = fs.readFileSync(worker, 'utf8');
      const route = (/pathname === '([^']+)'/.exec(code) || [])[1];
      const form = fs.readFileSync(path.join(ROOT, 'app', 'components', 'LeadForm.jsx'), 'utf8');
      const called = (/fetch\('([^']+)'/.exec(form) || [])[1];
      if (route !== called) problems.push(`форма шлёт на ${called}, а воркер слушает ${route}`);
      if (!/TG_BOT_TOKEN/.test(code)) problems.push('воркер не берёт токен бота из настроек');
      if (!/name="site"/.test(form)) problems.push('в форме нет ловушки для ботов');
      if (!/lead\.offline/.test(form)) problems.push('нет запасного пути, когда ручка молчит');
    }
    const cfg = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
    if (!/"main"\s*:/.test(cfg)) problems.push('в wrangler.jsonc нет main — воркер не поедет');

    if (problems.length) problems.forEach(fail);
    else ok('форма заявки: разметка, отправка и воркер сходятся');
  }

  /* ---------- 9б. Страница, которой нет ----------
     Без неё человек по сломанной ссылке упирается в пустую
     страницу платформы и уходит. */
  {
    const worker = fs.readFileSync(path.join(ROOT, 'worker', 'index.js'), 'utf8');
    if (!FILES.includes('404.html')) fail('нет 404.html — сломанная ссылка ведёт в пустоту');
    else if (!/404\.html/.test(worker)) fail('404.html собрана, но воркер её не отдаёт');
    else if (!/status: 404/.test(worker)) fail('воркер отдаёт 404.html с кодом 200 — поисковик начнёт её индексировать');
    else if (/<loc>[^<]*404/.test(read('sitemap.xml'))) fail('404 попала в карту сайта');
    else ok('страница 404 своя, с правильным кодом и не в карте сайта');
  }

  /* ---------- 10. Вес первого экрана ----------
     React с анимациями весит заметно больше ванильного скрипта —
     это сознательный размен. Но потолок нужен: без него бандл
     растёт незаметно, по пакету за раз. */
  {
    const BUDGET_KB = 200;             // столько уезжает по сети, в сжатом виде
    const zlib = require('zlib');
    const first = FILES.filter(f => f === 'index.html' || /^assets\/.*\.(js|css)$/.test(f));
    const bytes = first.reduce((sum, f) =>
      sum + zlib.gzipSync(fs.readFileSync(path.join(DIST, f))).length, 0);
    const kb = bytes / 1024;
    if (kb > BUDGET_KB) fail(`первый экран весит ${kb.toFixed(1)} КБ — больше бюджета ${BUDGET_KB} КБ`);
    else ok(`вес первого экрана: ${kb.toFixed(1)} КБ из ${BUDGET_KB} КБ (сжатый, как на сервере)`);
  }

  /* ---------- 11. Структурированные данные и карта сайта ---------- */
  {
    const home = read('index.html');
    const raw = (/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(home) || [])[1];
    try {
      const ld = JSON.parse(raw);
      const types = ld['@graph'].map(n => n['@type']);
      const offers = ld['@graph'].find(n => n['@type'] === 'OfferCatalog');
      if (!offers || !offers.itemListElement.length) throw new Error('в каталоге нет ни одной цены');
      ok(`структурированные данные: ${types.join(', ')}, цен — ${offers.itemListElement.length}`);
    } catch (e) {
      fail(`JSON-LD не читается: ${e.message}`);
    }

    const map = read('sitemap.xml');
    const listed = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    const gaps = ROUTES.filter(r => {
      const want = (site => site)(r.path);
      return !listed.some(l => new URL(l).pathname === want);
    });
    if (gaps.length) fail(`в карте сайта нет страниц: ${gaps.map(r => r.path).join(', ')}`);
    else ok(`карта сайта: ${listed.length} адресов`);
  }

  /* ---------- 12. Снятые кейсы не уехали наружу ---------- */
  {
    const leaked = FILES.filter(f => /(^|\/)(orbita|plitkarka)(\/|\.)/.test(f));
    if (leaked.length) fail(`снятые кейсы попали в сборку: ${leaked.slice(0, 3).join(', ')}`);
    else ok('снятые кейсы в сборку не попали');
  }

  /* ---------- 13. Заголовки кеша ---------- */
  {
    const h = read('_headers');
    if (!/\/assets\/\*[\s\S]*?immutable/.test(h)) fail('у /assets/* нет вечного кеша, хотя в именах хеш');
    else if (!/\/sw\.js[\s\S]*?no-cache/.test(h)) fail('sw.js кешируется — сайт застрянет на старой версии');
    else ok('заголовки кеша: assets навсегда, воркер — без кеша');
  }

  console.log(failed ? `\nНе прошло проверок: ${failed}` : '\nВсе проверки пройдены.');
  process.exit(failed ? 1 : 0);
})().catch(err => {
  console.error('Проверки не отработали:', err);
  process.exit(1);
});
