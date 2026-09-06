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
      localStorage.setItem('theme','light');localStorage.setItem('currency','uah');}catch(e){}`);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    check('без ошибок js', errors.length === 0, errors.join('; '));

    const cls = () => page.evaluate(() => document.documentElement.className);
    check('стартовая тема светлая', (await cls()).includes('ds-light'), await cls());

    await page.click('#themeBtn');
    await page.waitForTimeout(300);
    const dark = await page.evaluate(() => ({
      cls: document.documentElement.className,
      attr: document.documentElement.dataset.theme,
      bg: getComputedStyle(document.body).backgroundColor
    }));
    check('тема переключилась в тёмную', dark.cls.includes('ds-dark') && dark.attr === 'dark',
      `${dark.cls} / ${dark.bg}`);
    // Точный цвет фона зависит от палитры — проверяем не значение,
    // а что он действительно тёмный.
    const rgb = (dark.bg.match(/\d+/g) || []).slice(0, 3).map(Number);
    const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    check('фон реально потемнел', lum < 0.12, `${dark.bg}, яркость ${lum.toFixed(2)}`);

    await page.click('#themeBtn');
    await page.waitForTimeout(300);

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

  await browser.close();
  srv.close();
  console.log(failed ? `\nНе прошло проверок: ${failed}` : '\nВсё живое работает.');
  process.exit(failed ? 1 : 0);
});
