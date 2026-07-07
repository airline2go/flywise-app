const { escHtml, renderShell, jsonLdScript } = require('./shell');
const { localizeCity, localizeCountry } = require('./data');

const COUNTRY_CSS = `<style>
.country-hero{background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:18px;padding:32px 24px;margin:24px 0;text-align:center}
.country-hero-name{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:#fff}
.country-hero-sub{color:rgba(255,255,255,.55);font-size:13px;margin-top:6px}
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.country-routes-section{margin-top:28px}
.country-routes-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.country-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.country-route-card{display:block;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:13px 15px;font-size:13.5px;font-weight:600;color:var(--tx);text-decoration:none}
.country-route-card:hover{border-color:var(--teal)}
.country-route-card .arrow{color:var(--teal);margin:0 4px}
@media (max-width:480px){.country-route-grid{grid-template-columns:1fr}}
</style>`;

function renderCountryPage(country, routes, lang) {
  const de = lang !== 'en';
  const countryName = localizeCountry(country.name, country.code, lang);
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(r.destination_city, r.destination_iata, lang),
  }));

  let title, description;
  if (locRoutes.length === 1) {
    const r = locRoutes[0];
    const otherCity = r.origin_country === country.code ? r.destination_city : r.origin_city;
    title = de ? `Flug nach ${countryName} — ${otherCity} ↔ ${countryName}` : `Flights to ${countryName} — ${otherCity} ↔ ${countryName}`;
    description = de
      ? `Direktverbindung zwischen ${otherCity} und ${countryName}: Preise vergleichen und günstig buchen mit Airpiv.`
      : `Direct connection between ${otherCity} and ${countryName}: compare prices and book cheap flights with Airpiv.`;
  } else if (locRoutes.length <= 4) {
    title = de ? `${countryName} Flüge — ${locRoutes.length} Strecken im Vergleich` : `${countryName} flights — ${locRoutes.length} routes compared`;
    description = de
      ? `${locRoutes.length} Flugverbindungen von und nach ${countryName} im direkten Vergleich. Finde die günstigste Strecke mit Airpiv.`
      : `${locRoutes.length} flight connections to and from ${countryName}, compared side by side. Find the cheapest route with Airpiv.`;
  } else {
    title = de ? `Günstige Flüge nach ${countryName} — alle Reiseziele` : `Cheap flights to ${countryName} — all destinations`;
    description = de
      ? `Über ${locRoutes.length} Flugverbindungen nach ${countryName}. Vergleiche alle Reiseziele und Airlines in Echtzeit mit Airpiv.`
      : `Over ${locRoutes.length} flight connections to ${countryName}. Compare all destinations and airlines in real time with Airpiv.`;
  }

  const deUrl = `https://airpiv.com/country/${encodeURIComponent(country.code)}`;
  const enUrl = `https://airpiv.com/en/country/${encodeURIComponent(country.code)}`;
  const url = de ? deUrl : enUrl;
  const introText = de
    ? (country.intro_text || `Entdecke alle Flugverbindungen von und nach ${countryName}. Airpiv vergleicht in Echtzeit hunderte Airlines und findet den besten Preis für deine Reise.`)
    : `Discover all flight connections to and from ${countryName}. Airpiv compares hundreds of airlines in real time to find the best price for your trip.`;

  const breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${de ? '/' : '/en/'}">${de ? 'Startseite' : 'Home'}</a><span>›</span><span>${escHtml(countryName)}</span></nav>`;

  const fromRoutes = locRoutes.filter((r) => r.origin_country === country.code);
  const toRoutes = locRoutes.filter((r) => r.destination_country === country.code);
  const flightsHrefBase = de ? '/flights/' : '/en/flights/';
  function routeCardHtml(r) {
    return `<a class="country-route-card" href="${flightsHrefBase}${encodeURIComponent(r.slug)}">${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}</a>`;
  }
  const fromSectionHtml = fromRoutes.length
    ? `<section class="country-routes-section"><h2>${de ? 'Flüge ab' : 'Flights from'} ${escHtml(countryName)}</h2><div class="country-route-grid">${fromRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';
  const toSectionHtml = toRoutes.length
    ? `<section class="country-routes-section"><h2>${de ? 'Flüge nach' : 'Flights to'} ${escHtml(countryName)}</h2><div class="country-route-grid">${toRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  const routesWord = locRoutes.length === 1 ? (de ? 'Flugroute' : 'route') : (de ? 'Flugrouten' : 'routes');
  const mainContent = `<main id="country-main">
  <div id="country-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="country-hero">
  <div class="country-hero-name">✈ ${escHtml(countryName)}</div>
  <div class="country-hero-sub">${locRoutes.length} ${de ? 'verfügbare' : 'available'} ${routesWord}</div>
</div>
<section><p>${escHtml(introText)}</p></section>
${fromSectionHtml}
${toSectionHtml}
  </div>
</main>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: de ? 'Startseite' : 'Home', item: de ? 'https://airpiv.com/' : 'https://airpiv.com/en/' },
        { '@type': 'ListItem', position: 2, name: countryName, item: url },
      ],
    },
  };
  if (!de) schema.inLanguage = 'en';

  const headExtra = `${jsonLdScript(schema)}\n${COUNTRY_CSS}`;

  const html = renderShell({
    lang: de ? 'de' : 'en',
    title: `${title} | Airpiv`,
    description,
    canonicalUrl: url,
    deUrl, enUrl,
    headExtra,
    mainContent,
  });

  return { html, seo: { title: `${title} | Airpiv`, description, canonicalUrl: url, schema } };
}

module.exports = { renderCountryPage };
