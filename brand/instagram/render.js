/**
 * Рендер макетів у PNG.
 *
 *   node brand/instagram/render.js
 *
 * Знімає кожен макет у потрійній роздільності й аж потім зменшує до
 * розміру, який чекає Instagram. Так тонкі лінійки й кутові мітки
 * лишаються різкими: браузер малює їх по три пікселі на кожен, а
 * зменшення усереднює. Знімок одразу в 1080 дає рвані краї.
 *
 * Поруч кладе оригінали в png/3x/ — вони згодяться туди, де можна
 * більше за 1080: сайт, Telegram, друк.
 *
 * Потрібен playwright-core і Chromium; шлях до браузера — у CHROME_PATH.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SCALE = 3;

const BOARDS = [
  'avatar',
  'hl-bots', 'hl-sites', 'hl-price', 'hl-cases', 'hl-about', 'hl-contact',
  'post-about', 'post-service', 'post-case', 'post-quote',
  'carousel-1', 'carousel-2', 'carousel-3',
  'story'
];

/** Зменшення в самій сторінці: canvas із високою якістю згладжування. */
async function downscale(page, base64, width, height) {
  return page.evaluate(async ({ base64, width, height }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + base64;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/png').split(',')[1];
  }, { base64, width, height });
}

(async () => {
  const dir = path.join(__dirname, 'png');
  const dir3x = path.join(dir, '3x');
  fs.mkdirSync(dir3x, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: SCALE
  });

  await page.goto('file://' + path.join(__dirname, 'kit.html'));
  await page.waitForTimeout(4000); // шрифти

  for (const id of BOARDS) {
    const el = page.locator(`#${id}`);
    const box = await el.boundingBox();
    const big = await el.screenshot();

    fs.writeFileSync(path.join(dir3x, `${id}@3x.png`), big);

    const small = await downscale(page, big.toString('base64'), Math.round(box.width), Math.round(box.height));
    fs.writeFileSync(path.join(dir, `${id}.png`), Buffer.from(small, 'base64'));

    console.log(`→ ${id}.png  ${Math.round(box.width)}×${Math.round(box.height)}  (+3x)`);
  }

  await browser.close();
})();
