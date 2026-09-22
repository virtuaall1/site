/**
 * Аватарки для телеграма, инстаграма и гитхаба.
 *
 *   NODE_PATH=/tmp/node_modules node brand/avatar/render.js
 *
 * Один макет — несколько размеров. Снимается он вдвое крупнее
 * самого большого нужного размера, а потом уменьшается: тонкая
 * сетка точек и кромка буквы остаются чистыми. Снимок сразу в 460
 * даёт рваные края — браузер там рисует один пиксель на точку и
 * округляет, как выйдет.
 *
 * Рядом кладётся apple-touch-icon: айфон, когда сайт кладут на
 * рабочий стол, берёт именно его, а не svg из <link rel=icon>.
 *
 * Нужен playwright-core и Chromium; путь к браузеру — в CHROME_PATH.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'png');

const BOARD = 1080;   // размер макета
const SCALE = 2;      // во столько раз крупнее снимаем

/* Куда что идёт. Размеры не выдуманы: столько просят сами площадки.
   Телеграм показывает аватарку ботa кружком до 512, инстаграм
   хранит 1080, гитхаб — 460, айфон на рабочем столе — 180. */
const SIZES = [
  ['telegram.png', 512, 'аватарка бота і каналу в Telegram'],
  ['instagram.png', 1080, 'аватарка в Instagram'],
  ['github.png', 460, 'аватарка на GitHub'],
  ['apple-touch-icon.png', 180, 'іконка на робочому столі iPhone']
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2'
};

const srv = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

/** Уменьшение в самой странице: canvas со сглаживанием по максимуму. */
async function downscale(page, base64, size) {
  return page.evaluate(async ({ base64, size }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + base64;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);

    return canvas.toDataURL('image/png').split(',')[1];
  }, { base64, size });
}

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  const page = await browser.newPage({
    viewport: { width: BOARD, height: BOARD },
    deviceScaleFactor: SCALE
  });

  await page.goto(`${base}/brand/avatar/index.html`, { waitUntil: 'load' });
  // Шрифты: снимок, сделанный на полсекунды раньше, выйдет
  // системной гарнитурой, а переснять текст задним числом нельзя.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const shot = (await page.screenshot({ type: 'png' })).toString('base64');

  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, size, what] of SIZES) {
    const data = await downscale(page, shot, size);
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`→ brand/avatar/png/${name.padEnd(21)} ${String(size).padStart(4)}×${size}  ` +
                `${(fs.statSync(file).size / 1024).toFixed(0).padStart(3)} КБ  ${what}`);
  }

  // Иконка рабочего стола едет на сайт, остальное — руками в панели
  // площадок, в сборку ему не надо.
  fs.copyFileSync(path.join(OUT, 'apple-touch-icon.png'), path.join(ROOT, 'img', 'apple-touch-icon.png'));
  console.log('→ img/apple-touch-icon.png  (уходить у dist)');

  await browser.close();
  srv.close();
});
