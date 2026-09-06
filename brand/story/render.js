/**
 * Рендер сторис-обзора сайта в mp4.
 *
 *   node brand/story/render.js            # все пять
 *   node brand/story/render.js st-3-price # только названные
 *
 * Внутри рамки телефона крутится настоящий сайт, поэтому нужен
 * http: iframe с file:// не пускает к своему документу. Сервер
 * поднимается здесь же и гасится в конце.
 *
 * Кадры снимаются покадрово через setT(0…1), а не «в реальном
 * времени»: ролик получается одинаковым при любом настроении
 * машины.
 */
const fs = require('fs');
const os = require('os');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..', '..');
const W = 1080, H = 1920;
const SS = 1.5;      // во сколько раз снимаем крупнее итога
const FPS = 30;
const SECONDS = 15;  // столько длится сегмент истории в инстаграме

const { SCENES } = require('./scenes.js');
const only = process.argv.slice(2);
const LIST = only.length ? SCENES.filter(s => only.includes(s.id)) : SCENES;

const FFMPEG = process.env.FFMPEG_PATH ||
  '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const CHROME = process.env.CHROME_PATH ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

function serve() {
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('нет такого файла'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

/** Телефонный режим и стартовое состояние — до первой строчки сайта */
function initScript(start) {
  return `(() => {
    const site = location.pathname === '/' || /\\/index\\.html$/.test(location.pathname);
    if (!site) return;
    try {
      localStorage.setItem('lang', ${JSON.stringify(start.lang)});
      localStorage.setItem('theme', ${JSON.stringify(start.theme)});
      localStorage.setItem('currency', ${JSON.stringify(start.currency)});
    } catch (e) {}
    // сайт спрашивает про палец, а не про мышь: в headless этого нет,
    // поэтому отвечаем за него — иначе снимем десктопную версию
    const real = window.matchMedia.bind(window);
    window.matchMedia = q => (/hover: none|pointer: coarse/.test(q)
      ? { matches: true, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }
      : real(q));
  })();`;
}

/**
 * Сайт тянет Unbounded и Onest с гугла. Из песочницы туда не пройти,
 * а без них ролик показал бы не тот шрифт, который видят люди.
 * Поэтому файлы лежат рядом (fonts/), и запросы к гуглу мы отдаём
 * из них — сайт при этом не меняем ни на строчку.
 */
async function useCachedFonts(ctx) {
  const dir = path.join(__dirname, 'fonts');
  const css = path.join(dir, 'gf.css');
  if (!fs.existsSync(css)) return false;
  const map = new Map(fs.readFileSync(path.join(dir, 'map.txt'), 'utf8')
    .trim().split('\n').map(l => l.split(' ')));

  await ctx.route('https://fonts.googleapis.com/**', route => route.fulfill({
    status: 200, contentType: 'text/css; charset=utf-8', body: fs.readFileSync(css, 'utf8')
  }));
  await ctx.route('https://fonts.gstatic.com/**', route => {
    const file = map.get(route.request().url());
    if (!file) return route.abort();
    route.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(path.join(dir, file)) });
  });
  return true;
}

(async () => {
  const out = path.join(__dirname, 'video');
  fs.mkdirSync(out, { recursive: true });

  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({ executablePath: CHROME });

  for (const scene of LIST) {
    const ctx = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: SS,
      locale: 'uk-UA',
      timezoneId: 'Europe/Kyiv',
      colorScheme: scene.start.theme === 'dark' ? 'dark' : 'light',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15' +
                 ' (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    });
    await ctx.addInitScript(initScript(scene.start));
    if (!await useCachedFonts(ctx)) {
      console.warn('  ! нет brand/story/fonts — снимем запасным шрифтом');
    }

    const page = await ctx.newPage();
    await page.goto(`${base}/brand/story/stage.html?scene=${scene.id}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true);
    await page.evaluate(u => window.__attach(u), `${base}/index.html`);
    await page.waitForTimeout(2500);                       // шрифты, курс, картинки кейсов
    await page.evaluate(() => window.__lockLinks());
    await page.evaluate(() => window.__warm());            // прогреть появления
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__syncChrome());
    await page.evaluate(t => window.setT(t), 0);
    await page.waitForTimeout(400);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-' + scene.id + '-'));
    const total = FPS * SECONDS;
    for (let f = 0; f < total; f++) {
      await page.evaluate(t => window.setT(t), f / (total - 1));
      await page.screenshot({
        path: path.join(dir, String(f).padStart(4, '0') + '.jpg'),
        type: 'jpeg', quality: 94
      });
    }

    const file = path.join(out, scene.id + '.mp4');
    execFileSync(FFMPEG, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'),
      '-vf', `scale=${W}:${H}:flags=lanczos`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file
    ]);
    fs.rmSync(dir, { recursive: true, force: true });

    // моменты для звука: те же числа, что и в сценарии
    fs.writeFileSync(path.join(out, scene.id + '.timing.json'), JSON.stringify({
      id: scene.id, seconds: SECONDS,
      events: (scene.acts || []).map(a => ({ kind: a.kind, at: +(a.t * SECONDS).toFixed(3) }))
        .concat((scene.caps || []).map(c => ({ kind: 'cap', at: +(c.a * SECONDS).toFixed(3) })))
        .concat(scene.outro ? [{ kind: 'outro', at: +(scene.outro.a * SECONDS).toFixed(3) }] : [])
        .sort((a, b) => a.at - b.at)
    }, null, 1));

    await ctx.close();
    console.log(`→ ${scene.id}.mp4  ${W}×${H}  ${SECONDS}s  ` +
                `${(fs.statSync(file).size / 1048576).toFixed(1)} MB`);
  }

  await browser.close();
  srv.close();
})();
