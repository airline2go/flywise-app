import { listRoutePages } from '../content-api.js';
import shellMod from './shell.js';
import languagesMod from './languages.js';

const { renderShell, jsonLdScript } = shellMod;
const { urlFor } = languagesMod;

// Conservative country-code definition used only to group destination records
// into a Europe view. Germany is deliberately excluded because this asset is
// the international Germany → Europe layer; domestic DE → DE routes belong to
// the Germany connectivity asset instead.
const EUROPE = new Set([
  'AL','AD','AM','AT','AZ','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','MK','NL','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB','VA',
]);

const COPY = {
  de: {
    title: 'Deutschland → Europa: Flugstrecken & Netz',
    description: 'Airpiv-Datenindex zu veröffentlichten Flugrouten von deutschen Abflughäfen zu europäischen Zielen.',
    h1: 'Deutschland → Europa: Flugstrecken & Netz',
    intro: 'Dieser Datenindex betrachtet ausschließlich veröffentlichte Airpiv-Routen mit Deutschland als Abflugland und europäischen Zielmärkten. Er zeigt die im aktuellen Routenkatalog erfassten internationalen Abflüge, Zielflughäfen, Zielländer und deutschen Airport→Country-Korridore.',
    snapshot: 'Aktueller Katalog-Snapshot', generated: 'Seite generiert',
    routeRecords: 'Deutschland → Europa Records', originAirports: 'Deutsche Abflughäfen', destinationAirports: 'Europäische Zielflughäfen', destinationCountries: 'Europäische Zielländer', corridors: 'Airport→Country-Korridore',
    topAirports: 'Deutsche Abflughäfen mit den meisten Europa-Zielen', topCountries: 'Europäische Zielländer nach Records', topCorridors: 'Stärkste Deutschland→Europa-Korridore',
    note: 'Die Werte zählen gespeicherte Route-Records im Airpiv-Katalog. Sie sind ein Katalogsignal und keine Aussage über Nachfrage, Flugfrequenz, Kapazität, Marktanteil oder Verfügbarkeit an einem bestimmten Reisetag.',
    methodology: 'Methodik & Grenzen', methodologyText: 'Die Seite filtert veröffentlichte Route-Records auf origin_country = DE und auf eine fest definierte Menge europäischer ISO-2-Ländercodes ohne DE. Zielzahlen zählen unterschiedliche destination_iata-Werte; Korridore sind gerichtet. Fehlende Länder- oder IATA-Werte werden nicht ergänzt.',
    related: 'Verwandte Datenindizes', network: 'Länder- und Netzwerkindex öffnen', germany: 'Deutschland-Konnektivität öffnen', flightData: 'Flugdaten-Index öffnen', records: 'Records', destinations: 'Ziele',
  },
  en: {
    title: 'Germany → Europe: Flight Routes & Network',
    description: 'Airpiv data index of published flight routes from German airports to European destinations.',
    h1: 'Germany → Europe: Flight Routes & Network',
    intro: 'This data index uses only published Airpiv routes with Germany as the origin country and European destination markets. It shows international German departures, recorded destination airports and countries, and directional Germany-to-Europe airport corridors represented in the current route catalogue.',
    snapshot: 'Current catalogue snapshot', generated: 'Page generated',
    routeRecords: 'Germany → Europe records', originAirports: 'German origin airports', destinationAirports: 'European destination airports', destinationCountries: 'European destination countries', corridors: 'Airport→country corridors',
    topAirports: 'German origin airports with the most European destinations', topCountries: 'European destination countries by records', topCorridors: 'Largest recorded Germany→Europe corridors',
    note: 'Values count stored route records in the Airpiv catalogue. They are a catalogue signal, not a claim about demand, flight frequency, capacity, market share, or availability on a particular travel date.',
    methodology: 'Methodology & limitations', methodologyText: 'This page filters published route records to origin_country = DE and a fixed set of European ISO-2 country codes excluding DE. Destination counts use distinct destination_iata values; corridors are directional. Missing country or IATA values are not inferred.',
    related: 'Related data indexes', network: 'Open country and network index', germany: 'Open Germany connectivity report', flightData: 'Open flight-data index', records: 'records', destinations: 'destinations',
  },
};

const CSS = `<style>
.geu-wrap{max-width:1080px;margin:0 auto}.geu-breadcrumb{display:flex;gap:7px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px}.geu-breadcrumb a{color:var(--teal);text-decoration:none}.geu-breadcrumb a:hover{text-decoration:underline}.geu-intro{max-width:880px;color:var(--tx2);line-height:1.7;margin:0 0 22px}.geu-snapshot{font-size:12px;color:var(--tx3);margin:-10px 0 18px}.geu-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:22px 0 30px}.geu-kpi{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 15px}.geu-kpi .num{font-size:22px;font-weight:800;color:var(--teal);line-height:1.1}.geu-kpi .label{font-size:12px;color:var(--tx3);margin-top:6px;line-height:1.35}.geu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.geu-section{margin-top:30px}.geu-section h2{font-family:'Syne',sans-serif;font-size:1.25rem;color:var(--tx);margin:0 0 9px}.geu-note{font-size:13px;color:var(--tx2);line-height:1.6;margin:0 0 14px}.geu-list{margin:0;padding:0;list-style:none}.geu-list li{display:flex;justify-content:space-between;gap:16px;padding:11px 13px;border:1px solid var(--bd);background:var(--bg2);border-radius:10px;margin-bottom:8px}.geu-rank{color:var(--tx3);font-size:12px;margin-right:8px}.geu-name{font-weight:700;color:var(--tx)}.geu-sub{color:var(--tx3);font-size:12px;margin-left:6px}.geu-stat{white-space:nowrap;font-size:12px;font-weight:700;color:var(--tx3)}.geu-stat strong{color:var(--teal)}.geu-method{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px;line-height:1.7;color:var(--tx2);font-size:13px}.geu-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.geu-link{display:inline-flex;padding:9px 12px;border-radius:9px;border:1px solid var(--bd);text-decoration:none;color:var(--teal);font-size:12.5px;font-weight:700}.geu-link:hover{border-color:var(--teal)}@media (max-width:840px){.geu-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.geu-grid{grid-template-columns:1fr}}@media (max-width:480px){.geu-kpis{grid-template-columns:1fr 1fr}.geu-kpi .num{font-size:19px}.geu-list li{padding:10px 11px;gap:10px}}
</style>`;

const nf = (n, lang) => Number(n || 0).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB');
const clean = (value, fallback = '') => String(value || fallback).replace(/\s+/g, ' ').trim();
const esc = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function computeData(routes) {
  const rows = (Array.isArray(routes) ? routes : []).filter((r) => String(r?.origin_country || '').toUpperCase() === 'DE' && EUROPE.has(String(r?.destination_country || '').trim().toUpperCase()));
  const airports = new Map();
  const countries = new Map();
  const corridors = new Map();
  const destinationAirports = new Set();

  for (const r of rows) {
    const origin = String(r.origin_iata || '').trim().toUpperCase();
    const destination = String(r.destination_iata || '').trim().toUpperCase();
    const country = String(r.destination_country || '').trim().toUpperCase();
    if (destination) destinationAirports.add(destination);
    if (country) countries.set(country, (countries.get(country) || 0) + 1);
    if (origin) {
      const airport = airports.get(origin) || { iata: origin, city: clean(r.origin_city, origin), records: 0, destinations: new Set() };
      airport.records += 1;
      if (destination) airport.destinations.add(destination);
      airports.set(origin, airport);
      if (country) {
        const key = `${origin}>${country}`;
        const corridor = corridors.get(key) || { origin, city: clean(r.origin_city, origin), country, records: 0 };
        corridor.records += 1;
        corridors.set(key, corridor);
      }
    }
  }

  return {
    routeRecords: rows.length,
    originAirports: airports.size,
    destinationAirports: destinationAirports.size,
    destinationCountries: countries.size,
    corridors: corridors.size,
    topAirports: [...airports.values()].sort((a,b) => b.destinations.size-a.destinations.size || b.records-a.records || a.iata.localeCompare(b.iata)).slice(0,20),
    topCountries: [...countries.entries()].map(([country,records]) => ({ country, records })).sort((a,b) => b.records-a.records || a.country.localeCompare(b.country)).slice(0,20),
    topCorridors: [...corridors.values()].sort((a,b) => b.records-a.records || a.origin.localeCompare(b.origin) || a.country.localeCompare(b.country)).slice(0,20),
  };
}

function listRows(rows, kind, lang, copy) {
  return rows.map((item, index) => {
    if (kind === 'airport') return `<li><span><span class="geu-rank">${index + 1}.</span><span class="geu-name">${esc(item.city)} (${esc(item.iata)})</span><span class="geu-sub">${nf(item.destinations.size, lang)} ${copy.destinations}</span></span><span class="geu-stat"><strong>${nf(item.records, lang)}</strong> ${copy.records}</span></li>`;
    if (kind === 'country') return `<li><span><span class="geu-rank">${index + 1}.</span><span class="geu-name">${esc(item.country)}</span></span><span class="geu-stat"><strong>${nf(item.records, lang)}</strong> ${copy.records}</span></li>`;
    return `<li><span><span class="geu-rank">${index + 1}.</span><span class="geu-name">${esc(item.city)} → ${esc(item.country)}</span><span class="geu-sub">${esc(item.origin)}</span></span><span class="geu-stat"><strong>${nf(item.records, lang)}</strong> ${copy.records}</span></li>`;
  }).join('');
}

export async function renderGermanyEuropeFlightNetworkHtml(lang = 'de') {
  const activeLang = lang === 'en' ? 'en' : 'de';
  const copy = COPY[activeLang];
  const routes = await listRoutePages();
  const data = computeData(routes);
  const canonical = urlFor(activeLang, 'research/germany-europe-flight-network');
  const urls = { de: urlFor('de', 'research/germany-europe-flight-network'), en: urlFor('en', 'research/germany-europe-flight-network') };
  const generatedAt = new Date().toISOString().slice(0, 10);
  const breadcrumb = `<nav class="geu-breadcrumb" aria-label="Breadcrumb"><a href="${activeLang === 'de' ? '/' : '/en/'}">Airpiv</a><span>›</span><span>${copy.h1}</span></nav>`;
  const stats = [[data.routeRecords,copy.routeRecords],[data.originAirports,copy.originAirports],[data.destinationAirports,copy.destinationAirports],[data.destinationCountries,copy.destinationCountries],[data.corridors,copy.corridors]].map(([value,label]) => `<div class="geu-kpi"><div class="num">${nf(value, activeLang)}</div><div class="label">${label}</div></div>`).join('');
  const mainContent = `<main id="geu-main"><div class="geu-wrap">${breadcrumb}<h1>${copy.h1}</h1><p class="geu-intro">${copy.intro}</p><div class="geu-snapshot">${copy.snapshot} · ${copy.generated}: ${generatedAt}</div><div class="geu-kpis">${stats}</div><div class="geu-grid"><section class="geu-section"><h2>${copy.topAirports}</h2><p class="geu-note">${copy.note}</p><ol class="geu-list">${listRows(data.topAirports,'airport',activeLang,copy)}</ol></section><section class="geu-section"><h2>${copy.topCountries}</h2><p class="geu-note">${copy.note}</p><ol class="geu-list">${listRows(data.topCountries,'country',activeLang,copy)}</ol></section></div><section class="geu-section"><h2>${copy.topCorridors}</h2><p class="geu-note">${copy.note}</p><ol class="geu-list">${listRows(data.topCorridors,'corridor',activeLang,copy)}</ol></section><section class="geu-section"><h2>${copy.methodology}</h2><div class="geu-method">${copy.methodologyText}<div class="geu-links"><a class="geu-link" href="${urlFor(activeLang,'research/route-network')}">${copy.network}</a><a class="geu-link" href="${urlFor(activeLang,'research/germany-airport-connectivity')}">${copy.germany}</a><a class="geu-link" href="${urlFor(activeLang,'research/flight-data')}">${copy.flightData}</a></div></div></section><section class="geu-section"><h2>${copy.related}</h2><div class="geu-method">This asset sits between the Germany connectivity report and the broader country/network index, providing the international Germany→Europe slice from the same route catalogue.</div></section></div></main>`;
  const datasetSchema = { '@context':'https://schema.org', '@type':'Dataset', name:copy.title, description:copy.description, url:canonical, inLanguage:activeLang === 'de' ? 'de-DE' : 'en-GB', dateModified:generatedAt, creator:{'@type':'Organization',name:'Airpiv',url:'https://airpiv.com',logo:'https://airpiv.com/apple-touch-icon.png'}, publisher:{'@type':'Organization',name:'Airpiv',url:'https://airpiv.com',logo:'https://airpiv.com/apple-touch-icon.png'}, variableMeasured:['Germany-to-Europe route records','German origin airports','European destination airports','European destination countries','Directional Germany-to-country corridors'] };
  const pageSchema = { '@context':'https://schema.org', '@type':'WebPage', name:copy.title, description:copy.description, url:canonical, inLanguage:activeLang === 'de' ? 'de-DE' : 'en-GB', isPartOf:{'@type':'WebSite',name:'Airpiv',url:'https://airpiv.com'} };
  return renderShell({ lang:activeLang, title:`${copy.title} | Airpiv`, description:copy.description, canonicalUrl:canonical, urls, headExtra:`${jsonLdScript(pageSchema)}${jsonLdScript(datasetSchema)}${CSS}`, mainContent, robotsContent:data.routeRecords > 0 ? 'index, follow' : 'noindex, follow' });
}
