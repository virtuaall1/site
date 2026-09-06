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
 * content.js писан для браузера: он кладёт данные в window.SITE.
 * Подставляем фальшивое окно и забираем оттуда — так файл остаётся
 * один и для страницы, и для сборки.
 */
function loadSite(root) {
  const path = require('path');
  const fake = {};
  global.window = fake;
  delete require.cache[require.resolve(path.join(root, 'js', 'content.js'))];
  require(path.join(root, 'js', 'content.js'));
  delete global.window;
  if (!fake.SITE) throw new Error('content.js не отдал window.SITE');
  return fake.SITE;
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
 * Карта сайта из того, что действительно уехало в сборку: читаем
 * готовый dist, а не список в голове. Снятый кейс туда не попадает —
 * значит, и в карте его не будет, без отдельной строчки.
 */
function sitemap(distDir, home) {
  const fs = require('fs');
  const path = require('path');

  const urls = [{ loc: home, priority: '1.0', freq: 'weekly' }];

  const casesDir = path.join(distDir, 'cases');
  if (fs.existsSync(casesDir)) {
    for (const name of fs.readdirSync(casesDir).sort()) {
      if (name.startsWith('_')) continue;                       // общие стили кейсов
      if (!fs.existsSync(path.join(casesDir, name, 'index.html'))) continue;
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
