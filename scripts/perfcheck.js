/**
 * Что реально уезжает к человеку при первом открытии.
 *
 *   NODE_PATH=/tmp/node_modules node scripts/perfcheck.js
 *   NODE_PATH=/tmp/node_modules node scripts/perfcheck.js --src
 *
 * По умолчанию меряет собранный dist/ — то, что видит посетитель.
 * С --src меряет исходники, чтобы было с чем сравнить.
 *
 * Считает только свои файлы: чужие домены (GitHub, НБУ, шрифты) от
 * нас не зависят, и мешать их в общий вес — обманывать себя.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const DIR = process.argv.includes('--src') ? ROOT : path.join(ROOT, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.ico': 'image/x-icon'
};

/* Текст едет к человеку сжатым: это делает и Cloudflare, и любой
   нормальный сервер. Меряем то же самое, иначе разметка и скрипты
   выглядят вдвое тяжелее, чем есть на проводе. Картинки и шрифты
   уже сжаты — их второй раз не трогаем. */
const PACKABLE = /\.(html|css|js|svg|xml|txt|json)$/;

const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(DIR, rel);
  if (!file.startsWith(DIR)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }

  const head = { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' };
  const wantsGzip = /gzip/.test(req.headers['accept-encoding'] || '');
  let body = fs.readFileSync(file);
  if (wantsGzip && PACKABLE.test(file)) {
    body = zlib.gzipSync(body, { level: 9 });
    head['content-encoding'] = 'gzip';
  }
  head['content-length'] = String(body.length);
  res.writeHead(200, head);
  res.end(body);
});

const kb = n => (n / 1024).toFixed(1).padStart(7);

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  if (!fs.existsSync(path.join(DIR, 'index.html'))) {
    console.log('нет index.html в', DIR, '— сначала node scripts/build.js');
    srv.close();
    return;
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  for (const phone of [false, true]) {
    const ctx = await browser.newContext(phone
      ? { viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, locale: 'uk-UA' }
      : { viewport: { width: 1280, height: 900 }, locale: 'uk-UA' });

    const page = await ctx.newPage();
    const own = [];
    const foreign = new Set();

    page.on('response', async res => {
      const url = res.url();
      if (!url.startsWith(base)) { foreign.add(new URL(url).host); return; }
      // сколько прошло по проводу, а не сколько лежит на диске:
      // res.body() отдаёт уже распакованное
      let size = Number(res.headers()['content-length'] || 0);
      if (!size) {
        try { size = (await res.body()).length; } catch (e) { /* редирект или пусто */ }
      }
      own.push({ url: url.slice(base.length).split('?')[0], size, type: res.request().resourceType() });
    });

    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);

    const byType = {};
    let sum = 0;
    for (const r of own) {
      byType[r.type] = (byType[r.type] || 0) + r.size;
      sum += r.size;
    }

    console.log(`\n  ${phone ? 'телефон 390px' : 'десктоп 1280px'} — перший екран, до прокрутки (текст стиснутий, як на сервері)`);
    for (const [type, size] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${kb(size)} КБ  ${type}`);
    }
    console.log(`    ${kb(sum)} КБ  разом, ${own.length} запитів`);
    if (foreign.size) console.log(`    чужі домени: ${[...foreign].join(', ')}`);

    // самое тяжёлое — чтобы было видно, за что платим
    const top = own.filter(r => r.size > 8 * 1024).sort((a, b) => b.size - a.size).slice(0, 5);
    if (top.length) {
      console.log('    найважче:');
      top.forEach(r => console.log(`      ${kb(r.size)} КБ  ${r.url}`));
    }

    await ctx.close();
  }

  await browser.close();
  srv.close();
});
