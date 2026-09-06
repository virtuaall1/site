/**
 * Снимок страницы целиком — чтобы отдать вариант оформления
 * картинкой, а не ссылкой.
 *
 *   NODE_PATH=/tmp/node_modules node scripts/shot.js preview/work/index.html варіант-04.jpg
 *
 * Ширину и тему можно задать третьим и четвёртым аргументом.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const PAGE = process.argv[2];
const OUT = process.argv[3];
const WIDTH = Number(process.argv[4] || 1200);
const THEME = process.argv[5] || 'dark';

if (!PAGE || !OUT) {
  console.error('нужны страница и файл: node scripts/shot.js <страница> <файл.jpg>');
  process.exit(1);
}

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

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: 1000 },
    deviceScaleFactor: 1.5,
    locale: 'uk-UA',
    colorScheme: THEME === 'light' ? 'light' : 'dark'
  });
  await ctx.addInitScript(`try{
    localStorage.setItem('lang','uk');
    localStorage.setItem('theme',${JSON.stringify(THEME)});
    localStorage.setItem('currency','uah');
  }catch(e){}`);

  const page = await ctx.newPage();
  await page.goto(`${base}/${PAGE}`, { waitUntil: 'load' });
  await page.waitForTimeout(2200);

  // Кнопка «до вибору» — часть чернетки, а не оформления: на снимке
  // она только мешает.
  await page.evaluate(() => { const b = document.querySelector('.back'); if (b) b.remove(); });

  // Прокрутить до низа и обратно: так дорисуются ленивые картинки
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: OUT, type: 'jpeg', quality: 80, fullPage: true });
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`→ ${OUT}  ${WIDTH}px  ${kb} КБ`);

  await browser.close();
  srv.close();
});
