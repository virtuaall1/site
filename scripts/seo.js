'use strict';
/**
 * Структурированные данные и карта сайта — из тех же данных, что
 * рисуют страницу.
 *
 * Смысл в том, чтобы не держать вторую копию правды. Цена услуги
 * записана в content.js один раз; отсюда она попадает и в разметку,
 * и в JSON-LD, и поисковик видит ровно то же число, что человек.
 * Поменяли цену — оба места поехали за ней сами.
 *
 * Ничего из этого не видно на экране: JSON-LD читают роботы, карту
 * сайта — тоже.
 */

/**
 * Данные сайта лежат обычным модулем в app/lib/content.js. Файл
 * этот — CommonJS, поэтому забираем через динамический импорт:
 * одна правда и для страниц, и для структурированных данных.
 */
async function loadSite(root) {
  const path = require('path');
  const url = require('url');
  const file = url.pathToFileURL(path.join(root, 'app', 'lib', 'content.js')).href;
  const mod = await import(file);
  if (!mod.SITE) throw new Error('app/lib/content.js не отдал SITE');
  return mod.SITE;
}

/** Гривна в USD по тому же курсу, что записан в app.js как запасной. */
const RATE = 44.61;

function jsonLd(site, home, rate = RATE) {
  const { LINKS, SERVICES, FAQ, PROJECTS } = site;

  const org = {
    '@type': 'ProfessionalService',
    '@id': `${home}#studio`,
    name: 'v.studio',
    url: home,
    description: site.I18N.uk['meta.desc'],
    areaServed: 'UA',
    availableLanguage: ['uk', 'en'],
    knowsAbout: ['Python', 'Java', 'Spring Boot', 'Telegram Bot API', 'SQLite', 'PostgreSQL'],
    sameAs: [LINKS.github, LINKS.telegram].filter(Boolean),
    email: LINKS.email ? `mailto:${LINKS.email}` : undefined
  };

  // Прайс: только те услуги, у которых цена действительно названа.
  // «За домовленістю» в разметку цен не годится — это не цена.
  const offers = SERVICES
    .filter(s => s.price)
    .map(s => ({
      '@type': 'Offer',
      name: s.uk.name,
      description: s.uk.desc,
      price: Math.round(s.price / rate),
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: s.price,
        priceCurrency: 'UAH',
        valueAddedTaxIncluded: false
      },
      availability: 'https://schema.org/InStock',
      seller: { '@id': `${home}#studio` }
    }));

  const catalog = {
    '@type': 'OfferCatalog',
    name: 'Послуги та ціни',
    url: `${home}#services`,
    itemListElement: offers
  };

  const faq = {
    '@type': 'FAQPage',
    '@id': `${home}#faq`,
    mainEntity: FAQ.map(item => ({
      '@type': 'Question',
      name: item.uk.q,
      acceptedAnswer: { '@type': 'Answer', text: item.uk.a }
    }))
  };

  // В портфолио идут только те работы, что реально открываются
  const works = {
    '@type': 'ItemList',
    '@id': `${home}#work`,
    name: 'Кейси',
    itemListElement: (PROJECTS || [])
      .filter(p => p.link)
      .map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: p.link,
        name: p.uk.name
      }))
  };

  return { '@context': 'https://schema.org', '@graph': [org, catalog, faq, works] };
}

/**
 * Карта сайта: страницы из общего списка плюс то, что реально
 * уехало в dist. Снятый кейс туда не попадает — значит, и в карте
 * его не будет, без отдельной строчки.
 */
function sitemap(distDir, home, pages = ['/']) {
  const fs = require('fs');
  const path = require('path');

  const urls = pages.map(p => ({
    loc: home.replace(/\/$/, '') + p,
    priority: p === '/' ? '1.0' : '0.8',
    freq: 'weekly'
  }));

  /* Страницы кейсов — это демо, и каждая помечена noindex: они
     сделаны под вымышленного клиента, и в выдаче по запросу
     «барбершоп Крива» им делать нечего.

     Звать туда поисковик картой сайта, когда сама страница просит
     её не индексировать, — прямое противоречие. Поэтому такие
     страницы в карту не попадают: читаем каждую и проверяем. */
  const casesDir = path.join(distDir, 'cases');
  if (fs.existsSync(casesDir)) {
    for (const name of fs.readdirSync(casesDir).sort()) {
      if (name.startsWith('_')) continue;                       // общие стили кейсов
      const file = path.join(casesDir, name, 'index.html');
      if (!fs.existsSync(file)) continue;
      if (/name="robots"[^>]*noindex/.test(fs.readFileSync(file, 'utf8'))) continue;
      urls.push({ loc: `${home}cases/${name}/`, priority: '0.7', freq: 'monthly' });
    }
  }

  const body = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

module.exports = { loadSite, jsonLd, sitemap, RATE };
