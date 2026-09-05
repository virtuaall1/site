/**
 * Снимает моменты событий из готовых сцен.
 *
 *   node brand/instagram/timing.js
 *
 * Тайминги в motion.html лежат числами внутри функций сцен. Можно
 * было бы переписать их в таблицу для звука — и получить два места,
 * которые разъедутся при первой же правке. Поэтому здесь не таблица,
 * а замер: сцена прогоняется по шагам, и фиксируется, когда что
 * произошло на самом деле.
 *
 * Ловим три вида событий:
 *   pop     — элемент проявился (прозрачность прошла половину);
 *   tick    — сменился текст (набор в терминале, накрутка чисел);
 *   whoosh  — поехала шторка (clip-path).
 *
 * Что из них чем звучит, решает sound.py.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SCENES = ['intro', 'cases', 'chat', 'terminal', 'price', 'flow',
                'stack', 'type', 'counter', 'checklist', 'wipe', 'dots'];
const STEPS = 360;          // столько же, сколько кадров в ролике
const SECONDS = 6;

/* Сцена dots рисуется на канве, в DOM ничего не меняется — её
   события описываем прямо здесь, по замыслу самой сцены. */
const CANVAS_ONLY = {
  dots: [
    { at: 0.06, kind: 'swarm' },     // точки полетели собираться
    { at: 0.55, kind: 'chord' },     // знак загорелся
    { at: 0.86, kind: 'pop' }        // подпись
  ]
};

(async () => {
  const out = path.join(__dirname, 'video');
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  for (const scene of SCENES) {
    await page.goto('file://' + path.join(__dirname, 'motion.html') + '?scene=' + scene);
    await page.waitForTimeout(3000);
    await page.waitForFunction(() => document.fonts.ready.then(() => true));

    const events = await page.evaluate(async steps => {
      const nodes = [...document.querySelectorAll('.stage *')]
        .filter(n => !n.closest('.marks') && n.tagName !== 'CANVAS');
      const seen = nodes.map(() => ({ shown: false, text: null, clip: null }));
      const found = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        window.setT(t);
        nodes.forEach((n, k) => {
          const st = seen[k];
          const cs = getComputedStyle(n);

          // прозрачность копится по родителям — берём итоговую
          let alpha = 1;
          for (let p = n; p && p !== document.body; p = p.parentElement) {
            alpha *= parseFloat(getComputedStyle(p).opacity || 1);
          }
          if (!st.shown && alpha > 0.5 && t > 0.03) { st.shown = true; found.push({ at: t, kind: 'pop' }); }
          if (st.shown && alpha < 0.15) st.shown = false;   // ушло — сможет вернуться

          // строка терминала во время набора держит внутри курсор,
          // и по «нет детей» её текст переставал отслеживаться —
          // весь набор букв терялся
          const txt = n.querySelectorAll('*').length <= 1 ? n.textContent : null;
          if (txt != null && st.text != null && txt !== st.text && txt.length > 0) {
            found.push({ at: t, kind: 'tick' });
          }
          if (txt != null) st.text = txt;

          const clip = cs.clipPath;
          if (st.clip && clip !== st.clip && clip !== 'none' && !st.wiped) {
            st.wiped = true;
            found.push({ at: t, kind: 'whoosh' });
          }
          st.clip = clip;
        });
      }
      return found;
    }, STEPS);

    const list = (CANVAS_ONLY[scene] || events)
      .sort((a, b) => a.at - b.at)
      // набор букв идёт часто — для тиков порог мельче
      .filter((e, i, all) => i === 0 || e.kind !== all[i - 1].kind ||
        e.at - all[i - 1].at > (e.kind === 'tick' ? 0.002 : 0.004));

    fs.writeFileSync(path.join(out, `reel-${scene}.timing.json`),
      JSON.stringify({ seconds: SECONDS, scene, events: list }));

    const by = list.reduce((m, e) => ({ ...m, [e.kind]: (m[e.kind] || 0) + 1 }), {});
    console.log(`${scene.padEnd(11)} ${JSON.stringify(by)}`);
  }

  await browser.close();
})();
