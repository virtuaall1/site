/**
 * Проверка живого поведения после правки оформления.
 *
 *   NODE_PATH=/tmp/node_modules node scripts/smoke.js
 *
 * Кликает по тому же, по чему кликает человек: тема, язык, валюта,
 * бургер, раскрытие примера и вопроса. Каждая проверка смотрит на
 * результат, а не на то, что клик «прошёл».
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json', '.ico': 'image/x-icon'
};

function serve(dir) {
  return http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(dir, rel);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let failed = 0;
function check(name, ok, extra = '') {
  console.log(`  ${ok ? 'ok  ' : 'ПЛОХО'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failed++;
}

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  /* ── широкий экран: тема, язык, валюта, раскрытия ───────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });
    await ctx.addInitScript(`try{localStorage.clear();localStorage.setItem('lang','uk');
      localStorage.setItem('currency','uah');}catch(e){}`);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    check('без ошибок js', errors.length === 0, errors.join('; '));

    // Светлой темы больше нет: сайт тёмный всегда, и переключателя
    // в шапке быть не должно.
    const look = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      toggle: !!document.getElementById('themeBtn')
    }));
    const rgb = (look.bg.match(/\d+/g) || []).slice(0, 3).map(Number);
    const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    check('фон тёмный', lum < 0.12, `${look.bg}, яркость ${lum.toFixed(2)}`);
    check('переключателя темы нет', !look.toggle);

    // валюта
    const priceBefore = await page.textContent('.price-value');
    await page.click('#curSwitch .cur-btn[data-cur="usd"]');
    await page.waitForTimeout(400);
    const priceAfter = await page.textContent('.price-value');
    check('валюта переключается', priceBefore !== priceAfter, `${priceBefore} → ${priceAfter}`);
    check('цена в долларах', priceAfter.includes('$'), priceAfter);

    // язык
    await page.click('.lang-btn[data-lang="en"]');
    await page.waitForTimeout(600);
    const heroEn = await page.textContent('.hero-title');
    check('язык переключается', /[a-z]/i.test(heroEn) && !/[а-яіїєґ]/i.test(heroEn), heroEn.trim().slice(0, 40));
    await page.click('.lang-btn[data-lang="uk"]');
    await page.waitForTimeout(600);

    // раскрытие примера
    const row = page.locator('.price-row').nth(1);
    const toggle = row.locator('.price-toggle');
    const openBefore = await row.evaluate(n => n.classList.contains('open'));
    await toggle.click();
    await page.waitForTimeout(500);
    const openAfter = await row.evaluate(n => n.classList.contains('open'));
    const exH = await row.locator('.price-example > div').evaluate(n => n.getBoundingClientRect().height);
    check('пример раскрывается', openBefore !== openAfter && exH > 40, `высота ${Math.round(exH)}px`);

    // вопрос
    const faq = page.locator('.faq-item').first();
    await faq.locator('.faq-q').click();
    await page.waitForTimeout(500);
    const faqH = await faq.locator('.faq-a > div').evaluate(n => n.getBoundingClientRect().height);
    check('ответ раскрывается', faqH > 20, `высота ${Math.round(faqH)}px`);

    // Все ли reveal доехали до видимого состояния. Крутим шагами, как
    // человек: прыжок в конец страницы просто не покажет середину, и
    // наблюдателю нечего будет засечь.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.7;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 90));
      }
    });
    await page.waitForTimeout(1500);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal')].filter(n => getComputedStyle(n).opacity === '0').length);
    check('невидимых блоков не осталось', hidden === 0, `${hidden} шт.`);

    // Снимки кейсов должны уезжать в avif, а не в jpg
    const pic = await page.evaluate(() => {
      const p = document.querySelector('.case-frame picture');
      if (!p) return null;
      const img = p.querySelector('img');
      return {
        types: [...p.querySelectorAll('source')].map(s => s.type),
        taken: img.currentSrc.split('/').pop(),
        eager: document.querySelector('.case-shot').loading
      };
    });
    check('снимки в <picture> с avif и webp',
      !!pic && pic.types.includes('image/avif') && pic.types.includes('image/webp'),
      pic ? pic.types.join(', ') : 'picture не найден');
    check('браузер взял современный формат',
      !!pic && /\.(avif|webp)$/.test(pic.taken), pic && pic.taken);

    // Раздел, в котором человек находится, должен отмечаться в меню
    await page.evaluate(() => document.getElementById('services').scrollIntoView());
    await page.waitForTimeout(700);
    const current = await page.evaluate(() => {
      const a = document.querySelector('.nav a[aria-current]');
      return a && a.getAttribute('href');
    });
    check('меню отмечает текущий раздел', !!current, current || 'ничего не отмечено');

    // Заголовки должны рисоваться Unbounded, а не системным
    // шрифтом: файл лежит свой, и если адрес разъехался, подмена
    // произойдёт молча.
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
      return {
        loaded: [...new Set(loaded)],
        title: getComputedStyle(document.querySelector('.hero-title')).fontFamily
      };
    });
    check('заголовки набраны Unbounded',
      /Unbounded/.test(fonts.title) && fonts.loaded.includes('Unbounded'),
      `${fonts.title} / загружено: ${fonts.loaded.join(', ') || 'ничего'}`);

    await ctx.close();
  }

  /* ── форма заявки ───────────────────────────────────────────
     Ручку /api/lead держит воркер, а его на статике нет — поэтому
     ответы подменяем сами: так проверяются оба пути, и удачный, и
     когда сервер молчит. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });
    const page = await ctx.newPage();

    let sent = null;
    let reply = { status: 200, body: '{"ok":true}' };
    await page.route('**/api/lead', route => {
      sent = JSON.parse(route.request().postData() || '{}');
      route.fulfill({ status: reply.status, contentType: 'application/json', body: reply.body });
    });

    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);

    const statusText = () => page.textContent('#leadStatus');

    // пустую форму отправлять нельзя, и человеку должно быть видно почему
    await page.click('#leadSend');
    await page.waitForTimeout(300);
    const emptyBad = await page.evaluate(() =>
      document.querySelectorAll('.field-input.is-bad').length);
    check('пустая форма не уходит', sent === null && emptyBad === 3, `${emptyBad} поля отмечено`);
    check('сказано, чего не хватает', (await statusText()).length > 10, await statusText());

    // «зробіть красиво» — тоже не задача
    await page.fill('#leadName', 'Олег');
    await page.fill('#leadContact', '@oleg');
    await page.fill('#leadTask', 'привіт');
    await page.click('#leadSend');
    await page.waitForTimeout(300);
    check('слишком короткая задача не уходит', sent === null,
      sent ? JSON.stringify(sent) : 'запроса не было');

    // нормальная заявка
    await page.fill('#leadTask', 'Треба бот для запису клієнтів у барбершоп.');
    await page.click('#leadSend');
    await page.waitForTimeout(600);
    check('заявка ушла с тем, что ввели',
      !!sent && sent.name === 'Олег' && sent.contact === '@oleg' && sent.task.includes('барбершоп'),
      sent ? Object.keys(sent).join(', ') : 'запроса не было');
    check('форма очистилась после отправки',
      (await page.inputValue('#leadTask')) === '', await page.inputValue('#leadTask'));
    const okClass = await page.evaluate(() =>
      document.getElementById('leadStatus').className);
    check('успех показан', okClass.includes('is-ok'), okClass);

    // ручки нет или токен не задан — человеку нужен запасной путь
    sent = null;
    reply = { status: 503, body: '{"error":"offline"}' };
    await page.fill('#leadName', 'Олег');
    await page.fill('#leadContact', '@oleg');
    await page.fill('#leadTask', 'Треба бот для запису клієнтів у барбершоп.');
    await page.click('#leadSend');
    await page.waitForTimeout(600);
    const failText = await statusText();
    check('когда форма недоступна — отправляем в Telegram',
      /Telegram/i.test(failText), failText.slice(0, 60));
    const tgVisible = await page.evaluate(() => {
      const a = document.getElementById('tgLink');
      return !!a && a.getBoundingClientRect().height > 0;
    });
    check('запасная кнопка на месте', tgVisible);

    await ctx.close();
  }

  /* ── за GitHub идём только когда дошли до раздела ───────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });
    const page = await ctx.newPage();
    const hits = [];
    const outside = [];
    page.on('request', r => {
      if (r.url().includes('api.github.com')) hits.push(r.url());
      if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) outside.push(r.url());
    });

    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    check('на первом экране в GitHub не ходим', hits.length === 0, `${hits.length} запрос(ов)`);
    check('за шрифтами в гугл не ходим', outside.length === 0, outside.join(', '));

    const projects = await page.evaluate(() => document.querySelectorAll('#repos .repo').length);
    check('свои работы показаны сразу', projects > 0, `${projects} шт.`);

    await page.evaluate(() => document.getElementById('work').scrollIntoView());
    await page.waitForTimeout(1500);
    check('дошли до раздела — запрос ушёл', hits.length > 0, `${hits.length} запрос(ов)`);
    await ctx.close();
  }

  /* ── телефон: бургер и меню ─────────────────────────────────── */
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, locale: 'uk-UA'
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const menuShown = () => page.evaluate(() =>
      getComputedStyle(document.getElementById('mobileMenu')).display !== 'none');
    check('меню закрыто на старте', !(await menuShown()));
    await page.click('#burger');
    await page.waitForTimeout(300);
    check('бургер открывает меню', await menuShown());
    await page.click('#mobileMenu a');
    await page.waitForTimeout(300);
    check('переход по пункту закрывает меню', !(await menuShown()));

    // Escape закрывает и возвращает фокус на кнопку — иначе он
    // остаётся на невидимом пункте и следующий Tab уводит в никуда
    await page.click('#burger');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const back = await page.evaluate(() => document.activeElement.id);
    check('Escape закрывает меню', !(await menuShown()));
    check('фокус вернулся на кнопку', back === 'burger', back || 'нет фокуса');

    await ctx.close();
  }

  /* ── десктоп: мобильное меню не должно проступать ───────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const shown = await page.evaluate(() =>
      getComputedStyle(document.getElementById('mobileMenu')).display !== 'none');
    check('на широком экране мобильного меню нет', !shown);
    await ctx.close();
  }

  /* ── собранная страница: списки уже в разметке ───────────────
     Тут проверяется то, чего нет в исходниках: сборка вставляет
     кейсы, цены, шаги и вопросы прямо в index.html. Смотрим на
     dist, если он собран. */
  const dist = path.join(ROOT, 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    const dsrv = serve(dist);
    await new Promise(r => dsrv.listen(0, '127.0.0.1', r));
    const dbase = `http://127.0.0.1:${dsrv.address().port}`;

    // без скрипта вообще: человек с выключенным JS и поисковый робот
    {
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${dbase}/index.html`, { waitUntil: 'load' });
      const seen = await page.evaluate(() => ({
        cases: document.querySelectorAll('#caseGrid .case').length,
        prices: document.querySelectorAll('#priceList .price-row').length,
        steps: document.querySelectorAll('#steps .step').length,
        faq: document.querySelectorAll('#faqList .faq-item').length,
        money: (document.querySelector('#priceList .price-value') || {}).textContent || ''
      }));
      check('без скрипта списки на месте',
        seen.cases > 0 && seen.prices > 0 && seen.steps > 0 && seen.faq > 0,
        `кейсів ${seen.cases}, цін ${seen.prices}, кроків ${seen.steps}, питань ${seen.faq}`);
      check('без скрипта видно цену', /\d/.test(seen.money), seen.money.trim());
      // .reveal без скрипта проявлять некому — это делает css/nojs.css
      const vis = await page.evaluate(() =>
        getComputedStyle(document.querySelector('#steps .step')).opacity);
      check('без скрипта текст видно', Number(vis) > 0.9, `непрозрачность ${vis}`);
      await ctx.close();
    }

    // со скриптом: готовую разметку не должно ни задвоить, ни обездвижить
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });
      await ctx.addInitScript(`try{localStorage.clear();localStorage.setItem('lang','uk');}catch(e){}`);
      const page = await ctx.newPage();
      const errors = [];
      const packs = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (r.url().includes('lang-en.js')) packs.push(r.url()); });
      await page.goto(`${dbase}/index.html`, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      check('в сборке нет ошибок js', errors.length === 0, errors.join('; '));
      check('английский словарь не качается зря', packs.length === 0, `${packs.length} запрос(ов)`);

      const counted = await page.evaluate(() => ({
        cases: document.querySelectorAll('#caseGrid .case').length,
        faq: document.querySelectorAll('#faqList .faq-item').length,
        mark: document.querySelector('#caseGrid').dataset.pre || ''
      }));
      check('готовая разметка не задвоилась', counted.cases > 0 && counted.cases < 12, `${counted.cases} кейсів`);
      check('метка data-pre снята', counted.mark === '', counted.mark);

      // вопросы раскрываются, хотя их рисовал не скрипт
      const faq = page.locator('#faqList .faq-item').first();
      await faq.locator('.faq-q').click();
      await page.waitForTimeout(400);
      const h = await faq.locator('.faq-a > div').evaluate(n => n.getBoundingClientRect().height);
      check('в сборке ответ раскрывается', h > 20, `высота ${Math.round(h)}px`);

      // смена языка должна перерисовать то, что пришло готовым
      await page.click('.lang-btn[data-lang="en"]');
      await page.waitForTimeout(800);
      const en = await page.evaluate(() =>
        document.querySelector('#steps .step-title').textContent);
      check('готовая разметка переводится', /[a-z]/i.test(en) && !/[а-яіїєґ]/i.test(en), en.trim().slice(0, 40));
      check('словарь приехал по переключению', packs.length === 1, `${packs.length} запрос(ов)`);

      // и обратно: второй раз за словарём ходить незачем
      await page.click('.lang-btn[data-lang="uk"]');
      await page.waitForTimeout(600);
      await page.click('.lang-btn[data-lang="en"]');
      await page.waitForTimeout(600);
      check('второй раз словарь не качается', packs.length === 1, `${packs.length} запрос(ов)`);
      await ctx.close();
    }

    dsrv.close();
  } else {
    check('сборка собрана (npm run build) — проверки разметки пропущены', false, 'нет dist/index.html');
  }

  await browser.close();
  srv.close();
  console.log(failed ? `\nНе прошло проверок: ${failed}` : '\nВсё живое работает.');
  process.exit(failed ? 1 : 0);
});
