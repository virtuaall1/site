/**
 * Снимки страницы для глазной проверки после правок оформления.
 *
 *   NODE_PATH=/tmp/node_modules node scripts/look.js
 *   NODE_PATH=/tmp/node_modules node scripts/look.js 390 dark 0,1200,3400
 *   LOOK_PAGE=preview/print/index.html … node scripts/look.js 1280 light 0
 *
 * Поднимает статику из корня репозитория, открывает страницу
 * (по умолчанию index.html) в заданной ширине и теме и складывает
 * jpg в /tmp/look — или туда, куда скажет LOOK_OUT.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.LOOK_OUT || '/tmp/look';
const WIDTH = Number(process.argv[2] || 1280);
const THEME = process.argv[3] || 'light';
const YS = (process.argv[4] || '0').split(',').map(Number);
const PAGE = process.env.LOOK_PAGE || 'index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
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

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: 900 },
    deviceScaleFactor: 2,
    locale: 'uk-UA',
    colorScheme: THEME === 'dark' ? 'dark' : 'light'
  });
  await ctx.addInitScript(`try{
    localStorage.setItem('lang','uk');
    localStorage.setItem('theme',${JSON.stringify(THEME)});
    localStorage.setItem('currency','uah');
  }catch(e){}`);

  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('ошибка js: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('консоль: ' + m.text()); });

  await page.goto(`${base}/${PAGE}`, { waitUntil: 'load' });
  await page.waitForTimeout(2200);

  // горизонтальной прокрутки быть не должно ни на одной ширине
  const wide = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    view: window.innerWidth,
    height: document.documentElement.scrollHeight,
    out: [...document.querySelectorAll('body *')]
      .filter(n => { const r = n.getBoundingClientRect();
        return r.width && (r.right > window.innerWidth + 1 || r.left < -1); })
      .slice(0, 8)
      .map(n => n.tagName.toLowerCase() + '.' + (n.className.baseVal || n.className || '').toString().split(' ')[0])
  }));
  console.log(`${WIDTH}px ${THEME}: страница ${wide.height}px, прокрутка вширь ${wide.scroll}/${wide.view}`);
  if (wide.out.length) console.log('  вылезает:', wide.out.join(', '));
  problems.forEach(p => console.log('  ' + p));

  for (const y of YS) {
    await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await page.waitForTimeout(700);
    const name = PAGE.replace(/\/?index\.html$/, '').replace(/[\/]/g, '-') || 'main';
    const file = path.join(OUT, `${name}-${WIDTH}-${THEME}-${String(y).padStart(5, '0')}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 72 });
    console.log('  →', file);
  }

  await browser.close();
  srv.close();
});
