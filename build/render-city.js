const { escHtml, renderShell, jsonLdScript } = require('./shell');
const { localizeCity, getAlternativeAirports } = require('./data');

const CITY_CSS = `<style>
.city-hero{background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:18px;padding:32px 24px;margin:24px 0;text-align:center}
.city-hero-name{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:#fff}
.city-hero-sub{color:rgba(255,255,255,.55);font-size:13px;margin-top:6px}
.city-hero-airports{display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap}
.city-airport-badge{background:rgba(15,181,160,.15);border:1px solid rgba(15,181,160,.3);color:var(--teal);font-size:11px;font-weight:700;border-radius:6px;padding:3px 9px;font-family:monospace;text-decoration:none;cursor:pointer}
.city-airport-badge:hover{background:rgba(15,181,160,.25)}
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.city-routes-section{margin-top:28px}
.city-routes-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.city-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.city-route-card{display:block;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:13px 15px;font-size:13.5px;font-weight:600;color:var(--tx);text-decoration:none}
.city-route-card:hover{border-color:var(--teal)}
.city-route-card .arrow{color:var(--teal);margin:0 4px}
@media (max-width:480px){.city-route-grid{grid-template-columns:1fr}}
</style>`;

function renderCityPage(city, routes, lang) {
  const de = lang !== 'en';
  const cityName = localizeCity(city.name, city.airport_codes && city.airport_codes[0], lang);
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(r.destination_city, r.destination_iata, lang),
  }));

  const multiAirport = city.airport_codes && city.airport_codes.length > 1;
  let title, description;
  if (locRoutes.length === 1) {
    const r = locRoutes[0];
    const otherCity = r.origin_city_slug === city.city_slug ? r.destination_city : r.origin_city;
    title = de ? `Flug ${cityName} ↔ ${otherCity}` : `${otherCity} ↔ ${cityName} flights`;
    description = de
      ? `Direktverbindung zwischen ${cityName} und ${otherCity}: Preise vergleichen und günstig buchen mit Airpiv.`
      : `Direct connection between ${cityName} and ${otherCity}: compare prices and book cheap flights with Airpiv.`;
  } else if (multiAirport) {
    title = de ? `Flüge nach ${cityName} — alle Flughäfen im Vergleich` : `Flights to ${cityName} — all airports compared`;
    description = de
      ? `${cityName} wird von ${city.airport_codes.length} Flughäfen bedient (${city.airport_codes.join(', ')}). Vergleiche alle Strecken mit Airpiv.`
      : `${cityName} is served by ${city.airport_codes.length} airports (${city.airport_codes.join(', ')}). Compare all routes with Airpiv.`;
  } else if (locRoutes.length <= 4) {
    title = de ? `${cityName} Flüge — ${locRoutes.length} Strecken im Vergleich` : `${cityName} flights — ${locRoutes.length} routes compared`;
    description = de
      ? `${locRoutes.length} Flugverbindungen von und nach ${cityName} im direkten Vergleich. Finde die günstigste Strecke mit Airpiv.`
      : `${locRoutes.length} flight connections to and from ${cityName}, compared side by side. Find the cheapest route with Airpiv.`;
  } else {
    title = de ? `Günstige Flüge nach ${cityName} — alle Strecken` : `Cheap flights to ${cityName} — all routes`;
    description = de
      ? `Über ${locRoutes.length} Flugverbindungen nach ${cityName}. Vergleiche alle Reiseziele und Airlines in Echtzeit mit Airpiv.`
      : `Over ${locRoutes.length} flight connections to ${cityName}. Compare all destinations and airlines in real time with Airpiv.`;
  }

  const deUrl = `https://airpiv.com/city/${encodeURIComponent(city.city_slug)}`;
  const enUrl = `https://airpiv.com/en/city/${encodeURIComponent(city.city_slug)}`;
  const url = de ? deUrl : enUrl;
  const introText = de
    ? (city.intro_text || `Entdecke alle Flugverbindungen von und nach ${cityName}. Airpiv vergleicht in Echtzeit hunderte Airlines und findet den besten Preis für deine Reise.`)
    : `Discover all flight connections to and from ${cityName}. Airpiv compares hundreds of airlines in real time to find the best price for your trip.`;

  const countryHref = de ? `/country/${encodeURIComponent(city.country_code)}` : `/en/country/${encodeURIComponent(city.country_code)}`;
  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${de ? '/' : '/en/'}">${de ? 'Startseite' : 'Home'}</a><span>›</span>`;
  if (city.country_code) breadcrumbHtml += `<a href="${countryHref}">${escHtml(city.country_code)}</a><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(cityName)}</span></nav>`;

  const airportHrefBase = de ? '/airport/' : '/en/airport/';
  const airportsHtml = (city.airport_codes && city.airport_codes.length)
    ? `<div class="city-hero-airports">${city.airport_codes.map((a) => `<a href="${airportHrefBase}${encodeURIComponent(a)}" class="city-airport-badge">${escHtml(a)}</a>`).join('')}</div>`
    : '';

  const fromRoutes = locRoutes.filter((r) => r.origin_city_slug === city.city_slug);
  const toRoutes = locRoutes.filter((r) => r.destination_city_slug === city.city_slug);
  const flightsHrefBase = de ? '/flights/' : '/en/flights/';
  function routeCardHtml(r) {
    return `<a class="city-route-card" href="${flightsHrefBase}${encodeURIComponent(r.slug)}">${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}</a>`;
  }
  const fromSectionHtml = fromRoutes.length
    ? `<section class="city-routes-section"><h2>${de ? 'Flüge ab' : 'Flights from'} ${escHtml(cityName)}</h2><div class="city-route-grid">${fromRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';
  const toSectionHtml = toRoutes.length
    ? `<section class="city-routes-section"><h2>${de ? 'Flüge nach' : 'Flights to'} ${escHtml(cityName)}</h2><div class="city-route-grid">${toRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  const routesWord = locRoutes.length === 1 ? (de ? 'Flugroute' : 'route') : (de ? 'Flugrouten' : 'routes');
  const mainContent = `<main id="city-main">
  <div id="city-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="city-hero">
  <div class="city-hero-name">✈ ${escHtml(cityName)}</div>
  <div class="city-hero-sub">${locRoutes.length} ${de ? 'verfügbare' : 'available'} ${routesWord}</div>
  ${airportsHtml}
</div>
<section><p>${escHtml(introText)}</p></section>
${fromSectionHtml}
${toSectionHtml}
  </div>
</main>`;

  const breadcrumbList = [{ '@type': 'ListItem', position: 1, name: de ? 'Startseite' : 'Home', item: de ? 'https://airpiv.com/' : 'https://airpiv.com/en/' }];
  if (city.country_code) breadcrumbList.push({ '@type': 'ListItem', position: 2, name: city.country_code, item: (de ? 'https://airpiv.com/country/' : 'https://airpiv.com/en/country/') + city.country_code });
  breadcrumbList.push({ '@type': 'ListItem', position: breadcrumbList.length + 1, name: cityName, item: url });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbList },
  };
  if (!de) schema.inLanguage = 'en';

  const headExtra = `${jsonLdScript(schema)}\n${CITY_CSS}`;

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

module.exports = { renderCityPage };
