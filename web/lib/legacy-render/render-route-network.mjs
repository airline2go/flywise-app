import { listRoutePages } from '../content-api.js';
import shellMod from './shell.js';
import languagesMod from './languages.js';

const { renderShell, jsonLdScript } = shellMod;
const { urlFor } = languagesMod;

const COPY = {
  de: {
    title: 'Flugstrecken nach Ländern & internationale Netzwerke',
    description: 'Öffentlicher Airpiv-Datenindex zur internationalen Struktur des gespeicherten Flugstreckenkatalogs, einschließlich Länderabdeckung und grenzüberschreitender Streckenkorridore.',
    h1: 'Flugstrecken nach Ländern & internationale Netzwerke',
    intro: 'Dieser Datenindex aggregiert die tatsächlich veröffentlichten Airpiv-Streckendaten auf Länderebene. Er zeigt, wie viele gespeicherte Strecken zwischen Ländern verlaufen und welche internationalen Korridore im aktuellen Katalog besonders stark vertreten sind.',
    snapshot: 'Aktueller Katalog-Snapshot',
    generated: 'Seite generiert',
    routeRecords: 'Veröffentlichte Strecken',
    crossBorder: 'Grenzüberschreitende Strecken',
    originCountries: 'Herkunftsländer',
    destinationCountries: 'Zielländer',
    countryPairs: 'Internationale Länderpaare',
    topOrigins: 'Länder mit den meisten erfassten Abflügen',
    topDestinations: 'Länder mit den meisten erfassten Ankünften',
    topPairs: 'Stärkste grenzüberschreitende Korridore',
    note: 'Die Werte zählen gespeicherte Route-Records. Sie sind ein Katalogsignal und keine Prognose von Nachfrage, Preisen oder Marktanteilen.',
    pairNote: 'Gezählt werden gerichtete Länderpaare Ursprung → Ziel. Gegenrichtungen werden separat betrachtet.',
    methodology: 'Methodik & Grenzen',
    methodologyText: 'Die Seite verwendet ausschließlich vorhandene veröffentlichte Route-Records. Eine Strecke wird als grenzüberschreitend gezählt, wenn für Ursprung und Ziel Länderangaben vorhanden und unterschiedlich sind. Länder werden so angezeigt, wie sie im Airpiv-Routenkatalog gespeichert sind. Fehlende Länderangaben werden nicht künstlich ergänzt.',
    linkedAsset: 'Verwandte Datenindizes',
    linkedAssetText: 'Für die Flughafen- und Konnektivitätsebene siehe den Airpiv-Flugdaten- und Streckenindex sowie den Deutschland-Konnektivitätsbericht.',
    openAsset: 'Flugdaten-Index öffnen',
    openGermanyAsset: 'Deutschland-Konnektivität öffnen',
    records: 'Records',
    pair: 'Länderpaar',
  },
  en: {
    title: 'Flight Routes by Country & International Network',
    description: 'A public Airpiv data index of the international structure of the stored flight-route catalogue, including country coverage and cross-border route corridors.',
    h1: 'Flight Routes by Country & International Network',
    intro: 'This data index aggregates Airpiv’s published route records at country level. It shows how many stored routes connect countries and which international corridors are most represented in the current catalogue.',
    snapshot: 'Current catalogue snapshot',
    generated: 'Page generated',
    routeRecords: 'Published routes',
    crossBorder: 'Cross-border routes',
    originCountries: 'Origin countries',
    destinationCountries: 'Destination countries',
    countryPairs: 'International country pairs',
    topOrigins: 'Countries with the most recorded departures',
    topDestinations: 'Countries with the most recorded arrivals',
    topPairs: 'Largest recorded cross-border corridors',
    note: 'Values count stored route records. They are a catalogue signal, not a forecast of demand, prices or market share.',
    pairNote: 'Directional country pairs Origin → Destination are counted separately from the reverse direction.',
    methodology: 'Methodology & limitations',
    methodologyText: 'This page uses published route records only. A route is counted as cross-border when both country fields exist and differ. Countries are displayed as stored in the Airpiv route catalogue. Missing country values are not filled with inferred data.',
    linkedAsset: 'Related data indexes',
    linkedAssetText: 'For the airport and connectivity layer, see Airpiv’s flight-data and route index and the Germany connectivity report.',
    openAsset: 'Open flight-data index',
    openGermanyAsset: 'Open Germany connectivity report',
    records: 'records',
    pair: 'country pair',
  },
};

const CSS = `<style>
.network-wrap{max-width:1080px;margin:0 auto}
.network-breadcrumb{display:flex;gap:7px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px}
.network-breadcrumb a{color:var(--teal);text-decoration:none}.network-breadcrumb a:hover{text-decoration:underline}
.network-intro{max-width:850px;color:var(--tx2);line-height:1.7;margin:0 0 22px}
.network-snapshot{font-size:12px;color:var(--tx3);margin:-10px 0 18px}
.network-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:22px 0 30px}
.network-kpi{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 15px}
.network-kpi .num{font-size:22px;font-weight:800;color:var(--teal);line-height:1.1}
.network-kpi .label{font-size:12px;color:var(--tx3);margin-top:6px;line-height:1.35}
.network-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.network-section{margin-top:30px}.network-section h2{font-family:'Syne',sans-serif;font-size:1.25rem;color:var(--tx);margin:0 0 9px}
.network-note{font-size:13px;color:var(--tx2);line-height:1.6;margin:0 0 14px}
.network-list{margin:0;padding:0;list-style:none}.network-list li{display:flex;justify-content:space-between;gap:16px;padding:11px 13px;border:1px solid var(--bd);background:var(--bg2);border-radius:10px;margin-bottom:8px}
.network-rank{color:var(--tx3);font-size:12px;margin-right:8px}.network-name{font-weight:700;color:var(--tx)}
.network-stat{white-space:nowrap;font-size:12px;font-weight:700;color:var(--tx3)}.network-stat strong{color:var(--teal)}
.network-method{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px;line-height:1.7;color:var(--tx2);font-size:13px}
.network-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.network-link{display:inline-flex;padding:9px 12px;border-radius:9px;border:1px solid var(--bd);text-decoration:none;color:var(--teal);font-size:12.5px;font-weight:700}.network-link:hover{border-color:var(--teal)}
@media (max-width:840px){.network-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.network-grid{grid-template-columns:1fr}}
@media (max-width:480px){.network-kpis{grid-template-columns:1fr 1fr}.network-kpi .num{font-size:19px}.network-list li{padding:10px 11px;gap:10px}}
</style>`;

const nf = (n, lang) => Number(n || 0).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB');

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function addCount(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function computeNetwork(routes) {
  const rows = Array.isArray(routes) ? routes.filter(Boolean) : [];
  const origins = new Map();
  const destinations = new Map();
  const pairs = new Map();
  let crossBorder = 0;

  for (const row of rows) {
    const originCountry = clean(row.origin_country);
    const destinationCountry = clean(row.destination_country);
    if (originCountry) addCount(origins, originCountry);
    if (destinationCountry) addCount(destinations, destinationCountry);

    if (originCountry && destinationCountry && originCountry.toLowerCase() !== destinationCountry.toLowerCase()) {
      crossBorder += 1;
      const key = `${originCountry} → ${destinationCountry}`;
      addCount(pairs, key);
    }
  }

  const sortCounts = (map) => [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 20);

  return {
    routeRecords: rows.length,
    crossBorder,
    originCountries: origins.size,
    destinationCountries: destinations.size,
    countryPairs: pairs.size,
    topOrigins: sortCounts(origins),
    topDestinations: sortCounts(destinations),
    topPairs: sortCounts(pairs),
  };
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function listMarkup(rows, label, lang) {
  return rows.map((item, index) => `<li><span><span class="network-rank">${index + 1}.</span><span class="network-name">${escapeHtml(item.name)}</span></span><span class="network-stat"><strong>${nf(item.count, lang)}</strong> ${label}</span></li>`).join('');
}

export async function renderRouteNetworkHtml(lang = 'de') {
  const activeLang = lang === 'en' ? 'en' : 'de';
  const copy = COPY[activeLang];
  const routes = await listRoutePages();
  const data = computeNetwork(routes);
  const canonical = urlFor(activeLang, 'research/route-network');
  const germanUrl = urlFor('de', 'research/route-network');
  const englishUrl = urlFor('en', 'research/route-network');
  const generatedAt = new Date().toISOString().slice(0, 10);

  const breadcrumb = `<nav class="network-breadcrumb" aria-label="Breadcrumb"><a href="${activeLang === 'de' ? '/' : '/en/'}">Airpiv</a><span>›</span><span>${copy.h1}</span></nav>`;
  const stats = [
    [data.routeRecords, copy.routeRecords],
    [data.crossBorder, copy.crossBorder],
    [data.originCountries, copy.originCountries],
    [data.destinationCountries, copy.destinationCountries],
    [data.countryPairs, copy.countryPairs],
  ].map(([value, label]) => `<div class="network-kpi"><div class="num">${nf(value, activeLang)}</div><div class="label">${label}</div></div>`).join('');

  const content = `<main id="network-main"><div class="network-wrap">${breadcrumb}<h1>${copy.h1}</h1><p class="network-intro">${copy.intro}</p><div class="network-snapshot">${copy.snapshot} · ${copy.generated}: ${generatedAt}</div><div class="network-kpis">${stats}</div><div class="network-grid"><section class="network-section"><h2>${copy.topOrigins}</h2><p class="network-note">${copy.note}</p><ol class="network-list">${listMarkup(data.topOrigins, copy.records, activeLang)}</ol></section><section class="network-section"><h2>${copy.topDestinations}</h2><p class="network-note">${copy.note}</p><ol class="network-list">${listMarkup(data.topDestinations, copy.records, activeLang)}</ol></section></div><section class="network-section"><h2>${copy.topPairs}</h2><p class="network-note">${copy.pairNote}</p><ol class="network-list">${listMarkup(data.topPairs, copy.records, activeLang)}</ol></section><section class="network-section"><h2>${copy.methodology}</h2><div class="network-method">${copy.methodologyText}<div class="network-links"><a class="network-link" href="${urlFor(activeLang, 'research/flight-data')}">${copy.openAsset}</a><a class="network-link" href="${urlFor(activeLang, 'research/germany-airport-connectivity')}">${copy.openGermanyAsset}</a></div></div></section><section class="network-section"><h2>${copy.linkedAsset}</h2><div class="network-method">${copy.linkedAssetText}</div></section></div></main>`;

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
    variableMeasured: [
      'Published route records',
      'Cross-border route records',
      'Origin countries',
      'Destination countries',
      'Directional international country pairs',
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

  return renderShell({
    lang: activeLang,
    title: `${copy.title} | Airpiv`,
    description: copy.description,
    canonicalUrl: canonical,
    urls: { de: germanUrl, en: englishUrl },
    headExtra: `${jsonLdScript(pageSchema)}${jsonLdScript(datasetSchema)}${CSS}`,
    mainContent: content,
    robotsContent: data.routeRecords > 0 ? 'index, follow' : 'noindex, follow',
  });
}
