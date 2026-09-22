/**
 * Снимает карточку для соцсетей в img/og.jpg.
 *
 *   NODE_PATH=/tmp/node_modules node brand/og/render.js
 *
 * Ровно 1200×630 и без масштабирования: телеграм и фейсбук режут всё,
 * что не в этих пропорциях, а пережимать снимок ещё раз незачем.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'img', 'og.jpg');
const W = 1200, H = 630;

const srv = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  /* Карточка тянет те же шрифты, что и сайт, поэтому сервер должен
     уметь отдавать не только html: с чужим типом браузер молча
     откажется применять css, и надпись уедет системным шрифтом. */
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.woff2': 'font/woff2'
  };
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1
  });
  await page.goto(`${base}/brand/og/index.html`, { waitUntil: 'load' });
  // Ждём шрифты: canvas и скриншот не умеют перерисовать текст
  // задним числом, и кадр, снятый на полсекунды раньше, выйдет
  // системным шрифтом вместо Unbounded.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT, type: 'jpeg', quality: 92 });
  await browser.close();
  srv.close();
  console.log(`→ img/og.jpg  ${W}×${H}  ${(fs.statSync(OUT).size / 1024).toFixed(0)} КБ`);
});
