/**
 * Рендер роликов для TikTok.
 *
 *   node brand/tiktok/render.js              # все
 *   node brand/tiktok/render.js price bot    # только названные
 *
 * Девять секунд вместо шести: на TikTok досматриваемость важнее
 * длины, а хук держит внимание — за шесть секунд четыре пункта
 * не успевают прочитаться.
 *
 * Кадры снимаются в полтора раза больше нужного и сжимаются уже в
 * ffmpeg — иначе тонкие линии и шрифт на видео сыплются.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const W = 1080, H = 1920, SS = 1.5, FPS = 30, SECONDS = 9;

const ALL = Object.keys(JSON.parse(JSON.stringify(
  { price: 1, bot: 1, ask: 1, cases: 1, vs: 1, steps: 1, included: 1, auto: 1, mistakes: 1, dm: 1 }
)));
const only = process.argv.slice(2);
const LIST = only.length ? ALL.filter(s => only.includes(s)) : ALL;

const ffmpeg = process.env.FFMPEG_PATH ||
  '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';

(async () => {
  const out = path.join(__dirname, 'video');
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SS });
  const total = FPS * SECONDS;

  for (const scene of LIST) {
    const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-' + scene + '-'));

    await page.goto('file://' + path.join(__dirname, 'motion.html') + '?scene=' + scene);
    await page.waitForTimeout(4000);          // шрифты и снимки работ
    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    for (let f = 0; f < total; f++) {
      await page.evaluate(t => window.setT(t), f / (total - 1));
      await page.screenshot({ path: path.join(frames, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 95 });
    }

    const file = path.join(out, `tt-${scene}.mp4`);
    execFileSync(ffmpeg, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(FPS),
      '-i', path.join(frames, '%04d.jpg'),
      '-vf', `scale=${W}:${H}:flags=lanczos`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      file
    ]);

    fs.rmSync(frames, { recursive: true, force: true });
    console.log(`→ tt-${scene}.mp4  ${W}×${H}  ${SECONDS}s  ${(fs.statSync(file).size / 1048576).toFixed(1)} MB`);
  }

  await browser.close();
})();
