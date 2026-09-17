import { listRoutePages, listCities } from '../content-api.js';
import shellMod from './shell.js';
import languagesMod from './languages.js';

const { renderShell, jsonLdScript } = shellMod;
const { urlFor } = languagesMod;

const COPY = {
  de: {
    title: 'Flugdaten & Strecken-Index',
    description: 'Transparenter Airpiv-Index zu Flugstrecken, Streckenabdeckung und Konnektivität auf Basis des aktuellen Routenkatalogs.',
    h1: 'Flugdaten & Strecken-Index',
    intro: 'Dieser öffentliche Datenindex zeigt die aktuelle Struktur des Airpiv-Flugstreckenkatalogs. Die Kennzahlen werden aus den tatsächlich gespeicherten Streckendaten berechnet und transparent erklärt.',
    snapshot: 'Aktueller Katalog-Snapshot',
    routes: 'Strecken-Datensätze',
    routePairs: 'Eindeutige Flughafenpaare',
    airports: 'Beteiligte Flughäfen',
    origins: 'Abflugflughäfen',
    destinations: 'Zielflughäfen',
    topDestinations: 'Am stärksten angebundene Ziele',
    topRoutes: 'Strecken mit den meisten erfassten Airlines',
    destinationNote: 'Sortiert nach der Anzahl der erfassten Strecken, die an diesem Flughafen ankommen. Das ist ein Konnektivitätssignal, keine Nachfrageprognose.',
    routeNote: 'Sortiert nach der Anzahl der Airlines, die im Routenkatalog für die Strecke erfasst sind.',
    methodology: 'Methodik',
    methodologyText: 'Die Seite verwendet nur vorhandene Katalogdaten. „Strecken-Datensätze“ zählt veröffentlichte Route-Records im Katalog. „Eindeutige Flughafenpaare“ dedupliziert die Richtung Origin → Destination. Die Airline-Anzahl stammt aus dem jeweiligen Route-Record. Es werden keine Rankings, Bewertungen oder Suchvolumina erfunden.',
    source: 'Datenquelle & Transparenz',
    sourceText: 'Weitere Hinweise zur Herkunft und Aktualität der Flugdaten findest du in den Airpiv-Seiten zu Datenquellen, Methodik und Transparenz.',
    readMore: 'Mehr erfahren',
    generated: 'Seite generiert',
    route: 'Strecke',
    airlines: 'Airlines',
    records: 'Datensätze',
    city: 'Ziel',
  },
  en: {
    title: 'Flight Data & Route Index',
    description: 'A transparent Airpiv index of flight routes, route coverage and connectivity based on the current route catalogue.',
    h1: 'Flight Data & Route Index',
    intro: 'This public data index shows the current structure of the Airpiv flight-route catalogue. Metrics are calculated from stored route data and the methodology is documented below.',
    snapshot: 'Current catalogue snapshot',
    routes: 'Route records',
    routePairs: 'Unique airport pairs',
    airports: 'Airports represented',
    origins: 'Origin airports',
    destinations: 'Destination airports',
    topDestinations: 'Most connected destinations',
    topRoutes: 'Routes with the most recorded airlines',
    destinationNote: 'Ranked by the number of recorded routes arriving at the destination. This is a connectivity signal, not a demand forecast.',
    routeNote: 'Ranked by the number of airlines recorded for each route in the catalogue.',
    methodology: 'Methodology',
    methodologyText: 'This page uses catalogue data only. “Route records” counts published route records in the catalogue. “Unique airport pairs” deduplicates the directional Origin → Destination pair. Airline counts come from the route record. No search volume, popularity score or traveller rating is invented.',
    source: 'Data source & transparency',
    sourceText: 'See Airpiv’s data sources, methodology and transparency pages for additional information about how route data is sourced and maintained.',
    readMore: 'Read more',
    generated: 'Page generated',
    route: 'Route',
    airlines: 'Airlines',
    records: 'records',
    city: 'Destination',
  },
};

const CSS = `<style>
.authority-wrap{max-width:1080px;margin:0 auto}
.authority-breadcrumb{display:flex;gap:7px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px}
.authority-breadcrumb a{color:var(--teal);text-decoration:none}
.authority-breadcrumb a:hover{text-decoration:underline}
.authority-intro{max-width:820px;color:var(--tx2);line-height:1.7;margin:0 0 22px}
.authority-snapshot{font-size:12px;color:var(--tx3);margin-top:-10px;margin-bottom:18px}
.authority-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:22px 0 30px}
.authority-kpi{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 15px}
.authority-kpi .num{font-size:22px;font-weight:800;color:var(--teal);line-height:1.1}
.authority-kpi .label{font-size:12px;color:var(--tx3);margin-top:6px;line-height:1.35}
.authority-section{margin-top:30px}
.authority-section h2{font-family:'Syne',sans-serif;font-size:1.25rem;color:var(--tx);margin:0 0 9px}
.authority-note{font-size:13px;color:var(--tx2);line-height:1.6;margin:0 0 14px}
.authority-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.authority-list{margin:0;padding:0;list-style:none}
.authority-list li{display:flex;justify-content:space-between;gap:16px;padding:11px 13px;border:1px solid var(--bd);background:var(--bg2);border-radius:10px;margin-bottom:8px}
.authority-list a{color:var(--tx);font-weight:700;text-decoration:none}
.authority-list a:hover{text-decoration:underline}
.authority-stat{white-space:nowrap;font-size:12px;font-weight:700;color:var(--tx3)}
.authority-stat strong{color:var(--teal)}
.authority-method{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px;line-height:1.7;color:var(--tx2);font-size:13px}
.authority-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.authority-links a{display:inline-flex;padding:9px 12px;border-radius:9px;border:1px solid var(--bd);text-decoration:none;color:var(--teal);font-size:12.5px;font-weight:700}
.authority-links a:hover{border-color:var(--teal)}
@media (max-width:840px){.authority-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.authority-grid{grid-template-columns:1fr}}
@media (max-width:480px){.authority-kpis{grid-template-columns:1fr 1fr}.authority-kpi .num{font-size:19px}.authority-list li{padding:10px 11px;gap:10px}}
</style>`;

const nf = (n, lang) => Number(n || 0).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB');

function cleanName(value, fallback) {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim();
}

function computeData(routes, cities) {
  const routeRows = Array.isArray(routes) ? routes.filter(Boolean) : [];
  const cityRows = Array.isArray(cities) ? cities.filter(Boolean) : [];
  const cityByAirport = new Map();
  for (const city of cityRows) {
    const name = cleanName(city.name, city.city_slug);
    for (const code of city.airport_codes || []) {
      if (code && !cityByAirport.has(code)) cityByAirport.set(code, name);
    }
  }

  const airports = new Set();
  const origins = new Set();
  const destinations = new Set();
  const pairs = new Set();
  const destinationCounts = new Map();

  for (const r of routeRows) {
    const o = String(r.origin_iata || '').trim().toUpperCase();
    const d = String(r.destination_iata || '').trim().toUpperCase();
    if (o) { airports.add(o); origins.add(o); }
    if (d) { airports.add(d); destinations.add(d); destinationCounts.set(d, (destinationCounts.get(d) || 0) + 1); }
    if (o && d) pairs.add(`${o}>${d}`);
  }

  const topDestinations = [...destinationCounts.entries()]
    .map(([iata, count]) => ({ iata, count, name: cityByAirport.get(iata) || iata }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 20);

  const topRoutes = routeRows
    .filter((r) => Number(r.airline_count) > 0 && r.origin_iata && r.destination_iata && r.slug)
    .map((r) => ({
      slug: r.slug,
      origin: cleanName(r.origin_city, r.origin_iata),
      destination: cleanName(r.destination_city, r.destination_iata),
      originIata: String(r.origin_iata).toUpperCase(),
      destinationIata: String(r.destination_iata).toUpperCase(),
      airlineCount: Number(r.airline_count),
    }))
    .sort((a, b) => b.airlineCount - a.airlineCount || a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination))
    .slice(0, 20);

  return {
    routeCount: routeRows.length,
    pairCount: pairs.size,
    airportCount: airports.size,
    originCount: origins.size,
    destinationCount: destinations.size,
    topDestinations,
    topRoutes,
  };
}

export async function renderAuthorityHtml(lang = 'de') {
  const activeLang = lang === 'en' ? 'en' : 'de';
  const copy = COPY[activeLang];
  const [routes, cities] = await Promise.all([listRoutePages(), listCities()]);
  const data = computeData(routes, cities);
  const canonical = urlFor(activeLang, 'research/flight-data');
  const germanUrl = urlFor('de', 'research/flight-data');
  const englishUrl = urlFor('en', 'research/flight-data');
  const generatedAt = new Date().toISOString().slice(0, 10);

  const breadcrumb = `<nav class="authority-breadcrumb" aria-label="Breadcrumb"><a href="${activeLang === 'de' ? '/' : '/en/'}">Airpiv</a><span>›</span><span>${copy.h1}</span></nav>`;
  const destinationRows = data.topDestinations.map((item, i) => {
    const citySlug = cityRowsToSlug(cities, item.iata);
    const href = citySlug ? urlFor(activeLang, `city/${encodeURIComponent(citySlug)}`) : null;
    const name = `${item.name} (${item.iata})`;
    return `<li><span>${i + 1}. ${href ? `<a href="${href}">${escapeHtml(name)}</a>` : escapeHtml(name)}</span><span class="authority-stat"><strong>${nf(item.count, activeLang)}</strong> ${copy.records}</span></li>`;
  }).join('');

  const routeRows = data.topRoutes.map((item, i) => `<li><span>${i + 1}. <a href="${urlFor(activeLang, `flights/${encodeURIComponent(item.slug)}`)}">${escapeHtml(item.origin)} → ${escapeHtml(item.destination)}</a> <span class="authority-stat">(${escapeHtml(item.originIata)}→${escapeHtml(item.destinationIata)})</span></span><span class="authority-stat"><strong>${nf(item.airlineCount, activeLang)}</strong> ${copy.airlines}</span></li>`).join('');

  const stats = [
    [data.routeCount, copy.routes],
    [data.pairCount, copy.routePairs],
    [data.airportCount, copy.airports],
    [data.originCount, copy.origins],
    [data.destinationCount, copy.destinations],
  ].map(([value, label]) => `<div class="authority-kpi"><div class="num">${nf(value, activeLang)}</div><div class="label">${label}</div></div>`).join('');

  const mainContent = `<main id="authority-main"><div class="authority-wrap">${breadcrumb}<h1>${copy.h1}</h1><p class="authority-intro">${copy.intro}</p><div class="authority-snapshot">${copy.snapshot} · ${copy.generated}: ${generatedAt}</div><div class="authority-kpis">${stats}</div><div class="authority-grid"><section class="authority-section"><h2>${copy.topDestinations}</h2><p class="authority-note">${copy.destinationNote}</p><ol class="authority-list">${destinationRows}</ol></section><section class="authority-section"><h2>${copy.topRoutes}</h2><p class="authority-note">${copy.routeNote}</p><ol class="authority-list">${routeRows}</ol></section></div><section class="authority-section"><h2>${copy.methodology}</h2><div class="authority-method">${copy.methodologyText}</div></section><section class="authority-section"><h2>${copy.source}</h2><div class="authority-method">${copy.sourceText}<div class="authority-links"><a href="${activeLang === 'de' ? '/data-sources.html' : '/en/data-sources.html'}">${copy.readMore}: Data Sources</a><a href="${activeLang === 'de' ? '/methodology.html' : '/en/methodology.html'}">${copy.readMore}: Methodology</a><a href="${activeLang === 'de' ? '/transparency.html' : '/en/transparency.html'}">${copy.readMore}: Transparency</a></div></div></section></div></main>`;

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: copy.title,
    description: copy.description,
    url: canonical,
    inLanguage: activeLang === 'de' ? 'de-DE' : 'en-GB',
    dateModified: generatedAt,
    creator: { '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com', logo: 'https://airpiv.com/apple-touch-icon.png' },
    publisher: { '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com', logo: 'https://airpiv.com/apple-touch-icon.png' },
    variableMeasured: [
      'Published route records',
      'Unique directional airport pairs',
      'Origin airports',
      'Destination airports',
      'Recorded airlines per route',
    ],
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.title,
    description: copy.description,
    url: canonical,
    inLanguage: activeLang === 'de' ? 'de-DE' : 'en-GB',
    isPartOf: { '@type': 'WebSite', name: 'Airpiv', url: 'https://airpiv.com' },
  };

  const urls = { de: germanUrl, en: englishUrl };
  const headExtra = `${jsonLdScript(pageSchema)}${jsonLdScript(datasetSchema)}${CSS}`;

  return renderShell({
    lang: activeLang,
    title: `${copy.title} | Airpiv`,
    description: copy.description,
    canonicalUrl: canonical,
    urls,
    headExtra,
    mainContent,
    robotsContent: data.routeCount > 0 ? 'index, follow' : 'noindex, follow',
  });
}

function cityRowsToSlug(cities, iata) {
  const hit = (cities || []).find((city) => Array.isArray(city.airport_codes) && city.airport_codes.includes(iata));
  return hit?.city_slug || null;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
