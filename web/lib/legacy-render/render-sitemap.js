const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity, localizeCountry, localizeAirport } = require('./data');
const { translate } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');

// [HTML-SITEMAP] Human- and crawler-facing sitemap hub. The XML sitemaps
// (sitemap-{lang}.xml) tell Googlebot which URLs exist; this page gives every
// one of those URLs a real, followable in-page link from a single crawlable
// document — a big internal-linking + discoverability win (Priority 1 / 9 of
// the SEO plan) with no fabricated data: every link points at a page that
// genuinely exists. Static/trust pages, the most popular routes, and the full
// country/city/airport/airline lists are each their own section.

const SITEMAP_CSS = `<style>
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.sitemap-intro{font-size:14px;color:var(--tx2);line-height:1.6;margin:0 0 8px}
.sitemap-section{margin-top:30px}
.sitemap-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:6px}
.sitemap-section-sub{font-size:12px;color:var(--tx3);margin:0 0 12px}
.sitemap-links{list-style:none;margin:0;padding:0;column-width:210px;column-gap:28px}
.sitemap-links li{break-inside:avoid;margin:0 0 7px;font-size:13.5px;line-height:1.4}
.sitemap-links a{color:var(--tx);text-decoration:none;border-bottom:1px solid transparent}
.sitemap-links a:hover{color:var(--teal);border-bottom-color:var(--teal)}
.sitemap-links .code{font-family:monospace;font-size:11.5px;font-weight:700;color:var(--tx3);margin-inline-end:5px}
.sitemap-routes .arrow{color:var(--teal);margin:0 4px}
@media (max-width:480px){.sitemap-links{column-width:150px;column-gap:16px}}
</style>`;

// Alphabetical sort by localized label, honoring the language's locale so
// accented names collate correctly (e.g. "Ä" next to "A" in German).
function byLabel(locale) {
  return (a, b) => String(a.label).localeCompare(String(b.label), locale, { sensitivity: 'base' });
}

function linkListHtml(items, extraClass = '') {
  if (!items.length) return '';
  return `<ul class="sitemap-links${extraClass ? ' ' + extraClass : ''}">${items
    .map((i) => `<li>${i.prefix || ''}<a href="${i.href}">${escHtml(i.label)}</a></li>`)
    .join('')}</ul>`;
}

function sectionHtml(heading, sub, items, extraClass) {
  const list = linkListHtml(items, extraClass);
  if (!list) return '';
  const subHtml = sub ? `<p class="sitemap-section-sub">${escHtml(sub)}</p>` : '';
  return `<section class="sitemap-section"><h2>${escHtml(heading)}</h2>${subHtml}${list}</section>`;
}

// data: { countries, cities, airports, airlines, popularRoutes }
//   countries    – raw country rows ({ code, name, translations })
//   cities       – raw city rows ({ city_slug, name, translations, airport_codes })
//   airports     – [{ code, airport }] the airport code + its list row (may be null)
//   airlines     – raw airline rows ({ iata_code, name })
//   popularRoutes– route rows already sliced/sorted to the top N
function renderSitemapPage(data, lang) {
  const locale = getLanguage(lang).locale;
  const { countries = [], cities = [], airports = [], airlines = [], popularRoutes = [] } = data;

  const title = translate('sitemapPageTitle', lang);
  const description = translate('sitemapMetaDescription', lang);
  const urls = urlsFor('sitemap');
  const url = urls[lang];

  const breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span><span>${escHtml(translate('sitemapLabel', lang))}</span></nav>`;

  // ── Main / trust pages (same fixed static URLs every language shares) ──
  const mainPages = [
    { href: homeHref(lang), label: translate('homeLabel', lang) },
    { href: '/blog.html', label: translate('blogLabel', lang) },
    { href: '/about.html', label: translate('aboutLabel', lang) },
    { href: '/contact.html', label: translate('contactLabel', lang) },
    { href: '/how-it-works.html', label: translate('howItWorksLabel', lang) },
    { href: '/data-sources.html', label: translate('dataSourcesLabel', lang) },
    { href: '/methodology.html', label: translate('methodologyLabel', lang) },
    { href: '/editorial-policy.html', label: translate('editorialPolicyLabel', lang) },
    { href: '/transparency.html', label: translate('transparencyPageLabel', lang) },
    { href: '/privacy.html', label: translate('privacyLabel', lang) },
    { href: '/terms.html', label: translate('termsLabel', lang) },
  ];

  // ── Popular routes (already sorted/sliced by caller) ──
  const routeItems = popularRoutes.map((r) => {
    const o = localizeCity(r.origin_city, r.origin_iata, lang);
    const d = localizeCity(r.destination_city, r.destination_iata, lang);
    return {
      href: pathFor(lang, `flights/${encodeURIComponent(r.slug)}`),
      label: `${o} → ${d}`,
    };
  });

  // ── Countries (alpha) ──
  const countryItems = countries
    .filter((c) => c && c.code)
    .map((c) => ({ href: pathFor(lang, `country/${encodeURIComponent(c.code)}`), label: localizeCountry(c.name, c.code, lang) || c.code }))
    .sort(byLabel(locale));

  // ── Cities (alpha) ──
  const cityItems = cities
    .filter((c) => c && c.city_slug)
    .map((c) => ({
      href: pathFor(lang, `city/${encodeURIComponent(c.city_slug)}`),
      label: localizeCity(c.name, (c.airport_codes || [])[0], lang) || c.name || c.city_slug,
    }))
    .sort(byLabel(locale));

  // ── Airports (alpha by code) — code + its city, mirroring the airport hero ──
  const airportItems = airports
    .filter((a) => a && a.code)
    .map(({ code, airport }) => {
      const name = (airport && localizeAirport(airport, lang)) || (airport && localizeCity(airport.city, code, lang)) || '';
      return {
        href: pathFor(lang, `airport/${encodeURIComponent(code)}`),
        label: name || code,
        prefix: `<span class="code">${escHtml(code)}</span>`,
        sortKey: code,
      };
    })
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey), locale, { sensitivity: 'base' }));

  // ── Airlines (alpha) ──
  const airlineItems = airlines
    .filter((a) => a && a.iata_code)
    .map((a) => ({ href: pathFor(lang, `airline/${encodeURIComponent(a.iata_code)}`), label: a.name || a.iata_code }))
    .sort(byLabel(locale));

  const mainContent = `<main id="sitemap-main">
  <div id="sitemap-content">
${breadcrumbHtml}
<h1>${escHtml(translate('sitemapH1', lang))}</h1>
<p class="sitemap-intro">${escHtml(translate('sitemapIntro', lang))}</p>
${sectionHtml(translate('sitemapSectionMainPages', lang), '', mainPages)}
${sectionHtml(translate('sitemapSectionPopularRoutes', lang), '', routeItems, 'sitemap-routes')}
${sectionHtml(translate('sitemapSectionCountries', lang), '', countryItems)}
${sectionHtml(translate('sitemapSectionCities', lang), '', cityItems)}
${sectionHtml(translate('sitemapSectionAirports', lang), '', airportItems)}
${sectionHtml(translate('sitemapSectionAirlines', lang), '', airlineItems)}
  </div>
</main>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') },
      { '@type': 'ListItem', position: 2, name: translate('sitemapLabel', lang), item: url },
    ],
  };

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${SITEMAP_CSS}`;

  const html = renderShell({
    lang,
    title: `${title} | Airpiv`,
    description,
    canonicalUrl: url,
    urls,
    robotsContent: 'index, follow',
    headExtra,
    mainContent,
  });

  return { html, seo: { title: `${title} | Airpiv`, description, canonicalUrl: url, schema } };
}

module.exports = { renderSitemapPage };
