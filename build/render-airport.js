const { escHtml, renderShell, jsonLdScript } = require('./shell');
const { localizeCity } = require('./data');

const AIRPORT_CSS = `<style>
.airport-hero{background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:18px;padding:32px 24px;margin:24px 0;text-align:center}
.airport-hero-code{font-family:'Syne',sans-serif;font-size:2.2rem;font-weight:800;color:var(--teal);letter-spacing:.04em}
.airport-hero-city{color:#fff;font-size:1.1rem;font-weight:700;margin-top:4px}
.airport-hero-sub{color:rgba(255,255,255,.55);font-size:13px;margin-top:6px}
.airport-facts{display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap}
.airport-fact{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 14px;text-align:center}
.airport-fact-val{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:#fff}
.airport-fact-lbl{font-size:10.5px;color:rgba(255,255,255,.5);margin-top:2px}
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.airport-routes-section{margin-top:28px}
.airport-routes-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.airport-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.airport-route-card{display:block;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:13px 15px;font-size:13.5px;font-weight:600;color:var(--tx);text-decoration:none}
.airport-route-card:hover{border-color:var(--teal)}
.airport-route-card .arrow{color:var(--teal);margin:0 4px}
.airport-route-card .haul-tag{display:block;font-size:10.5px;color:var(--tx3);font-weight:500;margin-top:2px}
@media (max-width:480px){.airport-route-grid{grid-template-columns:1fr}}
</style>`;

function renderAirportPage(airport, routes, lang) {
  const de = lang !== 'en';
  const cityName = localizeCity(airport.city, airport.code, lang);
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(r.destination_city, r.destination_iata, lang),
  }));

  const hasLongHaul = locRoutes.some((r) => r.haul_type === 'long-haul');
  let title, description;
  if (locRoutes.length === 1) {
    title = de ? `Flughafen ${airport.code} — Direktflug ab ${cityName}` : `${airport.code} airport — direct flight from ${cityName}`;
    description = de
      ? `Der Flughafen ${airport.code} in ${cityName} bietet eine Direktverbindung. Preis vergleichen und buchen mit Airpiv.`
      : `${airport.code} airport in ${cityName} offers one direct connection. Compare the price and book with Airpiv.`;
  } else if (hasLongHaul) {
    title = de ? `Flughafen ${airport.code} (${cityName}) — Kurz- & Langstrecke` : `${airport.code} airport (${cityName}) — short & long-haul`;
    description = de
      ? `Vom Flughafen ${airport.code} in ${cityName} aus erreichst du sowohl europäische als auch interkontinentale Ziele. Alle Strecken im Vergleich.`
      : `From ${airport.code} airport in ${cityName} you can reach both European and intercontinental destinations. Compare all routes.`;
  } else {
    title = de ? `Flughafen ${airport.code} (${cityName}) — alle Strecken` : `${airport.code} airport (${cityName}) — all routes`;
    description = de
      ? `${locRoutes.length} Flugverbindungen ab und nach ${cityName} (${airport.code}). Vergleiche alle Strecken und Preise mit Airpiv.`
      : `${locRoutes.length} flight connections to and from ${cityName} (${airport.code}). Compare all routes and prices with Airpiv.`;
  }

  const deUrl = `https://airpiv.com/airport/${encodeURIComponent(airport.code)}`;
  const enUrl = `https://airpiv.com/en/airport/${encodeURIComponent(airport.code)}`;
  const url = de ? deUrl : enUrl;
  const introText = de
    ? `Der Flughafen ${airport.code} bedient ${cityName}. Hier findest du alle Flugrouten, die Airpiv für diesen Flughafen anbietet — vergleiche Preise und buche direkt.`
    : `${airport.code} airport serves ${cityName}. Here you'll find all the flight routes Airpiv offers for this airport — compare prices and book directly.`;

  const countryHrefBase = de ? '/country/' : '/en/country/';
  const cityHrefBase = de ? '/city/' : '/en/city/';
  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${de ? '/' : '/en/'}">${de ? 'Startseite' : 'Home'}</a><span>›</span>`;
  if (airport.country) breadcrumbHtml += `<a href="${countryHrefBase}${encodeURIComponent(airport.country)}">${escHtml(airport.country)}</a><span>›</span>`;
  if (airport.city_slug) breadcrumbHtml += `<a href="${cityHrefBase}${encodeURIComponent(airport.city_slug)}">${escHtml(cityName)}</a><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(airport.code)}</span></nav>`;

  const fromCount = locRoutes.filter((r) => r.origin_iata === airport.code).length;
  const toCount = locRoutes.filter((r) => r.destination_iata === airport.code).length;
  const factsHtml = `<div class="airport-facts">
    <div class="airport-fact"><div class="airport-fact-val">${locRoutes.length}</div><div class="airport-fact-lbl">${de ? 'Strecken' : 'Routes'}</div></div>
    <div class="airport-fact"><div class="airport-fact-val">${fromCount}</div><div class="airport-fact-lbl">${de ? 'Abflüge' : 'Departures'}</div></div>
    <div class="airport-fact"><div class="airport-fact-val">${toCount}</div><div class="airport-fact-lbl">${de ? 'Ankünfte' : 'Arrivals'}</div></div>
  </div>`;

  function haulLabel(r) {
    if (!r.haul_type) return '';
    if (de) return r.haul_type === 'long-haul' ? 'Langstrecke' : 'Kurzstrecke';
    return r.haul_type === 'long-haul' ? 'Long-haul' : 'Short-haul';
  }
  const flightsHrefBase = de ? '/flights/' : '/en/flights/';
  function routeCardHtml(r) {
    const hl = haulLabel(r);
    return `<a class="airport-route-card" href="${flightsHrefBase}${encodeURIComponent(r.slug)}">${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}${hl ? `<span class="haul-tag">${hl}</span>` : ''}</a>`;
  }

  const fromRoutes = locRoutes.filter((r) => r.origin_iata === airport.code);
  const toRoutes = locRoutes.filter((r) => r.destination_iata === airport.code);
  const fromSectionHtml = fromRoutes.length
    ? `<section class="airport-routes-section"><h2>${de ? 'Abflüge von' : 'Departures from'} ${escHtml(airport.code)}</h2><div class="airport-route-grid">${fromRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';
  const toSectionHtml = toRoutes.length
    ? `<section class="airport-routes-section"><h2>${de ? 'Ankünfte in' : 'Arrivals at'} ${escHtml(airport.code)}</h2><div class="airport-route-grid">${toRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  const mainContent = `<main id="airport-main">
  <div id="airport-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="airport-hero">
  <div class="airport-hero-code">${escHtml(airport.code)}</div>
  <div class="airport-hero-city">${escHtml(cityName)}</div>
  <div class="airport-hero-sub">${de ? 'Flughafen' : 'Airport'}</div>
  ${factsHtml}
</div>
<section><p>${escHtml(introText)}</p></section>
${fromSectionHtml}
${toSectionHtml}
  </div>
</main>`;

  const breadcrumbList = [{ '@type': 'ListItem', position: 1, name: de ? 'Startseite' : 'Home', item: de ? 'https://airpiv.com/' : 'https://airpiv.com/en/' }];
  let pos = 2;
  if (airport.country) breadcrumbList.push({ '@type': 'ListItem', position: pos++, name: airport.country, item: `${de ? 'https://airpiv.com/country/' : 'https://airpiv.com/en/country/'}${airport.country}` });
  if (airport.city_slug) breadcrumbList.push({ '@type': 'ListItem', position: pos++, name: cityName, item: `${de ? 'https://airpiv.com/city/' : 'https://airpiv.com/en/city/'}${airport.city_slug}` });
  breadcrumbList.push({ '@type': 'ListItem', position: pos, name: airport.code, item: url });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Airport',
    name: title,
    iataCode: airport.code,
    url,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbList },
  };

  const headExtra = `${jsonLdScript(schema)}\n${AIRPORT_CSS}`;

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

module.exports = { renderAirportPage };
