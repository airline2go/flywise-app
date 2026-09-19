import { listRoutePages } from '../content-api.js';
import shellMod from './shell.js';
import languagesMod from './languages.js';

const { renderShell, jsonLdScript } = shellMod;
const { urlFor } = languagesMod;

const COPY = {
  de: {
    title: 'Deutschland: Flughafennetz & Flugrouten',
    description: 'Airpiv-Datenindex zu deutschen Abflughäfen, Zielabdeckung und internationalen Flugrouten.',
    h1: 'Deutschland: Flughafen-Konnektivität & internationale Strecken',
    intro: 'Dieser Datenindex betrachtet ausschließlich veröffentlichte Airpiv-Routen mit deutschem Abflugsland. Er zeigt die im Katalog erfassten deutschen Abflughäfen, deren Zielabdeckung und internationale Airport→Country-Korridore.',
    snapshot: 'Aktueller Katalog-Snapshot', generated: 'Datenstand',
    scopeNote: 'Wichtiger Hinweis: Diese Zahlen sind ein Deutschland-originierter Ausschnitt des veröffentlichten Routenkatalogs im September-2026-Snapshot. Die 26 Länder entsprechen ausschließlich den internationalen Zielländern innerhalb dieses Deutschland-Ausschnitts; sie sind keine Aussage über die globale Airpiv-Datenbasis oder deren Gesamtumfang.',
    highlights: 'Analytische Highlights', internationalShare: 'Anteil internationale Records', widestAirport: 'Größte internationale Zielabdeckung', leadingCorridor: 'Korridor mit den meisten Records',
    routeRecords: 'Deutschland-Abflüge', internationalRoutes: 'Internationale Abflüge', originAirports: 'Deutsche Abflughäfen', destinationAirports: 'Erfasste Zielflughäfen', internationalCountries: 'Internationale Zielländer',
    topAirports: 'Deutsche Abflughäfen mit der größten Zielabdeckung', topCountries: 'Internationale Zielländer nach Route-Records', topCorridors: 'Airport→Country-Korridore mit den meisten Records',
    note: 'Die Werte zählen veröffentlichte Route-Records im Airpiv-Katalog. Sie sind ein Katalogsignal und keine Aussage über Nachfrage, Flugfrequenz, Marktanteil oder Verfügbarkeit an einem bestimmten Reisetag.',
    methodology: 'Methodik & Grenzen', methodologyText: 'Die Seite verwendet ausschließlich veröffentlichte Route-Records mit origin_country = DE. Für internationale Kennzahlen werden destination_country-Werte ungleich DE verwendet. Deutsche Abflughäfen werden über origin_iata gezählt; Zielabdeckung über unterschiedliche destination_iata. Airport→Country-Korridore sind gerichtet. Fehlende Länder- oder IATA-Werte werden nicht künstlich ergänzt.',
    linkedAsset: 'Verwandter Datenindex', linkedAssetText: 'Für die gesamte internationale Struktur des Routenkatalogs siehe den Länder- und Netzwerkindex.', openAsset: 'Länder- und Netzwerkindex öffnen',
    download: 'CSV-Datensatz öffnen',
    pressTitle: 'Für Redaktionen & Recherche',
    pressIntro: 'Diese Seite ist als zitierbarer Daten- und Recherchebeleg aufgebaut. Alle Kennzahlen werden direkt aus dem veröffentlichten Airpiv-Routenkatalog berechnet.',
    citationLabel: 'Empfohlener Quellenhinweis',
    citationText: 'Quelle: Airpiv – Deutschland: Flughafen-Konnektivität & internationale Strecken',
    reuseTitle: 'Redaktionelle Nutzung',
    reuseText: 'Kennzahlen, Tabellen und Diagramme dürfen redaktionell zitiert oder zusammengefasst werden. Bitte Airpiv als Quelle nennen und auf diese Forschungsseite verlinken, damit Leser Methodik, Datenstand und CSV prüfen können.',
    findingsTitle: 'Kernaussagen für Redaktionen',
    visualTitle: 'Visuelle Übersicht',
    visualAirports: 'Internationale Zielabdeckung nach Abflughafen',
    visualCountries: 'Internationale Zielländer nach Route-Records',
    dictionaryTitle: 'CSV-Datenwörterbuch',
    dictionaryText: 'Der öffentliche CSV-Download enthält die zugrunde liegenden Deutschland-originierter Route-Records. Diese Felder erleichtern Reproduktion, Prüfung und eigene Auswertungen.',
    alternateReport: 'Englische Version',
    sourceReady: 'Zitierfähige Zusammenfassung',
    records: 'Records', destinations: 'Ziele', destinationRecords: 'Records', countries: 'Länder',
  },
  en: {
    title: 'Germany: Airport Network & Flight Routes',
    description: 'Airpiv data index of German-origin airports, destination coverage and international flight routes.',
    h1: 'Germany: Airport Connectivity & International Routes',
    intro: 'This data index uses only published Airpiv routes with Germany as the origin country. It shows the German departure airports represented in the catalogue, their recorded destination coverage, and international airport-to-country corridors.',
    snapshot: 'Current catalogue snapshot', generated: 'Data snapshot',
    scopeNote: 'Scope note: these figures are a Germany-origin subset of Airpiv’s published route catalogue in the September 2026 snapshot. The 26-country figure refers only to international destination countries within this Germany subset; it is not the size of Airpiv’s global catalogue or a measure of its total airline coverage.',
    highlights: 'Analytical highlights', internationalShare: 'Share of international records', widestAirport: 'Broadest international destination coverage', leadingCorridor: 'Corridor with the most records',
    routeRecords: 'Germany-origin routes', internationalRoutes: 'International routes', originAirports: 'German origin airports', destinationAirports: 'Recorded destination airports', internationalCountries: 'International destination countries',
    topAirports: 'German origin airports with the broadest destination coverage', topCountries: 'International destination countries by route records', topCorridors: 'Airport-to-country corridors with the most records',
    note: 'Values count published route records in the Airpiv catalogue. They are a catalogue signal, not a claim about demand, flight frequency, market share, or availability on a particular travel date.',
    methodology: 'Methodology & limitations', methodologyText: 'This page uses published route records with origin_country = DE only. International metrics use destination_country values other than DE. German origin airports are counted by origin_iata; destination coverage uses distinct destination_iata values. Airport-to-country corridors are directional. Missing country or IATA values are not inferred.',
    linkedAsset: 'Related data index', linkedAssetText: 'For the wider international structure of the route catalogue, see the country and network index.', openAsset: 'Open country and network index',
    download: 'Open CSV dataset',
    pressTitle: 'For journalists & researchers',
    pressIntro: 'This page is designed as a citation-ready data and research reference. Every metric is calculated directly from Airpiv’s published route catalogue.',
    citationLabel: 'Suggested source credit',
    citationText: 'Source: Airpiv — Germany: Airport Connectivity & International Routes',
    reuseTitle: 'Editorial use',
    reuseText: 'Figures, tables and charts may be quoted or summarised for editorial use. Please credit Airpiv and link to this research page so readers can verify the methodology, snapshot date and CSV.',
    findingsTitle: 'Key findings for journalists',
    visualTitle: 'Visual overview',
    visualAirports: 'International destination coverage by origin airport',
    visualCountries: 'International destination countries by route records',
    dictionaryTitle: 'CSV data dictionary',
    dictionaryText: 'The public CSV download contains the underlying Germany-origin route records. These fields make the analysis easier to reproduce, verify and extend.',
    alternateReport: 'German version',
    sourceReady: 'Citation-ready summary',
    records: 'records', destinations: 'destinations', destinationRecords: 'records', countries: 'countries',
  },
};

const CSS = `<style>
.de-air-wrap{max-width:1080px;margin:0 auto}.de-air-breadcrumb{display:flex;gap:7px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px}.de-air-breadcrumb a{color:var(--teal);text-decoration:none}.de-air-breadcrumb a:hover{text-decoration:underline}.de-air-intro{max-width:880px;color:var(--tx2);line-height:1.7;margin:0 0 22px}.de-air-snapshot{font-size:12px;color:var(--tx3);margin:-10px 0 12px}.de-air-scope{background:var(--bg2);border:1px solid var(--bd);border-left:3px solid var(--teal);border-radius:10px;padding:12px 14px;color:var(--tx2);font-size:13px;line-height:1.55;margin:0 0 20px}.de-air-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:22px 0 30px}.de-air-kpi{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 15px}.de-air-kpi .num{font-size:22px;font-weight:800;color:var(--teal);line-height:1.1}.de-air-kpi .label{font-size:12px;color:var(--tx3);margin-top:6px;line-height:1.35}.de-air-highlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 30px}.de-air-highlight{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 15px}.de-air-highlight-value{font-size:20px;font-weight:800;color:var(--teal);line-height:1.1}.de-air-highlight-label{font-size:12px;font-weight:700;color:var(--tx);margin-top:7px;line-height:1.35}.de-air-highlight-detail{font-size:12px;color:var(--tx3);margin-top:5px;line-height:1.4}.de-air-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.de-air-section{margin-top:30px}.de-air-section h2{font-family:'Syne',sans-serif;font-size:1.25rem;color:var(--tx);margin:0 0 9px}.de-air-note{font-size:13px;color:var(--tx2);line-height:1.6;margin:0 0 14px}.de-air-list{margin:0;padding:0;list-style:none}.de-air-list li{display:flex;justify-content:space-between;gap:16px;padding:11px 13px;border:1px solid var(--bd);background:var(--bg2);border-radius:10px;margin-bottom:8px}.de-air-rank{color:var(--tx3);font-size:12px;margin-right:8px}.de-air-name{font-weight:700;color:var(--tx)}.de-air-sub{color:var(--tx3);font-size:12px;margin-left:6px}.de-air-stat{white-space:nowrap;font-size:12px;font-weight:700;color:var(--tx3)}.de-air-stat strong{color:var(--teal)}.de-air-method{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px;line-height:1.7;color:var(--tx2);font-size:13px}.de-air-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.de-air-link{display:inline-flex;padding:9px 12px;border-radius:9px;border:1px solid var(--bd);text-decoration:none;color:var(--teal);font-size:12.5px;font-weight:700}.de-air-link:hover{border-color:var(--teal)}.de-air-press{display:grid;grid-template-columns:1.4fr 1fr;gap:12px;margin:18px 0 28px}.de-air-press-card{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px}.de-air-press-card h2,.de-air-press-card h3{margin:0 0 8px;color:var(--tx);font-family:'Syne',sans-serif}.de-air-press-card h2{font-size:1.18rem}.de-air-press-card h3{font-size:1rem}.de-air-press-card p{margin:0;color:var(--tx2);line-height:1.65;font-size:13px}.de-air-citation{margin-top:12px;padding:11px 12px;border:1px dashed var(--bd);border-radius:9px;background:var(--bg);font-size:12.5px;line-height:1.55;color:var(--tx)}.de-air-findings{margin:0;padding-left:20px;color:var(--tx2);line-height:1.65;font-size:13px}.de-air-findings li{margin:6px 0}.de-air-bars{display:grid;grid-template-columns:1fr 1fr;gap:14px}.de-air-bar-card{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:15px}.de-air-bar-card h3{margin:0 0 12px;font-size:14px;color:var(--tx)}.de-air-bar-row{display:grid;grid-template-columns:minmax(120px,1fr) 2fr auto;gap:9px;align-items:center;margin:9px 0;font-size:12px}.de-air-bar-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--tx2)}.de-air-bar-track{height:8px;background:var(--bg);border-radius:999px;overflow:hidden;border:1px solid var(--bd)}.de-air-bar-fill{height:100%;background:var(--teal);border-radius:999px}.de-air-bar-value{font-weight:700;color:var(--tx3);min-width:26px;text-align:right}.de-air-dict{width:100%;border-collapse:collapse;margin-top:12px;font-size:12.5px}.de-air-dict th,.de-air-dict td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--bd);vertical-align:top}.de-air-dict th{color:var(--tx);font-weight:800}.de-air-dict td{color:var(--tx2)}.de-air-dict code{font-size:12px;color:var(--teal)}@media (max-width:840px){.de-air-press{grid-template-columns:1fr}.de-air-bars{grid-template-columns:1fr}.de-air-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.de-air-highlights{grid-template-columns:1fr}.de-air-grid{grid-template-columns:1fr}}@media (max-width:480px){.de-air-kpis{grid-template-columns:1fr 1fr}.de-air-kpi .num{font-size:19px}.de-air-list li{padding:10px 11px;gap:10px}}
</style>`;

const nf = (n, lang) => Number(n || 0).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB');
const countryName = (code, lang) => { try { return new Intl.DisplayNames([lang === 'de' ? 'de-DE' : 'en-GB'], { type: 'region' }).of(String(code || '').toUpperCase()) || String(code || ''); } catch { return String(code || ''); } };
const clean = (value, fallback = '') => String(value || fallback).replace(/\s+/g, ' ').trim();

function computeData(routes) {
  const deRoutes = (Array.isArray(routes) ? routes : []).filter((r) => String(r.origin_country || '').toUpperCase() === 'DE');
  const originAirports = new Map();
  const destinationAirports = new Set();
  const internationalCountries = new Map();
  const airportCountryCorridors = new Map();
  let internationalRoutes = 0;
  let latestUpdatedAt = null;

  for (const r of deRoutes) {
    const updatedAt = String(r.updated_at || '').trim();
    if (updatedAt && (!latestUpdatedAt || Date.parse(updatedAt) > Date.parse(latestUpdatedAt))) latestUpdatedAt = updatedAt;
    const origin = String(r.origin_iata || '').trim().toUpperCase();
    const destination = String(r.destination_iata || '').trim().toUpperCase();
    const destinationCountry = String(r.destination_country || '').trim().toUpperCase();
    if (origin) {
      const row = originAirports.get(origin) || { iata: origin, city: clean(r.origin_city, origin), records: 0, destinations: new Set(), internationalDestinations: new Set() };
      row.records += 1;
      if (destination) row.destinations.add(destination);
      if (destination && destinationCountry && destinationCountry !== 'DE') row.internationalDestinations.add(destination);
      originAirports.set(origin, row);
    }
    if (destination) destinationAirports.add(destination);
    if (destinationCountry && destinationCountry !== 'DE') {
      internationalRoutes += 1;
      internationalCountries.set(destinationCountry, (internationalCountries.get(destinationCountry) || 0) + 1);
      if (origin) {
        const key = `${origin}>${destinationCountry}`;
        const row = airportCountryCorridors.get(key) || { origin, originCity: clean(r.origin_city, origin), country: destinationCountry, records: 0 };
        row.records += 1;
        airportCountryCorridors.set(key, row);
      }
    }
  }

  return {
    routeRecords: deRoutes.length,
    internationalRoutes,
    originAirports: originAirports.size,
    destinationAirports: destinationAirports.size,
    internationalCountries: internationalCountries.size,
    topAirports: [...originAirports.values()].sort((a, b) => b.internationalDestinations.size - a.internationalDestinations.size || b.destinations.size - a.destinations.size || a.iata.localeCompare(b.iata)).slice(0, 20),
    topCountries: [...internationalCountries.entries()].map(([country, records]) => ({ country, records })).sort((a, b) => b.records - a.records || a.country.localeCompare(b.country)).slice(0, 20),
    topCorridors: [...airportCountryCorridors.values()].sort((a, b) => b.records - a.records || a.origin.localeCompare(b.origin) || a.country.localeCompare(b.country)).slice(0, 20),
    latestUpdatedAt,
  };
}

export async function renderGermanyAirportConnectivityHtml(lang = 'de') {
  const activeLang = lang === 'en' ? 'en' : 'de';
  const copy = COPY[activeLang];
  const routes = await listRoutePages();
  const data = computeData(routes);
  const canonical = urlFor(activeLang, 'research/germany-airport-connectivity');
  const urls = { de: urlFor('de', 'research/germany-airport-connectivity'), en: urlFor('en', 'research/germany-airport-connectivity') };
  const networkHref = urlFor(activeLang, 'research/route-network');
  const csvHref = '/research/germany-airport-connectivity.csv';
  const snapshotDate = data.latestUpdatedAt && Number.isFinite(Date.parse(data.latestUpdatedAt))
    ? new Date(data.latestUpdatedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const internationalShare = data.routeRecords > 0 ? ((data.internationalRoutes / data.routeRecords) * 100).toFixed(1) : '0.0';
  const widestAirport = data.topAirports[0] || null;
  const leadingCorridor = data.topCorridors[0] || null;
  const highlights = [
    `<div class="de-air-highlight"><div class="de-air-highlight-value">${internationalShare}%</div><div class="de-air-highlight-label">${copy.internationalShare}</div><div class="de-air-highlight-detail">${nf(data.internationalRoutes, activeLang)} / ${nf(data.routeRecords, activeLang)} ${copy.records}</div></div>`,
    widestAirport ? `<div class="de-air-highlight"><div class="de-air-highlight-value">${nf(widestAirport.internationalDestinations.size, activeLang)}</div><div class="de-air-highlight-label">${copy.widestAirport}</div><div class="de-air-highlight-detail">${esc(widestAirport.city)} (${esc(widestAirport.iata)})</div></div>` : '',
    leadingCorridor ? `<div class="de-air-highlight"><div class="de-air-highlight-value">${nf(leadingCorridor.records, activeLang)}</div><div class="de-air-highlight-label">${copy.leadingCorridor}</div><div class="de-air-highlight-detail">${esc(leadingCorridor.originCity)} → ${esc(countryName(leadingCorridor.country, activeLang))}</div></div>` : '',
  ].join('');
  const leadingCountry = data.topCountries[0] || null;
  const readySummary = activeLang === 'de'
    ? `Airpiv hat im ${snapshotDate}-Snapshot ${nf(data.routeRecords, activeLang)} veröffentlichte Deutschland-originierte Route-Records aus ${nf(data.originAirports, activeLang)} deutschen Abflughäfen ausgewertet. ${nf(data.internationalRoutes, activeLang)} Records betreffen internationale Ziele in ${nf(data.internationalCountries, activeLang)} Ländern und ${nf(data.destinationAirports, activeLang)} erfassten Zielflughäfen.`
    : `In the ${snapshotDate} snapshot, Airpiv analysed ${nf(data.routeRecords, activeLang)} published Germany-origin route records from ${nf(data.originAirports, activeLang)} German origin airports. ${nf(data.internationalRoutes, activeLang)} records cover international destinations across ${nf(data.internationalCountries, activeLang)} countries and ${nf(data.destinationAirports, activeLang)} recorded destination airports.`;
  const findings = [
    activeLang === 'de'
      ? `<li><strong>${internationalShare}%</strong> der Deutschland-originierenden Route-Records im Snapshot sind international (${nf(data.internationalRoutes, activeLang)} von ${nf(data.routeRecords, activeLang)}).</li>`
      : `<li><strong>${internationalShare}%</strong> of Germany-origin route records in the snapshot are international (${nf(data.internationalRoutes, activeLang)} of ${nf(data.routeRecords, activeLang)}).</li>`,
    widestAirport ? (activeLang === 'de'
      ? `<li><strong>${esc(widestAirport.city)} (${esc(widestAirport.iata)})</strong> weist mit ${nf(widestAirport.internationalDestinations.size, activeLang)} erfassten internationalen Zielen die größte Zielabdeckung im Datensatz auf.</li>`
      : `<li><strong>${esc(widestAirport.city)} (${esc(widestAirport.iata)})</strong> has the broadest recorded international destination coverage with ${nf(widestAirport.internationalDestinations.size, activeLang)} destinations.</li>`) : '',
    leadingCountry ? (activeLang === 'de'
      ? `<li><strong>${esc(countryName(leadingCountry.country, activeLang))}</strong> ist mit ${nf(leadingCountry.records, activeLang)} Route-Records das am häufigsten erfasste internationale Zielland.</li>`
      : `<li><strong>${esc(countryName(leadingCountry.country, activeLang))}</strong> is the most frequently recorded international destination country with ${nf(leadingCountry.records, activeLang)} route records.</li>`) : '',
    leadingCorridor ? (activeLang === 'de'
      ? `<li>Der am häufigsten erfasste Airport→Country-Korridor ist <strong>${esc(leadingCorridor.originCity)} → ${esc(countryName(leadingCorridor.country, activeLang))}</strong> mit ${nf(leadingCorridor.records, activeLang)} Records.</li>`
      : `<li>The most frequently recorded airport-to-country corridor is <strong>${esc(leadingCorridor.originCity)} → ${esc(countryName(leadingCorridor.country, activeLang))}</strong> with ${nf(leadingCorridor.records, activeLang)} records.</li>`) : '',
  ].filter(Boolean).join('');
  const airportBarMax = Math.max(1, ...data.topAirports.slice(0, 8).map((x) => x.internationalDestinations.size));
  const countryBarMax = Math.max(1, ...data.topCountries.slice(0, 8).map((x) => x.records));
  const airportBars = data.topAirports.slice(0, 8).map((item) => `<div class="de-air-bar-row"><div class="de-air-bar-label">${esc(item.city)} (${esc(item.iata)})</div><div class="de-air-bar-track"><div class="de-air-bar-fill" style="width:${Math.max(4, Math.round((item.internationalDestinations.size / airportBarMax) * 100))}%"></div></div><div class="de-air-bar-value">${nf(item.internationalDestinations.size, activeLang)}</div></div>`).join('');
  const countryBars = data.topCountries.slice(0, 8).map((item) => `<div class="de-air-bar-row"><div class="de-air-bar-label">${esc(countryName(item.country, activeLang))}</div><div class="de-air-bar-track"><div class="de-air-bar-fill" style="width:${Math.max(4, Math.round((item.records / countryBarMax) * 100))}%"></div></div><div class="de-air-bar-value">${nf(item.records, activeLang)}</div></div>`).join('');
  const dataFields = [
    ['origin_iata', activeLang === 'de' ? 'IATA-Code des deutschen Abflughafens' : 'IATA code of the German origin airport'],
    ['origin_city', activeLang === 'de' ? 'Abflugstadt' : 'Origin city'],
    ['origin_country', activeLang === 'de' ? 'Abflugland (DE)' : 'Origin country (DE)'],
    ['destination_iata', activeLang === 'de' ? 'IATA-Code des Zielflughafens' : 'Destination airport IATA code'],
    ['destination_city', activeLang === 'de' ? 'Zielstadt' : 'Destination city'],
    ['destination_country', activeLang === 'de' ? 'Zielland' : 'Destination country'],
    ['slug', activeLang === 'de' ? 'Stabile Airpiv-Routenkennung' : 'Stable Airpiv route identifier'],
    ['airline_count', activeLang === 'de' ? 'Im Katalog erfasste Airline-Anzahl' : 'Recorded airline count in the catalogue'],
    ['route_score', activeLang === 'de' ? 'Interner Routen-Score, sofern vorhanden' : 'Internal route score where available'],
    ['distance_km', activeLang === 'de' ? 'Routenentfernung in Kilometern, sofern vorhanden' : 'Route distance in kilometres where available'],
    ['updated_at', activeLang === 'de' ? 'Zeitstempel der letzten Aktualisierung' : 'Last-update timestamp'],
  ];
  const dictionaryRows = dataFields.map(([field, meaning]) => `<tr><td><code>${esc(field)}</code></td><td>${esc(meaning)}</td></tr>`).join('');
  const airportRows = data.topAirports.map((item, i) => `<li><span><span class="de-air-rank">${i + 1}.</span><span class="de-air-name">${esc(item.city)} (${esc(item.iata)})</span><span class="de-air-sub">${nf(item.internationalDestinations.size, activeLang)} ${copy.destinations}</span></span><span class="de-air-stat"><strong>${nf(item.records, activeLang)}</strong> ${copy.records}</span></li>`).join('');
  const countryRows = data.topCountries.map((item, i) => `<li><span><span class="de-air-rank">${i + 1}.</span><span class="de-air-name">${esc(countryName(item.country, activeLang))}</span></span><span class="de-air-stat"><strong>${nf(item.records, activeLang)}</strong> ${copy.destinationRecords}</span></li>`).join('');
  const corridorRows = data.topCorridors.map((item, i) => `<li><span><span class="de-air-rank">${i + 1}.</span><span class="de-air-name">${esc(item.originCity)} → ${esc(item.country)}</span><span class="de-air-sub">${esc(item.origin)}</span></span><span class="de-air-stat"><strong>${nf(item.records, activeLang)}</strong> ${copy.records}</span></li>`).join('');
  const stats = [
    [data.routeRecords, copy.routeRecords], [data.internationalRoutes, copy.internationalRoutes], [data.originAirports, copy.originAirports], [data.destinationAirports, copy.destinationAirports], [data.internationalCountries, copy.internationalCountries],
  ].map(([value, label]) => `<div class="de-air-kpi"><div class="num">${nf(value, activeLang)}</div><div class="label">${label}</div></div>`).join('');
  const breadcrumb = `<nav class="de-air-breadcrumb" aria-label="Breadcrumb"><a href="${activeLang === 'de' ? '/' : '/en/'}">Airpiv</a><span>›</span><span>${copy.h1}</span></nav>`;
  const alternateHref = activeLang === 'de' ? urls.en : urls.de;
  const mainContent = `<main id="de-air-main"><div class="de-air-wrap">${breadcrumb}<h1>${copy.h1}</h1><p class="de-air-intro">${copy.intro}</p><div class="de-air-snapshot">${copy.snapshot} · ${copy.generated}: ${snapshotDate}</div><div class="de-air-scope">${copy.scopeNote}</div><div class="de-air-press"><section class="de-air-press-card"><h2>${copy.pressTitle}</h2><p>${copy.pressIntro}</p><h3 style="margin-top:14px">${copy.sourceReady}</h3><p>${readySummary}</p><div class="de-air-citation"><strong>${copy.citationLabel}:</strong><br>${copy.citationText}, ${snapshotDate}.<br><a href="${canonical}">${canonical}</a></div><div class="de-air-links"><a class="de-air-link" href="${csvHref}">${copy.download}</a><a class="de-air-link" href="${alternateHref}">${copy.alternateReport}</a></div></section><section class="de-air-press-card"><h3>${copy.reuseTitle}</h3><p>${copy.reuseText}</p><h3 style="margin-top:14px">${copy.findingsTitle}</h3><ul class="de-air-findings">${findings}</ul></section></div><div class="de-air-kpis">${stats}</div><section class="de-air-section"><h2>${copy.highlights}</h2><div class="de-air-highlights">${highlights}</div></section><section class="de-air-section"><h2>${copy.visualTitle}</h2><div class="de-air-bars"><div class="de-air-bar-card"><h3>${copy.visualAirports}</h3>${airportBars}</div><div class="de-air-bar-card"><h3>${copy.visualCountries}</h3>${countryBars}</div></div></section><div class="de-air-grid"><section class="de-air-section"><h2>${copy.topAirports}</h2><p class="de-air-note">${copy.note}</p><ol class="de-air-list">${airportRows}</ol></section><section class="de-air-section"><h2>${copy.topCountries}</h2><p class="de-air-note">${copy.note}</p><ol class="de-air-list">${countryRows}</ol></section></div><section class="de-air-section"><h2>${copy.topCorridors}</h2><p class="de-air-note">${copy.note}</p><ol class="de-air-list">${corridorRows}</ol></section><section class="de-air-section"><h2>${copy.dictionaryTitle}</h2><div class="de-air-method"><p style="margin-top:0">${copy.dictionaryText}</p><table class="de-air-dict"><thead><tr><th>Field</th><th>${activeLang === 'de' ? 'Bedeutung' : 'Meaning'}</th></tr></thead><tbody>${dictionaryRows}</tbody></table><div class="de-air-links"><a class="de-air-link" href="${csvHref}">${copy.download}</a></div></div></section><section class="de-air-section"><h2>${copy.methodology}</h2><div class="de-air-method">${copy.methodologyText}<div class="de-air-links"><a class="de-air-link" href="${networkHref}">${copy.openAsset}</a><a class="de-air-link" href="${csvHref}">${copy.download}</a></div></div></section><section class="de-air-section"><h2>${copy.linkedAsset}</h2><div class="de-air-method">${copy.linkedAssetText}</div></section></div></main>`;
  const csvDistribution = { '@type': 'DataDownload', contentUrl: `https://airpiv.com${csvHref}`, encodingFormat: 'text/csv', name: `${copy.title} CSV` };
  const datasetSchema = { '@context': 'https://schema.org', '@type': 'Dataset', name: copy.title, description: copy.description, url: canonical, inLanguage: activeLang === 'de' ? 'de-DE' : 'en-GB', dateModified: snapshotDate, isAccessibleForFree: true, spatialCoverage: { '@type': 'Place', name: 'Germany' }, keywords: ['Germany airports', 'airport connectivity', 'flight routes', 'route network', 'aviation data', 'Airpiv'], citation: `${copy.citationText}, ${snapshotDate}. ${canonical}`, creator: { '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com', logo: 'https://airpiv.com/apple-touch-icon.png' }, publisher: { '@type': 'Organization', name: 'Airpiv', url: 'https://airpiv.com', logo: 'https://airpiv.com/apple-touch-icon.png' }, distribution: [csvDistribution], variableMeasured: ['Published Germany-origin route records', 'International Germany-origin route records', 'German origin airports', 'Recorded destination airports', 'International destination countries', 'Directional airport-to-country corridors'] };
  const pageSchema = { '@context': 'https://schema.org', '@type': 'WebPage', name: copy.title, description: copy.description, url: canonical, inLanguage: activeLang === 'de' ? 'de-DE' : 'en-GB', isPartOf: { '@type': 'WebSite', name: 'Airpiv', url: 'https://airpiv.com' } };
  return renderShell({ lang: activeLang, title: `${copy.title} | Airpiv`, description: copy.description, canonicalUrl: canonical, urls, headExtra: `${jsonLdScript(pageSchema)}${jsonLdScript(datasetSchema)}${CSS}`, mainContent, robotsContent: data.routeRecords > 0 ? 'index, follow' : 'noindex, follow' });
}

function esc(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}
