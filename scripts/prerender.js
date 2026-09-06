'use strict';
/**
 * Готовая разметка списков — прямо в index.html при сборке.
 *
 * Кейсы, услуги, шаги и вопросы рисует js/app.js. Пока он не
 * доехал, в этих местах пусто: поисковик, читалка и человек с
 * выключенным JS видят четыре пустые коробки. Здесь те же списки
 * собираются строкой из тех же данных и вставляются в разметку —
 * страница осмысленна ещё до первого байта скрипта.
 *
 * Правда по-прежнему одна: и тут, и в app.js данные берутся из
 * js/content.js. За тем, чтобы разметка не разошлась с данными,
 * следит scripts/check.js.
 *
 * Язык — украинский, валюта — гривна: это то, что видит человек,
 * пришедший без сохранённого выбора. Дальше app.js перерисовывает
 * списки под его язык и валюту, как раньше.
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = s => String(s).replace(/[&<>"]/g, c => ESC[c]);

/** те же вычисления, что в app.js: доллар округляем до пятёрки */
const uah = n => '₴' + n.toLocaleString('uk-UA');
const usd = (n, rate) => '$' + Math.round(n / rate / 5) * 5;

function make(site, rate) {
  const { PROJECTS, SERVICES, PROCESS, FAQ, I18N, LINKS } = site;
  const t = key => I18N.uk[key] || key;
  const tg = text => `${LINKS.telegram}?text=${encodeURIComponent(text)}`;

  /* Кейсы: только те, у которых есть и снимок, и куда вести */
  const cases = (PROJECTS || []).filter(p => p.shot && p.link).map((p, i) => {
    const c = p.uk;
    const base = p.shot.replace(/\.jpg$/, '');
    const first = i === 0;
    const tags = (c.tags || []).slice(0, 3).map(x => `<span>${esc(x)}</span>`).join('');
    return `<li class="case reveal"><a class="case-link" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">` +
      `<span class="case-frame"><picture>` +
      `<source srcset="${esc(base)}.avif" type="image/avif">` +
      `<source srcset="${esc(base)}.webp" type="image/webp">` +
      `<img class="case-shot" src="${esc(p.shot)}" alt="${esc(c.name)}" width="960" height="600" decoding="async"` +
      ` loading="${first ? 'eager' : 'lazy'}"${first ? ' fetchpriority="high"' : ''}>` +
      `</picture></span>` +
      `<h3 class="case-name">${esc(c.name)}</h3>` +
      `<div class="case-tags">${tags}</div>` +
      `<span class="case-open"><span>${esc(t('cases.open'))}</span><span aria-hidden="true">↗</span></span>` +
      `</a></li>`;
  }).join('');

  /* Услуги. Раскрытых примеров тут нет: их макеты лежат в
     <template> и оживают только скриптом — вторая копия макета в
     разметке весила бы больше, чем стоит. Цены и описания на
     месте, а это и есть то, что читают. */
  const prices = SERVICES.map((s, i) => {
    const c = s.uk;
    const money = s.price
      ? `<span class="price-value">${esc(t('services.from'))} ${esc(uah(s.price))}</span>` +
        `<span class="price-alt">≈ ${esc(usd(s.price, rate))}</span>`
      : `<span class="price-value is-quote">${esc(t('services.custom'))}</span>`;
    const bullets = c.bullets.map(b => `<li>${esc(b)}</li>`).join('');
    const featured = s.featured ? `<span class="price-featured">${esc(t('services.featured'))}</span>` : '';
    const order = tg(t('services.orderText').replace('{name}', c.name));
    const n = Math.min(i, 6);
    return `<li class="price-row reveal" data-i="${n}" style="--i:${n}"><div class="price-head">` +
      `<div class="price-inner">` +
      `<h3 class="price-name">${esc(c.name)}${featured}</h3>` +
      `<p class="price-desc">${esc(c.desc)}</p>` +
      `<div class="price-right"><div class="price-money">${money}</div>` +
      `<a class="price-cta" href="${esc(order)}" target="_blank" rel="noopener noreferrer">${esc(t('services.order'))} →</a>` +
      `</div></div><ul class="price-bullets">${bullets}</ul></div></li>`;
  }).join('');

  const steps = PROCESS.map((s, i) => {
    const c = s.uk;
    return `<li class="step reveal"><span class="step-num">${String(i + 1).padStart(2, '0')}</span>` +
      `<div><h3 class="step-title">${esc(c.title)}</h3><p class="step-desc">${esc(c.desc)}</p></div></li>`;
  }).join('');

  const faq = FAQ.map((item, i) => {
    const c = item.uk;
    const id = `faq-a-${i}`;
    return `<div class="faq-item reveal">` +
      `<button class="faq-q" type="button" aria-expanded="false" aria-controls="${id}">` +
      `<span>${esc(c.q)}</span><span class="faq-sign" aria-hidden="true"></span></button>` +
      `<div class="faq-a" id="${id}"><div><p>${esc(c.a)}</p></div></div></div>`;
  }).join('');

  return { caseGrid: cases, priceList: prices, steps, faqList: faq };
}

/**
 * Вставка в пустой контейнер по id. Помечаем контейнер data-pre:
 * app.js по этой метке понимает, что первый раз рисовать нечего, и
 * не перетирает готовую разметку своей такой же.
 */
function inject(html, parts) {
  for (const [id, markup] of Object.entries(parts)) {
    const re = new RegExp(`(<(ul|ol|div)([^>]*\\sid="${id}")([^>]*)>)</\\2>`);
    if (!re.test(html)) throw new Error(`не нашёл пустой контейнер #${id}`);
    html = html.replace(re, (_, open, tag, idAttr, rest) =>
      `<${tag}${idAttr}${rest} data-pre="uk">${markup}</${tag}>`);
  }
  return html;
}

/** Сколько строк должно получиться — по этому check.js ловит расхождение. */
function counts(site) {
  return {
    caseGrid: (site.PROJECTS || []).filter(p => p.shot && p.link).length,
    priceList: site.SERVICES.length,
    steps: site.PROCESS.length,
    faqList: site.FAQ.length
  };
}

module.exports = { make, inject, counts };
