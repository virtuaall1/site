#!/usr/bin/env node
/**
 * Проверка живого поведения в браузере.
 *
 *   NODE_PATH=/tmp/node_modules node scripts/smoke.js
 *
 * Открывает собранный dist и кликает по тому же, по чему кликает
 * человек: язык, валюта, раскрытия, бургер, форма. Каждая проверка
 * смотрит на результат, а не на то, что клик «прошёл».
 *
 * Отдельно проверяется то, ради чего затевалась отрисовка на
 * сборке: страница обязана читаться с выключенным JS.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.ico': 'image/x-icon'
};
const PACKABLE = /\.(html|css|js|svg|xml|txt|json)$/;

/* Текст едет к человеку сжатым — это делает и Cloudflare, и любой
   нормальный сервер. Отдаём так же. */
const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(DIST, rel);
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }

  const head = { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' };
  let body = fs.readFileSync(file);
  if (/gzip/.test(req.headers['accept-encoding'] || '') && PACKABLE.test(file)) {
    body = zlib.gzipSync(body, { level: 9 });
    head['content-encoding'] = 'gzip';
  }
  head['content-length'] = String(body.length);
  res.writeHead(200, head);
  res.end(body);
});

let failed = 0;
function check(name, ok, extra = '') {
  console.log(`  ${ok ? 'ok  ' : 'ПЛОХО'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failed++;
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('Нет dist/index.html — сначала node scripts/build-app.js');
  process.exit(1);
}

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  /* ── без скрипта: поисковик и человек с выключенным JS ────── */
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/`, { waitUntil: 'load' });

    const seen = await page.evaluate(() => ({
      h1: (document.querySelector('h1') || {}).textContent || '',
      cases: document.querySelectorAll('#cases li').length,
      prices: document.querySelectorAll('#services > div > ul > li').length,
      faq: document.querySelectorAll('#faq button[aria-expanded]').length,
      money: (document.querySelector('#services .tabular') || {}).textContent || '',
      visible: getComputedStyle(document.querySelector('#services')).opacity
    }));

    check('без скрипта есть заголовок', seen.h1.length > 10, seen.h1.slice(0, 40));
    check('без скрипта есть кейсы, цены и вопросы',
      seen.cases > 0 && seen.prices > 0 && seen.faq > 0,
      `кейсів ${seen.cases}, цін ${seen.prices}, питань ${seen.faq}`);
    check('без скрипта видно цену', /\d/.test(seen.money), seen.money.trim());
    check('без скрипта секция не прозрачная', Number(seen.visible) > 0.9, seen.visible);
    await ctx.close();
  }

  /* ── обычный визит ───────────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });
    await ctx.addInitScript('try{localStorage.clear()}catch(e){}');
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1800);

    check('без ошибок js', errors.length === 0, errors.slice(0, 2).join('; '));

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const rgb = (bg.match(/\d+/g) || []).slice(0, 3).map(Number);
    const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    check('фон тёмный', lum < 0.12, `${bg}, яркость ${lum.toFixed(2)}`);

    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))],
        title: getComputedStyle(document.querySelector('h1')).fontFamily
      };
    });
    check('заголовки набраны Unbounded',
      /Unbounded/.test(font.title) && font.loaded.includes('Unbounded'),
      font.loaded.join(', ') || 'ничего не загрузилось');

    // валюта
    const before = await page.textContent('#services .tabular');
    await page.click('#services button[aria-pressed="false"]');
    await page.waitForTimeout(400);
    const after = await page.textContent('#services .tabular');
    check('валюта переключается', before !== after, `${before} → ${after}`);
    check('цена в долларах', after.includes('$'), after);

    // язык
    await page.click('header button[aria-pressed="false"]');
    await page.waitForTimeout(700);
    const heroEn = await page.textContent('h1');
    check('язык переключается', /[a-z]/i.test(heroEn) && !/[а-яіїєґ]/i.test(heroEn), heroEn.trim().slice(0, 36));
    await page.click('header button[aria-pressed="false"]');
    await page.waitForTimeout(700);

    // раскрытие вопроса
    await page.locator('#faq button[aria-expanded]').first().click();
    await page.waitForTimeout(700);
    const faqH = await page.locator('#faq .collapsible[data-open="true"] > div').first()
      .evaluate(n => n.getBoundingClientRect().height);
    check('ответ раскрывается', faqH > 20, `высота ${Math.round(faqH)}px`);

    // снимки кейсов уезжают в современный формат
    const pic = await page.evaluate(() => {
      const img = document.querySelector('#cases img');
      return img ? img.currentSrc.split('/').pop() : null;
    });
    check('браузер взял avif или webp', !!pic && /\.(avif|webp)$/.test(pic), pic);

    // всё ли проявилось после прокрутки
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.7;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 130));
      }
    });
    await page.waitForTimeout(1200);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('#services li, #cases li, #faq button')]
        .filter(n => Number(getComputedStyle(n.closest('li, div') || n).opacity) < 0.05).length);
    check('невидимых блоков не осталось', hidden === 0, `${hidden} шт.`);

    await ctx.close();
  }

  /* ── форма заявки ────────────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });
    const page = await ctx.newPage();

    let sent = null;
    let reply = { status: 200, body: '{"ok":true}' };
    await page.route('**/api/lead', route => {
      sent = JSON.parse(route.request().postData() || '{}');
      route.fulfill({ status: reply.status, contentType: 'application/json', body: reply.body });
    });

    await page.goto(`${base}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const status = () => page.textContent('form [role="status"]');

    await page.click('form button[type="submit"]');
    await page.waitForTimeout(400);
    check('пустая форма не уходит', sent === null);
    check('сказано, чего не хватает', (await status()).length > 10, (await status()).slice(0, 44));

    await page.fill('#lead-name', 'Олег');
    await page.fill('#lead-contact', '@oleg');
    await page.fill('#lead-task', 'привіт');
    await page.click('form button[type="submit"]');
    await page.waitForTimeout(400);
    check('слишком короткая задача не уходит', sent === null);

    await page.fill('#lead-task', 'Треба бот для запису клієнтів у барбершоп.');
    await page.click('form button[type="submit"]');
    await page.waitForTimeout(800);
    check('заявка ушла с тем, что ввели',
      !!sent && sent.name === 'Олег' && sent.task.includes('барбершоп'),
      sent ? Object.keys(sent).join(', ') : 'запроса не было');
    check('форма очистилась', (await page.inputValue('#lead-task')) === '');

    sent = null;
    reply = { status: 503, body: '{"error":"offline"}' };
    await page.fill('#lead-name', 'Олег');
    await page.fill('#lead-contact', '@oleg');
    await page.fill('#lead-task', 'Треба бот для запису клієнтів у барбершоп.');
    await page.click('form button[type="submit"]');
    await page.waitForTimeout(800);
    check('когда ручка молчит — отправляем в Telegram', /Telegram/i.test(await status()), (await status()).slice(0, 44));

    await ctx.close();
  }

  /* ── страницы услуг ──────────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    for (const url of ['/boty/', '/sajty/', '/backend/']) {
      await page.goto(`${base}${url}`, { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      const info = await page.evaluate(() => {
        const cur = document.querySelector('nav a[aria-current]');
        return {
          h1: (document.querySelector('h1') || {}).textContent || '',
          prices: document.querySelectorAll('#services > div > ul > li').length,
          current: cur ? cur.getAttribute('href') : null
        };
      });
      check(`${url} открывается и знает, где находится`,
        info.h1.length > 8 && info.prices > 0 && info.current === url,
        `${info.prices} услуг, отмечено ${info.current}`);
    }
    check('на страницах услуг нет ошибок js', errors.length === 0, errors.slice(0, 2).join('; '));
    await ctx.close();
  }

  /* ── телефон: бургер ─────────────────────────────────────── */
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, locale: 'uk-UA'
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const shown = () => page.evaluate(() => {
      const menu = document.getElementById('mobileMenu');
      return !!menu && !menu.hidden && getComputedStyle(menu).display !== 'none';
    });
    check('меню закрыто на старте', !(await shown()));
    await page.click('header button[aria-label="Меню"]');
    await page.waitForTimeout(400);
    check('бургер открывает меню', await shown());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    check('Escape закрывает меню', !(await shown()));
    const back = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    check('фокус вернулся на кнопку', back === 'Меню', back || 'нет фокуса');
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(failed ? `\nНе прошло проверок: ${failed}` : '\nВсё живое работает.');
  process.exit(failed ? 1 : 0);
});
