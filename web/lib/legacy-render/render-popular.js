const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');

// [POPULAR-DESTINATIONS] A curated category/hub page (Priority 1 "Popular
// Destinations" + Priority 9 "Popular Pages / Category Pages"). Unlike the flat
// HTML sitemap, this is a ranked, content-bearing landing page that targets
// head-term destination queries and funnels internal-link equity to the best
// city and route pages.
//
// HONESTY: both rankings use real persisted data only —
//   • destinations are ranked by the real number of tracked routes arriving at
//     the city (connectivity), never an invented "popularity" figure;
//   • routes are ranked by their real observed `airline_count` (how many
//     carriers serve them — the most-served routes), because `route_score` is
//     not populated yet. No fabricated scores, ratings or traveller counts.

const POPULAR_CSS = `<style>
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.popular-intro{font-size:14px;color:var(--tx2);line-height:1.6;margin:0 0 8px}
.popular-section{margin-top:30px}
.popular-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:14px}
.popular-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.popular-card{display:flex;flex-direction:column;gap:4px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;text-decoration:none}
.popular-card:hover{border-color:var(--teal)}
.popular-card-name{font-size:14.5px;font-weight:700;color:var(--tx);line-height:1.3}
.popular-card-name .arrow{color:var(--teal);margin:0 5px}
.popular-card-stat{font-size:12px;color:var(--tx3);font-weight:600}
.popular-card-stat .num{color:var(--teal)}
@media (max-width:480px){.popular-grid{grid-template-columns:1fr 1fr}}
</style>`;

// data: { destinations, topRoutes }
//   destinations – [{ slug, iata, rawName, routeCount }] pre-ranked, pre-sliced
//   topRoutes    – raw route rows (with airline_count) pre-ranked, pre-sliced
function renderPopularPage(data, lang) {
  const locale = getLanguage(lang).locale;
  const { destinations = [], topRoutes = [] } = data;
  const nf = (n) => Number(n).toLocaleString(locale);

  const title = translate('popularPageTitle', lang);
  const description = translate('popularMetaDescription', lang);
  const urls = urlsFor('popular');
  const url = urls[lang];

  const breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span><span>${escHtml(translate('popularLabel', lang))}</span></nav>`;

  // ── Destination cards (cities ranked by arriving-route count) ──
  const routesUnit = translate('popularStatRoutes', lang);
  const destCards = destinations.map((d) => {
    const name = localizeCity(d.rawName, d.iata, lang) || d.rawName || d.slug;
    return `<a class="popular-card" href="${pathFor(lang, `city/${encodeURIComponent(d.slug)}`)}">`
      + `<span class="popular-card-name">${escHtml(name)}</span>`
      + `<span class="popular-card-stat"><span class="num">${nf(d.routeCount)}</span> ${escHtml(routesUnit)}</span></a>`;
  }).join('');
  const destSection = destCards
    ? `<section class="popular-section"><h2>${escHtml(translate('popularSectionDestinations', lang))}</h2><div class="popular-grid">${destCards}</div></section>`
    : '';

  // ── Most-served route cards (ranked by real airline_count) ──
  const airlinesUnit = translate('popularStatAirlines', lang);
  const routeCards = topRoutes.map((r) => {
    const o = localizeCity(r.origin_city, r.origin_iata, lang);
    const d = localizeCity(r.destination_city, r.destination_iata, lang);
    return `<a class="popular-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">`
      + `<span class="popular-card-name">${escHtml(o)}<span class="arrow">→</span>${escHtml(d)}</span>`
      + `<span class="popular-card-stat"><span class="num">${nf(r.airline_count)}</span> ${escHtml(airlinesUnit)}</span></a>`;
  }).join('');
  const routeSection = routeCards
    ? `<section class="popular-section"><h2>${escHtml(translate('popularSectionRoutes', lang))}</h2><div class="popular-grid">${routeCards}</div></section>`
    : '';

  const mainContent = `<main id="popular-main">
  <div id="popular-content">
${breadcrumbHtml}
<h1>${escHtml(translate('popularH1', lang))}</h1>
<p class="popular-intro">${escHtml(translate('popularIntro', lang))}</p>
${destSection}
${routeSection}
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
      { '@type': 'ListItem', position: 2, name: translate('popularLabel', lang), item: url },
    ],
  };

  const destItemList = destinations.length
    ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: translate('popularSectionDestinations', lang),
      numberOfItems: destinations.length,
      itemListElement: destinations.map((d, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: localizeCity(d.rawName, d.iata, lang) || d.rawName || d.slug,
        url: urlFor(lang, `city/${encodeURIComponent(d.slug)}`),
      })),
    }
    : null;
  const routeItemList = topRoutes.length
    ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: translate('popularSectionRoutes', lang),
      numberOfItems: topRoutes.length,
      itemListElement: topRoutes.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${localizeCity(r.origin_city, r.origin_iata, lang)} → ${localizeCity(r.destination_city, r.destination_iata, lang)}`,
        url: urlFor(lang, `flights/${encodeURIComponent(r.slug)}`),
      })),
    }
    : null;

  const extraSchema = [destItemList, routeItemList].filter(Boolean).map((s) => jsonLdScript(s)).join('\n');
  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}${extraSchema ? '\n' + extraSchema : ''}\n${POPULAR_CSS}`;

  // Only worth indexing once there's something real to rank; an empty page
  // (no route data at all) is thin. Always `follow`.
  const robotsContent = (destinations.length || topRoutes.length) ? 'index, follow' : 'noindex, follow';

  const html = renderShell({
    lang,
    title: `${title} | Airpiv`,
    description,
    canonicalUrl: url,
    urls,
    robotsContent,
    headExtra,
    mainContent,
  });

  return { html, seo: { title: `${title} | Airpiv`, description, canonicalUrl: url, schema } };
}

module.exports = { renderPopularPage };
