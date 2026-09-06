/**
 * Проверка конструктора: он должен переживать любое сочетание ручек.
 *
 *   NODE_PATH=/tmp/node_modules node scripts/tunercheck.js
 *
 * Кликает «Випадково» много раз подряд и после каждого раза смотрит
 * на то, что нельзя увидеть глазами за разумное время:
 *   — не съехала ли страница вширь;
 *   — читается ли текст на фоне и надпись на кнопке;
 *   — не осталось ли пустых мест там, где должен быть контент.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const ROUNDS = Number(process.env.ROUNDS || 60);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml'
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

/** Контраст по WCAG — та же формула, что в самом конструкторе. */
function contrast(a, b) {
  const ch = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = ([r, g, b2]) => 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b2);
  const la = L(a), lb = L(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const parse = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });

  let bad = 0;
  for (const width of [390, 1280]) {
    // Без этого getComputedStyle ловит цвет посреди перехода — и
    // проверка ругается на контраст, которого в покое нет.
    const ctx = await browser.newContext({
      viewport: { width, height: 900 }, locale: 'uk-UA', reducedMotion: 'reduce'
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${base}/preview/tuner/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(900);

    for (let i = 0; i < ROUNDS; i++) {
      await page.click('#rand');
      await page.waitForTimeout(40);

      const r = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const demo = document.getElementById('demo');
        const h1 = document.querySelector('.d-h1');
        const btn = document.querySelector('.d-btn-main');
        return {
          hash: location.hash,
          scroll: document.documentElement.scrollWidth,
          view: window.innerWidth,
          bg: getComputedStyle(demo).backgroundColor,
          text: getComputedStyle(h1).color,
          btnBg: getComputedStyle(btn).backgroundColor,
          btnFg: getComputedStyle(btn).color,
          h1h: h1.getBoundingClientRect().height,
          cards: [...document.querySelectorAll('.d-card')]
            .filter(n => n.getBoundingClientRect().height < 40).length,
          accent: cs.getPropertyValue('--accent').trim()
        };
      });

      const say = m => { console.log(`  ПЛОХО ${width}px #${i + 1}: ${m}\n    ${r.hash}`); bad++; };

      if (r.scroll > r.view + 1) say(`страница поехала вширь: ${r.scroll} при ${r.view}`);
      if (r.h1h < 20) say('заголовок схлопнулся');
      if (r.cards) say(`карточек без высоты: ${r.cards}`);

      const ct = contrast(parse(r.text), parse(r.bg));
      if (ct < 4.5) say(`текст не читается на фоне: контраст ${ct.toFixed(2)} — текст ${r.text} на ${r.bg}`);

      const cb = contrast(parse(r.btnFg), parse(r.btnBg));
      // у контурной кнопки заливки нет — там проверять нечего
      const filled = parse(r.btnBg).length === 3 && !/rgba\(0, 0, 0, 0\)/.test(r.btnBg);
      if (filled && cb < 3) say(`надпись на кнопке не читается: контраст ${cb.toFixed(2)}`);
    }

    errors.forEach(e => { console.log(`  ПЛОХО ${width}px: ошибка js — ${e}`); bad++; });
    console.log(`  ${width}px: ${ROUNDS} случайных сочетаний проверено`);
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(bad ? `\nПроблем: ${bad}` : '\nЛюбое сочетание ручек держится.');
  process.exit(bad ? 1 : 0);
});
