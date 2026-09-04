/**
 * Рендер макетів у PNG рівно того розміру, який чекає Instagram.
 *
 *   node brand/instagram/render.js
 *
 * Потрібен playwright-core і Chromium. Шлях до браузера можна задати
 * змінною CHROME_PATH.
 */
const path = require('path');
const { chromium } = require('playwright-core');

const BOARDS = [
  'avatar',
  'hl-bots', 'hl-sites', 'hl-price', 'hl-cases', 'hl-about', 'hl-contact',
  'post-service', 'post-case', 'post-quote',
  'carousel-1', 'carousel-2', 'carousel-3',
  'story'
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  await page.goto('file://' + path.join(__dirname, 'kit.html'));
  await page.waitForTimeout(4000); // шрифти

  for (const id of BOARDS) {
    const out = path.join(__dirname, 'png', `${id}.png`);
    await page.locator(`#${id}`).screenshot({ path: out });
    console.log('→', path.relative(process.cwd(), out));
  }

  await browser.close();
})();
