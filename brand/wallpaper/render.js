/**
 * Рендер шпалер у файли.
 *
 *   NODE_PATH=/tmp/node_modules node brand/wallpaper/render.js
 *   NODE_PATH=/tmp/node_modules node brand/wallpaper/render.js flow
 *
 * Кожен розмір знімається окремо і рівно в свою кількість пікселів:
 * нічого не масштабується, тому 4K справді 4K, а не розтягнутий Full HD.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');

const ACCENT = process.env.WALL_ACCENT || '#FF7A45';

const VARIANTS = [
  { id: 'mesh', n: 'мʼяке світло' },
  { id: 'flow', n: 'течія' },
  { id: 'grid', n: 'сітка' }
];

const SIZES = [
  { id: 'desktop-1920x1080', w: 1920, h: 1080, mark: 1 },
  { id: 'desktop-3840x2160', w: 3840, h: 2160, mark: 1 },
  { id: 'phone-1080x1920',   w: 1080, h: 1920, mark: 0 },
  { id: 'phone-1179x2556',   w: 1179, h: 2556, mark: 0 },  // iPhone 15
  { id: 'phone-2160x3840',   w: 2160, h: 3840, mark: 0 }
];

const only = process.argv.slice(2);
const LIST = only.length ? VARIANTS.filter(v => only.includes(v.id)) : VARIANTS;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  for (const v of LIST) {
    for (const size of SIZES) {
      const ctx = await browser.newContext({
        viewport: { width: size.w, height: size.h },
        deviceScaleFactor: 1
      });
      const page = await ctx.newPage();
      const url = `${base}/brand/wallpaper/index.html` +
        `?v=${v.id}&w=${size.w}&h=${size.h}&a=${encodeURIComponent(ACCENT)}&mark=${size.mark}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true, { timeout: 120000 });
      await page.waitForTimeout(150);

      const file = path.join(OUT, `${v.id}-${size.id}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 94 });
      await ctx.close();

      const mb = (fs.statSync(file).size / 1048576).toFixed(2);
      console.log(`→ ${path.basename(file)}  ${size.w}×${size.h}  ${mb} МБ`);
    }
  }

  await browser.close();
  srv.close();
});
