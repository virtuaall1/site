/**
 * Рендер рухомих сторіс у mp4.
 *
 *   node brand/instagram/render-video.js
 *
 * Кадри знімає не «в реальному часі», а покадрово: сторінці кажуть
 * setT(0…1), знімають, і далі. Тому ролик виходить рівний навіть тоді,
 * коли машина гальмує, і завжди однаковий.
 *
 * Знімає у півтора рази більше за потрібне й зменшує вже в ffmpeg —
 * так тонкі лінійки й шрифт не рвуться.
 *
 * Потрібні: playwright-core, Chromium (CHROME_PATH) і ffmpeg (FFMPEG_PATH).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const W = 1080, H = 1920;
const SS = 1.5;          // наскільки знімаємо більше за кінцевий розмір
const FPS = 30;
const SECONDS = 6;
const ALL = [
  { id: 'reel-intro', scene: 'intro' },
  { id: 'reel-cases', scene: 'cases' },
  { id: 'reel-chat', scene: 'chat' },
  { id: 'reel-terminal', scene: 'terminal' },
  { id: 'reel-price', scene: 'price' },
  { id: 'reel-flow', scene: 'flow' },
  { id: 'reel-stack', scene: 'stack' },
  { id: 'reel-type', scene: 'type' },
  { id: 'reel-counter', scene: 'counter' },
  { id: 'reel-checklist', scene: 'checklist' },
  { id: 'reel-wipe', scene: 'wipe' },
  { id: 'reel-dots', scene: 'dots' }
];

/* Можна назвати сцени аргументами — зручно перезняти одну, не
   ганяючи всі: node render-video.js chat dots */
const only = process.argv.slice(2);
const SCENES = only.length ? ALL.filter(s => only.includes(s.scene)) : ALL;

const ffmpeg = process.env.FFMPEG_PATH ||
  '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';

(async () => {
  const out = path.join(__dirname, 'video');
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SS });

  const total = FPS * SECONDS;

  for (const { id, scene } of SCENES) {
    const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'vstudio-' + scene + '-'));

    await page.goto('file://' + path.join(__dirname, 'motion.html') + '?scene=' + scene);
    await page.waitForTimeout(4000);            // шрифти й знімки кейсів
    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    for (let f = 0; f < total; f++) {
      await page.evaluate(t => window.setT(t), f / (total - 1));
      await page.screenshot({
        path: path.join(frames, String(f).padStart(4, '0') + '.jpg'),
        type: 'jpeg',
        quality: 95
      });
    }

    const file = path.join(out, id + '.mp4');
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
    console.log(`→ ${id}.mp4  ${W}×${H}  ${SECONDS}s  ${(fs.statSync(file).size / 1048576).toFixed(1)} MB`);
  }

  await browser.close();
})();
