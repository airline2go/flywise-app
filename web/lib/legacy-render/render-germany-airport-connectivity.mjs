import { listRoutePages } from '../content-api.js';
import shellMod from './shell.js';
import languagesMod from './languages.js';

const { renderShell, jsonLdScript } = shellMod;
const { urlFor } = languagesMod;

const COPY = {
  de: {
    title: 'Deutschland: Flughafen-Konnektivität & internationale Strecken',
    description: 'Öffentlicher Airpiv-Datenindex zur veröffentlichten Streckenabdeckung deutscher Abflughäfen, ihrer Ziele und internationalen Länderverbindungen.',
    h1: 'Deutschland: Flughafen-Konnektivität & internationale Strecken',
    intro: 'Dieser Datenindex betrachtet ausschließlich veröffentlichte Airpiv-Routen mit deutschem Abflugsland. Er zeigt, welche deutschen Abflughäfen im aktuellen Katalog vertreten sind, wie viele unterschiedliche Ziele erfasst werden und welche internationalen Verbindungen besonders häufig als Route-Records vorkommen.',
    snapshot: 'Aktueller Katalog-Snapshot',
    generated: 'Seite generiert',
    routeRecords: 'Deutschland-Abflüge',
    originAirports: 'Deutsche Abflughäfen',
    destinationAirports: 'Erfasste Zielflughäfen',
    destinationCountries: 'Zielländer',
    airportPairs: 'Airport-Paare',
    topAirports: 'Deutsche Abflughäfen mit den meisten Route-Records',
    topCountries: 'Zielländer nach Route-Records',
    topCorridors: 'Häufigste deutsche Flughafen-Korridore',
    note: 'Die Werte zählen veröffentlichte Route-Records im Airpiv-Katalog. Sie sind ein Katalogsignal und keine Aussage über Nachfrage, Flugfrequenz, Marktanteil oder Verfügbarkeit an einem bestimmten Reisetag.',
    methodology: 'Methodik & Grenzen',
    methodologyText: 'Die Seite verwendet ausschließlich veröffentlichte Route-Records mit origin_country = DE. Deutsche Abflughäfen werden über origin_iata gezählt. Ziele werden über destination_iata und destination_country gezählt. Ein Airport-Paar ist gerichtet (Abflug → Ziel). Fehlende Länder- oder IATA-Werte werden nicht künstlich ergänzt.',
    linkedAsset: 'Verwandter Datenindex',
    linkedAssetText: 'Für die gesamte internationale Struktur des Routenkatalogs siehe den Länder- und Netzwerkindex.',
    openAsset: 'Länder- und Netzwerkindex öffnen',
    records: 'Records',
    destinations: 'Ziele',
    destinationRecords: 'Destination-Records',
  },
  en: {
    title: 'Germany: Airport Connectivity & International Routes',
    description: 'A public Airpiv data index of published route coverage from German-origin airports, including destinations and international country connections.',
    h1: 'Germany: Airport Connectivity & International Routes',
    intro: 'This data index uses only published Airpiv routes with Germany as the origin country. It shows which German departure airports are represented in the current catalogue, how many distinct destinations are recorded, and which international connections occur most often as route records.',
    snapshot: 'Current catalogue snapshot',
    generated: 'Page generated',
    routeRecords: 'Germany-origin routes',
    originAirports: 'German origin airports',
    destinationAirports: 'Recorded destination airports',
    destinationCountries: 'Destination countries',
    airportPairs: 'Airport pairs',
    topAirports: 'German origin airports with the most route records',
    topCountries: 'Destination countries by route records',
    topCorridors: 'Most-recorded German airport corridors',
    note: 'Values count published route records in the Airpiv catalogue. They are a catalogue signal, not a claim about demand, flight frequency, market share, or availability on a particular travel date.',
    methodology: 'Methodology & limitations',
    methodologyText: 'This page uses published route records with origin_country = DE only. German origin airports are counted by origin_iata. Destinations are counted by destination_iata and destination_country. An airport pair is directional (origin → destination). Missing country or IATA values are not inferred.',
    linkedAsset: 'Related data index',
    linkedAssetText: 'For the wider international structure of the route catalogue, see the country and network index.',
    openAsset: 'Open country and network index',
    records: 'records',
    destinations: 'destinations',
    destinationRecords: 'destination records',
  },
};

const CSS = `<style>
.de-air-wrap{max-width:1080px;margin:0 auto}
.de-air-breadcrumb{display:flex;gap:7px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px}
.de-air-breadcrumb a{color:var(--teal);text-decoration:none}.de-air-breadcrumb a:hover{text-decoration:underline}
.de-air-intro{max-width:880px;color:var(--tx2);line-height:1.7;margin:0 0 22px}
.de-air-snapshot{font-size:12px;color:var(--tx3);margin:-10px 0 18px}
.de-air-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:22px 0 30px}
.de-air-kpi{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 15px}
.de-air-kpi .num{font-size:22px;font-weight:800;color:var(--teal);line-height:1.1}
.de-air-kpi .label{font-size:12px;color:var(--tx3);margin-top:6px;line-height:1.35}
.de-air-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.de-air-section{margin-top:30px}.de-air-section h2{font-family:'Syne',sans-serif;font-size:1.25rem;color:var(--tx);margin:0 0 9px}
.de-air-note{font-size:13px;color:var(--tx2);line-height:1.6;margin:0 0 14px}
.de-air-list{margin:0;padding:0;list-style:none}.de-air-list li{display:flex;justify-content:space-between;gap:16px;padding:11px 13px;border:1px solid var(--bd);background:var(--bg2);border-radius:10px;margin-bottom:8px}
.de-air-rank{color:var(--tx3);font-size:12px;margin-right:8px}.de-air-name{font-weight:700;color:var(--tx)}.de-air-sub{color:var(--tx3);font-size:12px;margin-left:6px}.de-air-stat{white-space:nowrap;font-size:12px;font-weight:700;color:var(--tx3)}.de-air-stat strong{color:var(--teal)}
.de-air-method{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px;line-height:1.7;color:var(--tx2);font-size:13px}
.de-air-link{display:inline-flex;margin-top:12px;padding:9px 12px;border-radius:9px;border:1px solid var(--bd);text-decoration:none;color:var(--teal);font-size:12.5px;font-weight:700}.de-air-link:hover{border-color:var(--teal)}
@media (max-width:840px){.de-air-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.de-air-grid{grid-template-columns:1fr}}
@media (max-width:480px){.de-air-kpis{grid-template-columns:1fr 1fr}.de-air-kpi .num{font-size:19px}.de-air-list li{padding:10px 11px;gap:10px}}
</style>`;

const nf = (n, lang) => Number(n || 0).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB');
const clean = (value, fallback = '') => String(value || fallback).replace(/\s+/g, ' ').trim();

function computeData(routes) {
  const deRoutes = (Array.isArray(routes) ? routes : []).filter((r) => String(r.origin_country || '').toUpperCase() === 'DE');
  const originAirports = new Map();
  const destinationAirports = new Set();
  const destinationCountries = new Map();
  const airportPairs = new Map();

  for (const r of deRoutes) {
    const origin = String(r.origin_iata || '').trim().toUpperCase();
    const destination = String(r.destination_iata || '').trim().toUpperCase();
    const country = String(r.destination_country || '').trim().toUpperCase();
    if (origin) {
      const row = originAirports.get(origin) || { iata: origin, city: clean(r.origin_city, origin), records: 0, destinations: new Set() };
      row.records += 1;
      if (destination) row.destinations.add(destination);
      originAirports.set(origin, row);
    }
    if (destination) destinationAirports.add(destination);
    if (country) destinationCountries.set(country, (destinationCountries.get(country) || 0) + 1);
    if (origin && destination) {
      const key = `${origin}>${destination}`;
      const row = airportPairs.get(key) || { origin, destination, originCity: clean(r.origin_city, origin), destinationCity: clean(r.destination_city, destination), records: 0 };
      row.records += 1;
      airportPairs.set(key, row);
    }
  }

  return {
    routeRecords: deRoutes.length,
    originAirports: originAirports.size,
    destinationAirports: destinationAirports.size,
    destinationCountries: destinationCountries.size,
    airportPairs: airportPairs.size,
    topAirports: [...originAirports.values()].sort((a, b) => b.records - a.records || b.destinations.size - a.destinations.size || a.iata.localeCompare(b.iata)).slice(0, 20),
    topCountries: [...destinationCountries.entries()].map(([country, records]) => ({ country, records })).sort((a, b) => b.records - a.records || a.country.localeCompare(b.country)).slice(0, 20),
    topCorridors: [...airportPairs.values()].sort((a, b) => b.records - a.records || a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination)).slice(0, 20),
  };
}

export async function renderGermanyAirportConnectivityHtml(lang = 'de') {
  const activeLang = lang === 'en' ? 'en' : 'de';
  const copy = COPY[activeLang];
  const routes = await listRoutePages();
  const data = computeData(routes);
  const canonical = urlFor(activeLang, 'research/germany-airport-connectivity');
  const urls = {
    de: urlFor('de', 'research/germany-airport-connectivity'),
    en: urlFor('en', 'research/germany-airport-connectivity'),
  };
  const networkHref = urlFor(activeLang, 'research/route-network');
  const generatedAt = new Date().toISOString().slice(0, 10);

  const airportRows = data.topAirports.map((item, i) => `<li><span><span class="de-air-rank">${i + 1}.</span><span class="de-air-name">${esc(item.city)} (${esc(item.iata)})</span><span class="de-air-sub">${nf(item.destinations.size, activeLang)} ${copy.destinations}</span></span><span class="de-air-stat"><strong>${nf(item.records, activeLang)}</strong> ${copy.records}</span></li>`).join('');
  const countryRows = data.topCountries.map((item, i) => `<li><span><span class="de-air-rank">${i + 1}.</span><span class="de-air-name">${esc(item.country)}</span></span><span class="de-air-stat"><strong>${nf(item.records, activeLang)}</strong> ${copy.destinationRecords}</span></li>`).join('');
  const corridorRows = data.topCorridors.map((item, i) => `<li><span><span class="de-air-rank">${i + 1}.</span><span class="de-air-name">${esc(item.originCity)} → ${esc(item.destinationCity)}</span><span class="de-air-sub">${esc(item.origin)}→${esc(item.destination)}</span></span><span class="de-air-stat"><strong>${nf(item.records, activeLang)}</strong> ${copy.records}</span></li>`).join('');

  const stats = [
    [data.routeRecords, copy.routeRecords],
    [data.originAirports, copy.originAirports],
    [data.destinationAirports, copy.destinationAirports],
    [data.destinationCountries, copy.destinationCountries],
    [data.airportPairs, copy.airportPairs],
  ].map(([value, label]) => `<div class="de-air-kpi"><div class="num">${nf(value, activeLang)}</div><div class="label">${label}</div></div>`).join('');

  const breadcrumb = `<nav class="de-air-breadcrumb" aria-label="Breadcrumb"><a href="${activeLang === 'de' ? '/' : '/en/'}">Airpiv</a><span>›</span><span>${copy.h1}</span></nav>`;
  const mainContent = `<main id="de-air-main"><div class="de-air-wrap">${breadcrumb}<h1>${copy.h1}</h1><p class="de-air-intro">${copy.intro}</p><div class="de-air-snapshot">${copy.snapshot} · ${copy.generated}: ${generatedAt}</div><div class="de-air-kpis">${stats}</div><div class="de-air-grid"><section class="de-air-section"><h2>${copy.topAirports}</h2><p class="de-air-note">${copy.note}</p><ol class="de-air-list">${airportRows}</ol></section><section class="de-air-section"><h2>${copy.topCountries}</h2><p class="de-air-note">${copy.note}</p><ol class="de-air-list">${countryRows}</ol></section></div><section class="de-air-section"><h2>${copy.topCorridors}</h2><p class="de-air-note">${copy.note}</p><ol class="de-air-list">${corridorRows}</ol></section><section class="de-air-section"><h2>${copy.methodology}</h2><div class="de-air-method">${copy.methodologyText}<br><a class="de-air-link" href="${networkHref}">${copy.openAsset}</a></div></section><section class="de-air-section"><h2>${copy.linkedAsset}</h2><div class="de-air-method">${copy.linkedAssetText}</div></section></div></main>`;

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: copy.title,
    description: copy.description,
    url: canonical,
    inLanguage: activeLang === 'de' ? 'de-DE' : 'en-GB',
    dateModified: generatedAt,
    creator: { '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com' },
    publisher: { '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com' },
    variableMeasured: ['Published Germany-origin route records', 'German origin airports', 'Recorded destination airports', 'Destination countries', 'Directional airport pairs'],
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

  return renderShell({
    lang: activeLang,
    title: `${copy.title} | Airpiv`,
    description: copy.description,
    canonicalUrl: canonical,
    urls,
    headExtra: `${jsonLdScript(pageSchema)}${jsonLdScript(datasetSchema)}${CSS}`,
    mainContent,
    robotsContent: data.routeRecords > 0 ? 'index, follow' : 'noindex, follow',
  });
}

function esc(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}
