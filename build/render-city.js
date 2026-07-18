const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity, localizeCountry, getAlternativeAirports } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');

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
.city-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
.city-stat{display:block;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:18px 16px;text-align:center;text-decoration:none;color:inherit}
a.city-stat:hover{border-color:var(--teal)}
.city-stat-val{font-family:'Syne',sans-serif;font-size:1.7rem;font-weight:800;color:var(--teal);line-height:1.1}
.city-stat-val .u{font-size:.85rem;color:var(--tx3);font-weight:600;margin-left:3px}
.city-stat-lbl{color:var(--tx3);font-size:12.5px;margin-top:4px}
.city-stat-sub{margin-top:8px;display:flex;gap:5px;justify-content:center;flex-wrap:wrap}
.city-stat-sub a,.city-stat-sub span{background:rgba(15,181,160,.12);border:1px solid rgba(15,181,160,.28);color:var(--teal);font-size:11px;font-weight:700;border-radius:6px;padding:2px 8px;font-family:monospace;text-decoration:none}
.city-stat-sub a:hover{background:rgba(15,181,160,.24)}
.city-countries-section{margin-top:28px}
.city-countries-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.city-country-chips{display:flex;gap:8px;flex-wrap:wrap}
.city-country-chip{background:var(--bg2);border:1px solid var(--bd);border-radius:20px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none}
.city-country-chip:hover{border-color:var(--teal);color:var(--teal)}
@media (max-width:480px){.city-stat-grid{gap:10px}}
</style>`;

function renderCityPage(city, routes, lang) {
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
    title = format(translate('citySingleRouteTitleTemplate', lang), { otherCity, city: cityName });
    description = format(translate('citySingleRouteDescriptionTemplate', lang), { city: cityName, otherCity });
  } else if (multiAirport) {
    title = format(translate('cityMultiAirportTitleTemplate', lang), { city: cityName });
    description = format(translate('cityMultiAirportDescriptionTemplate', lang), { city: cityName, count: city.airport_codes.length, codes: city.airport_codes.join(', ') });
  } else if (locRoutes.length <= 4) {
    title = format(translate('cityFewRoutesTitleTemplate', lang), { entity: cityName, count: locRoutes.length });
    description = format(translate('cityFewRoutesDescriptionTemplate', lang), { entity: cityName, count: locRoutes.length });
  } else {
    title = format(translate('cityManyRoutesTitleTemplate', lang), { city: cityName });
    description = format(translate('cityManyRoutesDescriptionTemplate', lang), { city: cityName, count: locRoutes.length });
  }

  const urls = urlsFor(`city/${encodeURIComponent(city.city_slug)}`);
  const url = urls[lang];
  // [ADMIN-OVERRIDE-ALL-LANGS] intro_text is admin-authored per city, not
  // per language — applies uniformly across all 7 languages rather than
  // only overriding the German intro and silently falling back to the
  // generated template everywhere else.
  const introText = city.intro_text || format(translate('cityIntroTemplate', lang), { entity: cityName });

  const countryHref = city.country_code ? urlFor(lang, `country/${encodeURIComponent(city.country_code)}`) : null;
  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span>`;
  if (countryHref) breadcrumbHtml += `<a href="${countryHref}">${escHtml(city.country_code)}</a><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(cityName)}</span></nav>`;

  const airportsHtml = (city.airport_codes && city.airport_codes.length)
    ? `<div class="city-hero-airports">${city.airport_codes.map((a) => `<a href="${pathFor(lang, `airport/${encodeURIComponent(a)}`)}" class="city-airport-badge">${escHtml(a)}</a>`).join('')}</div>`
    : '';

  const fromRoutes = locRoutes.filter((r) => r.origin_city_slug === city.city_slug);
  const toRoutes = locRoutes.filter((r) => r.destination_city_slug === city.city_slug);
  function routeCardHtml(r) {
    return `<a class="city-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}</a>`;
  }
  const fromSectionHtml = fromRoutes.length
    ? `<section class="city-routes-section" id="city-from"><h2>${translate('flightsFrom', lang)} ${escHtml(cityName)}</h2><div class="city-route-grid">${fromRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';
  const toSectionHtml = toRoutes.length
    ? `<section class="city-routes-section"><h2>${translate('flightsTo', lang)} ${escHtml(cityName)}</h2><div class="city-route-grid">${toRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  // [CITY-STATS] Data-rich, fully-linked stat grid. Every figure resolves
  // to a real internal link — airport pages, the specific longest-route
  // page, and anchors to the departures / countries sections below — rather
  // than being a dead number. All values are computed at build time from the
  // already-fetched route rows; a card is omitted (never faked) when its
  // underlying data is absent. Destinations/countries/longest are measured
  // over DEPARTURES (fromRoutes) — "where you can fly to from this city".
  const airportCodes = (city.airport_codes || []);
  const destSlugs = new Set();
  const destCountrySet = new Set();
  let longest = null;
  fromRoutes.forEach((r) => {
    if (r.destination_city_slug) destSlugs.add(r.destination_city_slug);
    if (r.destination_country) destCountrySet.add(r.destination_country);
    if (r.distance_km != null && (!longest || r.distance_km > longest.distance_km)) longest = r;
  });
  const localeStr = getLanguage(lang).locale;

  const statCards = [];
  if (airportCodes.length) {
    const codeLinks = airportCodes.map((a) => `<a href="${pathFor(lang, `airport/${encodeURIComponent(a)}`)}">${escHtml(a)}</a>`).join('');
    statCards.push(`<div class="city-stat"><div class="city-stat-val">${airportCodes.length}</div><div class="city-stat-lbl">${translate('cityStatAirports', lang)}</div><div class="city-stat-sub">${codeLinks}</div></div>`);
  }
  if (destSlugs.size) {
    statCards.push(`<a class="city-stat" href="#city-from"><div class="city-stat-val">${destSlugs.size}</div><div class="city-stat-lbl">${translate('cityStatDestinations', lang)}</div></a>`);
  }
  if (destCountrySet.size) {
    statCards.push(`<a class="city-stat" href="#city-countries"><div class="city-stat-val">${destCountrySet.size}</div><div class="city-stat-lbl">${translate('cityStatCountries', lang)}</div></a>`);
  }
  if (longest && longest.distance_km != null) {
    statCards.push(`<a class="city-stat" href="${pathFor(lang, `flights/${encodeURIComponent(longest.slug)}`)}"><div class="city-stat-val">${longest.distance_km.toLocaleString(localeStr)}<span class="u">km</span></div><div class="city-stat-lbl">${translate('cityStatLongestFlight', lang)}</div><div class="city-stat-sub"><span>${escHtml(longest.destination_city)}</span></div></a>`);
  }
  const statGridHtml = statCards.length ? `<div class="city-stat-grid">${statCards.join('')}</div>` : '';

  // [CITY-COUNTRIES] Each distinct destination country becomes a chip that
  // links to that country's page — a fresh set of internal links to sibling
  // country pages, deduped and sorted by localized display name.
  const countriesSectionHtml = destCountrySet.size
    ? `<section class="city-countries-section" id="city-countries"><h2>${format(translate('cityCountriesServedHeading', lang), { entity: escHtml(cityName) })}</h2><div class="city-country-chips">${
      Array.from(destCountrySet)
        .map((code) => ({ code, name: localizeCountry(code, code, lang) }))
        .sort((a, b) => a.name.localeCompare(b.name, localeStr))
        .map(({ code, name }) => `<a class="city-country-chip" href="${pathFor(lang, `country/${encodeURIComponent(code)}`)}">${escHtml(name)}</a>`)
        .join('')
    }</div></section>`
    : '';

  const routesWord = locRoutes.length === 1 ? translate('routeWordSingular', lang) : translate('routeWordPlural', lang);
  const mainContent = `<main id="city-main">
  <div id="city-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="city-hero">
  <div class="city-hero-name">✈ ${escHtml(cityName)}</div>
  <div class="city-hero-sub">${locRoutes.length} ${translate('availableWord', lang)} ${routesWord}</div>
  ${airportsHtml}
</div>
${statGridHtml}
<section><p>${escHtml(introText)}</p></section>
${countriesSectionHtml}
${fromSectionHtml}
${toSectionHtml}
  </div>
</main>`;

  const breadcrumbList = [{ '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') }];
  if (city.country_code) breadcrumbList.push({ '@type': 'ListItem', position: 2, name: city.country_code, item: urlFor(lang, `country/${city.country_code}`) });
  breadcrumbList.push({ '@type': 'ListItem', position: breadcrumbList.length + 1, name: cityName, item: url });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };

  // [STANDALONE-BREADCRUMB] Emitted as its own top-level BreadcrumbList
  // JSON-LD block (matching render-flight-route.js) rather than nested
  // inside WebPage.breadcrumb — the standalone form is what Google's rich
  // results tooling actually looks for.
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbList };

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${CITY_CSS}`;

  // [THIN-CONTENT-NOINDEX] A city with at most one route and no admin-
  // written intro has nothing but a generated one-line template and a
  // single link — not enough unique content to be worth indexing. Still
  // `follow` so link equity flows through to the (single) route it links.
  const robotsContent = (locRoutes.length <= 1 && !city.intro_text) ? 'noindex, follow' : 'index, follow';

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

module.exports = { renderCityPage };
