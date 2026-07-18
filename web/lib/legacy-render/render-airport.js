const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity, localizeCountry, localizeAirport } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');
const { nfmt } = require('./connection-facts');
const { computeAirportFacts, buildAirportFaqItems, buildAirportIntro } = require('./airport-facts');

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
.airport-route-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.airport-route-km{flex:none;font-family:monospace;font-size:11px;font-weight:700;color:var(--tx3);background:var(--bg);border:1px solid var(--bd);border-radius:5px;padding:2px 6px;white-space:nowrap}
.airport-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}
.airport-stat{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 12px;text-align:center}
.airport-stat-value{font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;color:var(--teal);line-height:1.15}
.airport-stat-value small{font-size:.62em;font-weight:700;color:var(--tx3);margin-inline-start:3px}
.airport-stat-label{font-size:11.5px;color:var(--tx3);margin-top:4px}
.airport-stat-sub{font-size:11px;color:var(--tx2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.airport-countries{margin-top:28px}
.airport-countries h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.airport-country-grid{display:flex;flex-wrap:wrap;gap:8px}
.airport-country-chip{display:inline-flex;align-items:center;gap:7px;background:var(--bg2);border:1px solid var(--bd);border-radius:999px;padding:6px 13px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none}
.airport-country-chip:hover{border-color:var(--teal)}
.airport-country-chip .count{font-size:11px;font-weight:700;color:var(--tx3)}
.airport-faq{margin-top:32px}
.airport-faq h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.airport-faq-item{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:15px 17px;margin-bottom:10px}
.airport-faq-q{font-weight:700;font-size:14.5px;color:var(--tx);margin-bottom:6px}
.airport-faq-a{font-size:13.5px;color:var(--tx2);line-height:1.55}
.airport-traveler-info-section{margin-top:28px}
.airport-traveler-info-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.airport-traveler-info-item{margin-bottom:14px}
.airport-traveler-info-item h3{font-size:13px;color:var(--tx2);margin-bottom:4px}
.airport-traveler-info-item p{font-size:13.5px;color:var(--tx);line-height:1.6}
@media (max-width:480px){.airport-route-grid{grid-template-columns:1fr}.airport-stats{grid-template-columns:1fr}}
</style>`;

function renderAirportPage(airport, routes, lang, routeMetaBySlug) {
  const cityName = localizeCity(airport.city, airport.code, lang);
  const airportName = localizeAirport(airport, lang) || airport.code;
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(r.destination_city, r.destination_iata, lang),
  }));

  const hasLongHaul = locRoutes.some((r) => r.haul_type === 'long-haul');
  let title, description;
  if (locRoutes.length === 1) {
    title = format(translate('airportSingleRouteTitleTemplate', lang), { code: airport.code, city: cityName });
    description = format(translate('airportSingleRouteDescriptionTemplate', lang), { code: airport.code, city: cityName });
  } else if (hasLongHaul) {
    title = format(translate('airportMixedHaulTitleTemplate', lang), { code: airport.code, city: cityName });
    description = format(translate('airportMixedHaulDescriptionTemplate', lang), { code: airport.code, city: cityName });
  } else {
    title = format(translate('airportAllRoutesTitleTemplate', lang), { code: airport.code, city: cityName });
    description = format(translate('airportAllRoutesDescriptionTemplate', lang), { code: airport.code, city: cityName, count: locRoutes.length });
  }

  const urls = urlsFor(`airport/${encodeURIComponent(airport.code)}`);
  const url = urls[lang];

  // [AIRPORT-FACTS] Real, data-gated stats/FAQ from the airport's routes joined
  // against the full route-pages metadata — see airport-facts.js. Computed up
  // front because the intro below now weaves in these real numbers.
  const meta = routeMetaBySlug || {};
  const facts = computeAirportFacts(airport, routes, meta, lang);
  const countryName = airport.country ? localizeCountry(airport.country, airport.country, lang) : null;
  // Per-airport varied, data-driven intro replaces the old single shared
  // template so pages don't read boilerplate-identical.
  const introText = buildAirportIntro(airport, facts, cityName, lang);

  const countryHref = airport.country ? urlFor(lang, `country/${encodeURIComponent(airport.country)}`) : null;
  const cityHref = airport.city_slug ? urlFor(lang, `city/${encodeURIComponent(airport.city_slug)}`) : null;
  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span>`;
  if (countryHref) breadcrumbHtml += `<a href="${countryHref}">${escHtml(airport.country)}</a><span>›</span>`;
  if (cityHref) breadcrumbHtml += `<a href="${cityHref}">${escHtml(cityName)}</a><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(airport.code)}</span></nav>`;

  const fromCount = locRoutes.filter((r) => r.origin_iata === airport.code).length;
  const toCount = locRoutes.filter((r) => r.destination_iata === airport.code).length;
  const factsHtml = `<div class="airport-facts">
    <div class="airport-fact"><div class="airport-fact-val">${locRoutes.length}</div><div class="airport-fact-lbl">${translate('routesLabel', lang)}</div></div>
    <div class="airport-fact"><div class="airport-fact-val">${fromCount}</div><div class="airport-fact-lbl">${translate('departuresLabel', lang)}</div></div>
    <div class="airport-fact"><div class="airport-fact-val">${toCount}</div><div class="airport-fact-lbl">${translate('arrivalsLabel', lang)}</div></div>
  </div>`;

  function haulLabel(r) {
    const ht = (r.haul_type != null) ? r.haul_type : (meta[r.slug] && meta[r.slug].haul_type);
    if (!ht) return '';
    // [HAUL-3-TIER] Distinct middle tag for medium-haul (1500–4000 km) routes.
    const key = ht === 'long-haul' ? 'longHaulTag' : (ht === 'medium-haul' ? 'mediumHaulTag' : 'shortHaulTag');
    return translate(key, lang);
  }
  function routeCardHtml(r) {
    const hl = haulLabel(r);
    const km = meta[r.slug] && meta[r.slug].distance_km;
    const kmBadge = typeof km === 'number' && km > 0 ? `<span class="airport-route-km">${nfmt(km, lang)} km</span>` : '';
    return `<a class="airport-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}"><span class="airport-route-top"><span>${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}</span>${kmBadge}</span>${hl ? `<span class="haul-tag">${hl}</span>` : ''}</a>`;
  }

  const fromRoutes = locRoutes.filter((r) => r.origin_iata === airport.code);
  const toRoutes = locRoutes.filter((r) => r.destination_iata === airport.code);
  const fromSectionHtml = fromRoutes.length
    ? `<section class="airport-routes-section"><h2>${translate('departuresFrom', lang)} ${escHtml(airport.code)}</h2><div class="airport-route-grid">${fromRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';
  const toSectionHtml = toRoutes.length
    ? `<section class="airport-routes-section"><h2>${translate('arrivalsAt', lang)} ${escHtml(airport.code)}</h2><div class="airport-route-grid">${toRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  // [ROUTE-INTELLIGENCE-3] Optional, admin-authored traveler info — every
  // item independently omitted when null, so an airport with none of
  // these filled in renders exactly as before.
  const travelerInfoItems = [];
  if (airport.distance_to_city_center_km != null) {
    travelerInfoItems.push(`<div class="airport-traveler-info-item"><h3>${translate('airportDistanceCityCenterLabel', lang)}</h3><p>${format(translate('airportDistanceCityCenterValueTemplate', lang), { distance: Number(airport.distance_to_city_center_km).toLocaleString(getLanguage(lang).locale) })}</p></div>`);
  }
  if (airport.transit_options) {
    travelerInfoItems.push(`<div class="airport-traveler-info-item"><h3>${translate('airportTransitOptionsLabel', lang)}</h3><p>${escHtml(airport.transit_options)}</p></div>`);
  }
  if (airport.terminal_info) {
    travelerInfoItems.push(`<div class="airport-traveler-info-item"><h3>${translate('airportTerminalInfoLabel', lang)}</h3><p>${escHtml(airport.terminal_info)}</p></div>`);
  }
  if (airport.traveler_tips) {
    travelerInfoItems.push(`<div class="airport-traveler-info-item"><h3>${translate('airportTravelerTipsLabel', lang)}</h3><p>${escHtml(airport.traveler_tips)}</p></div>`);
  }
  const travelerInfoHtml = travelerInfoItems.length
    ? `<section class="airport-traveler-info-section"><h2>${translate('airportTravelerInfoHeading', lang)}</h2>${travelerInfoItems.join('')}</section>`
    : '';

  // facts/countryName computed above (needed by the intro). Each block below
  // only renders when the underlying facts exist.
  const faqItems = buildAirportFaqItems(facts, airport.code, cityName, countryName, lang);

  function statTile(valueHtml, label, sub) {
    return `<div class="airport-stat"><div class="airport-stat-value">${valueHtml}</div><div class="airport-stat-label">${escHtml(label)}</div>${sub ? `<div class="airport-stat-sub">${escHtml(sub)}</div>` : ''}</div>`;
  }
  const statTiles = [];
  if (facts.destinationCount > 0) statTiles.push(statTile(nfmt(facts.destinationCount, lang), translate('cityStatDestinations', lang)));
  if (facts.countryCount > 0) statTiles.push(statTile(nfmt(facts.countryCount, lang), translate('cityStatCountries', lang)));
  if (facts.distances) statTiles.push(statTile(`${nfmt(facts.distances.longest.km, lang)}<small>km</small>`, translate('cityStatLongest', lang), facts.distances.longest.name));
  const statsHtml = statTiles.length >= 2 ? `<div class="airport-stats">${statTiles.join('')}</div>` : '';

  const countriesHtml = facts.countries.length >= 2
    ? `<section class="airport-countries"><h2>${escHtml(format(translate('airportSectionCountries', lang), { code: airport.code }))}</h2><div class="airport-country-grid">${facts.countries.map((c) => `<a class="airport-country-chip" href="${pathFor(lang, `country/${encodeURIComponent(c.code)}`)}">${escHtml(c.name)}<span class="count">${nfmt(c.count, lang)}</span></a>`).join('')}</div></section>`
    : '';

  const faqHtml = faqItems.length
    ? `<section class="airport-faq"><h2>${translate('frequentlyAskedQuestions', lang)}</h2>${faqItems.map((f) => `<div class="airport-faq-item"><div class="airport-faq-q">${escHtml(f.question)}</div><div class="airport-faq-a">${escHtml(f.answer)}</div></div>`).join('')}</section>`
    : '';

  const mainContent = `<main id="airport-main">
  <div id="airport-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="airport-hero">
  <div class="airport-hero-code">${escHtml(airport.code)}</div>
  <div class="airport-hero-city">${escHtml(cityName)}</div>
  <div class="airport-hero-sub">${translate('airportWord', lang)}</div>
  ${factsHtml}
</div>
${statsHtml}
<section><p>${escHtml(introText)}</p></section>
${travelerInfoHtml}
${fromSectionHtml}
${toSectionHtml}
${countriesHtml}
${faqHtml}
  </div>
</main>`;

  const breadcrumbList = [{ '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') }];
  let pos = 2;
  if (airport.country) breadcrumbList.push({ '@type': 'ListItem', position: pos++, name: airport.country, item: urlFor(lang, `country/${airport.country}`) });
  if (airport.city_slug) breadcrumbList.push({ '@type': 'ListItem', position: pos++, name: cityName, item: urlFor(lang, `city/${airport.city_slug}`) });
  breadcrumbList.push({ '@type': 'ListItem', position: pos, name: airport.code, item: url });

  // [AIRPORT-SCHEMA] schema.org Airport type, already correct — now also
  // carries inLanguage/availableLanguage (previously missing entirely on
  // this page type, unlike city/country/route) and the real localized
  // airport name instead of always the raw title string.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Airport',
    name: airportName,
    iataCode: airport.code,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };

  // [STANDALONE-BREADCRUMB] Standalone top-level BreadcrumbList block
  // (matching render-flight-route.js) instead of nested under Airport.breadcrumb.
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbList };

  // [FAQ-SCHEMA] Standalone FAQPage from the same data-gated FAQ items shown on
  // the page (1:1), plus an ItemList of the popularity-ranked destinations as
  // internal links — both omitted when there's nothing real to list.
  const faqSchema = faqItems.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
    : null;
  const itemListSchema = facts.topDestinations.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: format(translate('airportSectionTopDestinations', lang), { code: airport.code }),
        itemListElement: facts.topDestinations.map((d, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: d.name,
          url: urlFor(lang, `city/${encodeURIComponent(d.slug)}`),
        })),
      }
    : null;
  const extraSchemaHtml = [faqSchema, itemListSchema].filter(Boolean).map((s) => jsonLdScript(s)).join('\n');

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}${extraSchemaHtml ? '\n' + extraSchemaHtml : ''}\n${AIRPORT_CSS}`;

  const html = renderShell({
    lang,
    title: `${title} | Airpiv`,
    description,
    canonicalUrl: url,
    urls,
    headExtra,
    mainContent,
  });

  return { html, seo: { title: `${title} | Airpiv`, description, canonicalUrl: url, schema } };
}

module.exports = { renderAirportPage };
