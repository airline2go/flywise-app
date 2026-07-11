const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');

const AIRLINE_CSS = `<style>
.airline-hero{background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:18px;padding:32px 24px;margin:24px 0;text-align:center}
.airline-hero-name{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:#fff}
.airline-hero-code{color:var(--teal);font-size:13px;font-weight:700;letter-spacing:.04em;margin-top:4px;font-family:monospace}
.airline-hero-sub{color:rgba(255,255,255,.55);font-size:13px;margin-top:6px}
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.airline-routes-section{margin-top:28px}
.airline-routes-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.airline-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.airline-route-card{display:block;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:13px 15px;font-size:13.5px;font-weight:600;color:var(--tx);text-decoration:none}
.airline-route-card:hover{border-color:var(--teal)}
.airline-route-card .arrow{color:var(--teal);margin:0 4px}
.airline-hub-badge{display:inline-flex;align-items:center;gap:5px;margin-top:10px;background:rgba(15,181,160,.15);border:1px solid rgba(15,181,160,.3);color:var(--teal);font-size:12px;font-weight:700;border-radius:8px;padding:5px 12px;text-decoration:none}
@media (max-width:480px){.airline-route-grid{grid-template-columns:1fr}}
</style>`;

// [AIRLINE-PAGES] Modeled directly on render-airport.js — same
// single-vs-many title/description branching, same breadcrumb/schema
// shape, same intro-template pattern. `routes` is the set of published
// route_pages rows this airline has been observed operating (via the
// route_airlines join table — see content.routes.js's GET /airlines/:code).
// [ROUTE-INTELLIGENCE-3] `mostUsedRoutes` (a recency-ranked subset of
// `routes`) and `airline.hubAirport` (admin-set or inferred) are new,
// optional — both simply don't render when absent, e.g. for an airline
// observed on too few routes for either to be meaningful.
function renderAirlinePage(airline, routes, lang, mostUsedRoutes) {
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(r.destination_city, r.destination_iata, lang),
  }));

  let title, description;
  if (locRoutes.length === 1) {
    const r = locRoutes[0];
    title = format(translate('airlineSingleRouteTitleTemplate', lang), { airline: airline.name, otherCity: r.origin_city, otherCity2: r.destination_city });
    description = format(translate('airlineSingleRouteDescriptionTemplate', lang), { airline: airline.name, otherCity: r.origin_city, otherCity2: r.destination_city });
  } else {
    title = format(translate('airlineManyRoutesTitleTemplate', lang), { airline: airline.name, count: locRoutes.length });
    description = format(translate('airlineManyRoutesDescriptionTemplate', lang), { airline: airline.name, count: locRoutes.length });
  }

  const urls = urlsFor(`airline/${encodeURIComponent(airline.iata_code)}`);
  const url = urls[lang];
  const introText = airline.intro_text || format(translate('airlineIntroTemplate', lang), { airline: airline.name });

  const breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span><span>${escHtml(airline.name)}</span></nav>`;

  const hubAirportHtml = airline.hubAirport
    ? `<a class="airline-hub-badge" href="${pathFor(lang, `airport/${encodeURIComponent(airline.hubAirport)}`)}">✈ ${translate('airlineHubLabel', lang)}: ${escHtml(airline.hubAirport)}</a>`
    : '';

  function routeCardHtml(r) {
    return `<a class="airline-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}</a>`;
  }

  // Only worth a separate "most flown" highlight when it's a genuine
  // curated subset of a longer full list — for a small airline the two
  // would just be the same handful of routes shown twice.
  const locMostUsed = (mostUsedRoutes || []).map((r) => Object.assign({}, r, {
    origin_city: localizeCity(r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(r.destination_city, r.destination_iata, lang),
  }));
  const mostUsedSectionHtml = (locMostUsed.length && locRoutes.length > locMostUsed.length)
    ? `<section class="airline-routes-section"><h2>${translate('airlineMostFlownRoutesLabel', lang)}</h2><div class="airline-route-grid">${locMostUsed.map(routeCardHtml).join('')}</div></section>`
    : '';

  const routesSectionHtml = locRoutes.length
    ? `<section class="airline-routes-section"><h2>${translate('routesLabel', lang)}</h2><div class="airline-route-grid">${locRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  const mainContent = `<main id="airline-main">
  <div id="airline-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="airline-hero">
  <div class="airline-hero-name">${escHtml(airline.name)}</div>
  <div class="airline-hero-code">${escHtml(airline.iata_code)}</div>
  <div class="airline-hero-sub">${translate('airlineWord', lang)}</div>
  ${hubAirportHtml}
</div>
<section><p>${escHtml(introText)}</p></section>
${mostUsedSectionHtml}
${routesSectionHtml}
  </div>
</main>`;

  const breadcrumbList = [
    { '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') },
    { '@type': 'ListItem', position: 2, name: airline.name, item: url },
  ];

  // [AIRLINE-SCHEMA] schema.org Airline — a genuine subtype of
  // Organization (better fit than a generic WebPage/Organization).
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Airline',
    name: airline.name,
    iataCode: airline.iata_code,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };

  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbList };

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${AIRLINE_CSS}`;

  // [THIN-CONTENT-NOINDEX] Same rule as city/country pages.
  const robotsContent = (locRoutes.length <= 1 && !airline.intro_text) ? 'noindex, follow' : 'index, follow';

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

module.exports = { renderAirlinePage };
