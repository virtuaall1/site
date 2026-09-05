/**
 * Крапка — персонаж студии.
 *
 * Взят не со стороны: это та самая точка из «v.studio», квадратная,
 * потому что в Unbounded точка квадратная. Отсюда и характер —
 * «поставити крапку» значит довести до конца, а не поставить
 * закорючку в углу макета.
 *
 * Она не украшение: в роликах она делает работу. Прыгает по списку —
 * пункты появляются там, где она приземлилась. Тыкает в снимок —
 * снимок меняется. В конце вырастает в плашку с контактом, потому
 * что плашка того же цвета: персонаж буквально становится призывом.
 *
 * Механика обычная мультипликационная, без неё живого не выходит:
 *   — прыжок идёт по дуге, а не по прямой;
 *   — при приземлении сплющивается и пружинит;
 *   — в прыжке вытягивается по направлению движения;
 *   — моргает и смотрит туда, куда летит.
 */
'use strict';

const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const outCubic = p => 1 - Math.pow(1 - p, 3);
const inOutCubic = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const outBack = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

class Dot {
  constructor(stage, size = 76) {
    this.size = size;
    this.node = document.createElement('div');
    this.node.className = 'dot';
    this.node.innerHTML = '<i></i><i></i>';
    this.eyes = [...this.node.children];
    stage.append(this.node);
    this.node.style.width = this.node.style.height = size + 'px';
  }

  /** Приземление: сплющило и отпружинило. Затухающая синусоида. */
  static squash(t, landAt, dur = 0.06) {
    const q = seg(t, landAt, landAt + dur);
    if (q <= 0 || q >= 1) return 0;
    return Math.sin(q * Math.PI * 2) * Math.exp(-q * 4) * 0.42;
  }

  /** Моргает не по расписанию, а с паузами разной длины. */
  static blink(t) {
    const at = [0.12, 0.31, 0.44, 0.63, 0.78, 0.91];
    return at.some(a => t > a && t < a + 0.022) ? 0.12 : 1;
  }

  /**
   * Ставит персонажа в кадр.
   * pos    — {x, y} центр в координатах сцены
   * opts   — {squash, stretch, look, rot, scale, alpha}
   */
  place(pos, opts = {}) {
    const s = this.size;
    const e = opts.squash || 0;
    const sx = (1 + e) * (opts.scale || 1) * (1 + (opts.stretch || 0) * -0.10);
    const sy = (1 - e) * (opts.scale || 1) * (1 + (opts.stretch || 0) * 0.16);
    const n = this.node;
    n.style.left = (pos.x - s / 2) + 'px';
    n.style.top = (pos.y - s / 2) + 'px';
    n.style.transform = `rotate(${(opts.rot || 0).toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    n.style.opacity = (opts.alpha == null ? 1 : opts.alpha).toFixed(3);
    const look = opts.look || 0;
    this.eyes.forEach(eye => {
      eye.style.transform = `translateX(${(look * 5).toFixed(1)}px) scaleY(${(opts.blink == null ? 1 : opts.blink).toFixed(2)})`;
      eye.style.opacity = (opts.eyes == null ? 1 : opts.eyes).toFixed(3);
    });
  }
}

/**
 * Прыжок по дуге. Подброс тем выше, чем длиннее прыжок, — иначе
 * короткие перескоки выглядят как подлёты на ракете.
 */
function arc(p, from, to) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const lift = Math.min(180, 60 + dist * 0.28);
  const e = inOutCubic(p);
  return {
    x: lerp(from.x, to.x, e),
    y: lerp(from.y, to.y, e) - Math.sin(Math.PI * p) * lift
  };
}

/**
 * Прогоняет персонажа по списку остановок и говорит, где он сейчас.
 * stops — [{at, x, y}], at — момент приземления.
 */
function walk(t, stops) {
  let from = stops[0];
  let to = stops[0];
  let start = 0;
  for (let i = 1; i < stops.length; i++) {
    if (t >= stops[i - 1].at) { from = stops[i - 1]; to = stops[i]; start = stops[i - 1].at; }
  }
  if (t < stops[0].at) return { pos: stops[0], squash: 0, stretch: 0, look: 0 };

  const p = clamp((t - start) / Math.max(0.001, to.at - start));
  const pos = arc(p, from, to);
  const flying = p > 0.02 && p < 0.98;
  return {
    pos,
    squash: Dot.squash(t, to.at),
    stretch: flying ? Math.sin(Math.PI * p) : 0,
    look: Math.sign(to.x - from.x)
  };
}
