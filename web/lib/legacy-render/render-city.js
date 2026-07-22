const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity, localizeCountry, getAlternativeAirports } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');
const { computeCityFacts, buildCityFaqItems, buildCityIntro, nfmt } = require('./city-facts');

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
.city-route-card .city-route-name{flex:1;min-width:0}
.city-route-km{flex:none;font-family:monospace;font-size:11px;font-weight:700;color:var(--tx3);background:var(--bg);border:1px solid var(--bd);border-radius:5px;padding:2px 6px;margin-inline-start:8px;white-space:nowrap}
.city-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}
.city-stat{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 12px;text-align:center}
.city-stat-value{font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;color:var(--teal);line-height:1.15}
.city-stat-value small{font-size:.62em;font-weight:700;color:var(--tx3);margin-inline-start:3px}
.city-stat-label{font-size:11.5px;color:var(--tx3);margin-top:4px}
.city-stat-sub{font-size:11px;color:var(--tx2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.city-countries{margin-top:28px}
.city-countries h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.city-country-grid{display:flex;flex-wrap:wrap;gap:8px}
.city-country-chip{display:inline-flex;align-items:center;gap:7px;background:var(--bg2);border:1px solid var(--bd);border-radius:999px;padding:6px 13px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none}
.city-country-chip:hover{border-color:var(--teal)}
.city-country-chip .count{font-size:11px;font-weight:700;color:var(--tx3)}
.city-faq{margin-top:32px}
.city-faq h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.city-faq-item{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:15px 17px;margin-bottom:10px}
.city-faq-q{font-weight:700;font-size:14.5px;color:var(--tx);margin-bottom:6px}
.city-faq-a{font-size:13.5px;color:var(--tx2);line-height:1.55}
.city-why,.city-tips{margin-top:28px}
.city-why h2,.city-tips h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.city-why-grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.city-why-grid li{background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:10px 13px;font-size:13.5px;font-weight:600;color:var(--tx)}
.city-why-grid li::before{content:"✓";color:var(--teal);font-weight:800;margin-inline-end:8px}
.city-tips-list{margin:0;padding-inline-start:20px}
.city-tips-list li{font-size:13.5px;color:var(--tx2);line-height:1.7}
.city-eeat{margin-top:28px;padding:16px 18px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px}
.city-eeat-meta{font-size:13px;color:var(--tx2);font-weight:600}
.city-eeat-dates{font-size:12px;color:var(--tx3);margin-top:6px;display:flex;gap:16px;flex-wrap:wrap}
.city-eeat-links{margin-top:12px;display:flex;gap:16px;flex-wrap:wrap}
.city-eeat-links a{color:var(--teal);text-decoration:none;font-weight:600;font-size:13px}
.city-eeat-links a:hover{text-decoration:underline}
@media (max-width:480px){.city-route-grid{grid-template-columns:1fr}.city-stats{grid-template-columns:repeat(2,1fr)}.city-why-grid{grid-template-columns:1fr}}
</style>`;

function renderCityPage(city, routes, lang, routeMetaBySlug) {
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

  // [CITY-FACTS] Real, per-city stats/FAQ derived from the city's routes
  // joined against the full route-pages metadata — see city-facts.js. Computed
  // up front because the intro below now weaves in these real numbers.
  const meta = routeMetaBySlug || {};
  const facts = computeCityFacts(city, routes, meta, lang);
  const countryName = city.country_code ? localizeCountry(city.country_code, city.country_code, lang) : null;

  // [ADMIN-OVERRIDE-ALL-LANGS] intro_text is admin-authored per city, not
  // per language — applies uniformly across all 7 languages. Absent that, a
  // data-driven, per-city-varied intro (buildCityIntro) replaces the old
  // single shared template so pages don't read boilerplate-identical.
  const introText = city.intro_text || buildCityIntro(city, facts, cityName, lang);

  const countryHref = city.country_code ? urlFor(lang, `country/${encodeURIComponent(city.country_code)}`) : null;
  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span>`;
  if (countryHref) breadcrumbHtml += `<a href="${countryHref}">${escHtml(countryName || city.country_code)}</a><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(cityName)}</span></nav>`;

  const airportsHtml = (city.airport_codes && city.airport_codes.length)
    ? `<div class="city-hero-airports">${city.airport_codes.map((a) => `<a href="${pathFor(lang, `airport/${encodeURIComponent(a)}`)}" class="city-airport-badge">${escHtml(a)}</a>`).join('')}</div>`
    : '';

  const fromRoutes = locRoutes.filter((r) => r.origin_city_slug === city.city_slug);
  const toRoutes = locRoutes.filter((r) => r.destination_city_slug === city.city_slug);
  function routeCardHtml(r) {
    const km = meta[r.slug] && meta[r.slug].distance_km;
    const kmBadge = typeof km === 'number' && km > 0
      ? `<span class="city-route-km">${nfmt(km, lang)} km</span>`
      : '';
    return `<a class="city-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}"><span class="city-route-name">${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}</span>${kmBadge}</a>`;
  }
  const fromSectionHtml = fromRoutes.length
    ? `<section class="city-routes-section"><h2>${translate('flightsFrom', lang)} ${escHtml(cityName)}</h2><div class="city-route-grid">${fromRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';
  const toSectionHtml = toRoutes.length
    ? `<section class="city-routes-section"><h2>${translate('flightsTo', lang)} ${escHtml(cityName)}</h2><div class="city-route-grid">${toRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  // facts/countryName computed above (needed by the intro). Each section
  // below is data-gated: it only renders when the underlying facts exist, so a
  // sparsely-connected city never shows an empty or invented block.
  const faqItems = buildCityFaqItems(facts, cityName, countryName, lang, city.city_slug);

  function statTile(valueHtml, label, sub) {
    return `<div class="city-stat"><div class="city-stat-value">${valueHtml}</div><div class="city-stat-label">${escHtml(label)}</div>${sub ? `<div class="city-stat-sub">${escHtml(sub)}</div>` : ''}</div>`;
  }
  const statTiles = [];
  if (facts.airportCount > 0) statTiles.push(statTile(nfmt(facts.airportCount, lang), translate('cityStatAirports', lang), facts.airportCodes.join(' · ')));
  if (facts.destinationCount > 0) statTiles.push(statTile(nfmt(facts.destinationCount, lang), translate('cityStatDestinations', lang)));
  if (facts.countryCount > 0) statTiles.push(statTile(nfmt(facts.countryCount, lang), translate('cityStatCountries', lang)));
  if (facts.distances) statTiles.push(statTile(`${nfmt(facts.distances.longest.km, lang)}<small>km</small>`, translate('cityStatLongest', lang), facts.distances.longest.name));
  const statsHtml = statTiles.length >= 2 ? `<div class="city-stats">${statTiles.join('')}</div>` : '';

  const countriesHtml = facts.countries.length >= 2
    ? `<section class="city-countries"><h2>${escHtml(format(translate('citySectionCountries', lang), { city: cityName }))}</h2><div class="city-country-grid">${facts.countries.map((c) => `<a class="city-country-chip" href="${pathFor(lang, `country/${encodeURIComponent(c.code)}`)}">${escHtml(c.name)}<span class="count">${nfmt(c.count, lang)}</span></a>`).join('')}</div></section>`
    : '';

  const faqHtml = faqItems.length
    ? `<section class="city-faq"><h2>${translate('frequentlyAskedQuestions', lang)}</h2>${faqItems.map((f) => `<div class="city-faq-item"><div class="city-faq-q">${escHtml(f.question)}</div><div class="city-faq-a">${escHtml(f.answer)}</div></div>`).join('')}</section>`
    : '';

  const routesWord = locRoutes.length === 1 ? translate('routeWordSingular', lang) : translate('routeWordPlural', lang);

  // [WHY-AIRPIV] Static trust block — reuses the three hero-badge labels plus
  // three E-E-A-T points. Identical for every city, localized per language.
  const whyAirpivHtml = `<section class="city-why"><h2>${escHtml(translate('whyAirpivHeading', lang))}</h2><ul class="city-why-grid">`
    + [
      translate('heroBadgeAirlines', lang),
      translate('heroBadgeLivePrices', lang),
      translate('heroBadgeNoHiddenFees', lang),
      translate('whyAirpivTransparentData', lang),
      translate('whyAirpivDailyUpdates', lang),
      translate('whyAirpivEditoriallyChecked', lang),
    ].map((t) => `<li>${escHtml(t)}</li>`).join('')
    + '</ul></section>';

  // [SPARTIPPS] Generic flight money-saving tips — same set for every city.
  const savingTipsHtml = `<section class="city-tips"><h2>${escHtml(translate('savingTipsHeading', lang))}</h2><ul class="city-tips-list">`
    + ['savingTipEarly', 'savingTipFlexibleDates', 'savingTipMidweek', 'savingTipCompareDirect', 'savingTipCheckBaggage', 'savingTipAltAirports', 'savingTipPriceAlert', 'savingTipOffSeason']
      .map((k) => `<li>${escHtml(translate(k, lang))}</li>`).join('')
    + '</ul></section>';

  // [E-E-A-T] Reading time is computed from the page's own visible text (~200
  // words/min). The dates come from the city record's real updated_at (never a
  // fabricated "reviewed today"); if absent, the block simply omits them.
  const readingText = [introText, fromSectionHtml, toSectionHtml, countriesHtml, faqHtml, whyAirpivHtml, savingTipsHtml]
    .join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const readingMin = Math.max(1, Math.round((readingText ? readingText.split(' ').length : 0) / 200));
  const updatedAt = city.updated_at ? new Date(city.updated_at) : null;
  const reviewedDate = updatedAt ? updatedAt.toISOString().slice(0, 10) : null;
  const dataUpdateUtc = updatedAt ? `${updatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC` : null;
  const eeatLinks = [
    ['/methodology.html', translate('methodologyLabel', lang)],
    ['/data-sources.html', translate('dataSourcesLabel', lang)],
    ['/editorial-policy.html', translate('editorialPolicyLabel', lang)],
    ['/transparency.html', translate('transparencyPageLabel', lang)],
  ].map(([href, label]) => `<a href="${href}">${escHtml(label)}</a>`).join('');
  const eeatDates = [
    reviewedDate ? `<span>${escHtml(translate('eeatReviewedLabel', lang))}: ${reviewedDate}</span>` : '',
    dataUpdateUtc ? `<span>${escHtml(translate('eeatLastDataUpdateLabel', lang))}: ${dataUpdateUtc}</span>` : '',
  ].join('');
  const eeatHtml = '<section class="city-eeat">'
    + `<div class="city-eeat-meta">${escHtml(translate('eeatTeam', lang))} · ${escHtml(format(translate('eeatReadingTimeTemplate', lang), { min: readingMin }))}</div>`
    + (eeatDates ? `<div class="city-eeat-dates">${eeatDates}</div>` : '')
    + `<div class="city-eeat-links">${eeatLinks}</div>`
    + '</section>';

  const mainContent = `<main id="city-main">
  <div id="city-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="city-hero">
  <div class="city-hero-name">✈ ${escHtml(cityName)}</div>
  <div class="city-hero-sub">${locRoutes.length} ${translate('availableWord', lang)} ${routesWord}</div>
  ${airportsHtml}
</div>
${statsHtml}
<section><p>${escHtml(introText)}</p></section>
${fromSectionHtml}
${toSectionHtml}
${countriesHtml}
${faqHtml}
${whyAirpivHtml}
${savingTipsHtml}
${eeatHtml}
  </div>
</main>`;

  const breadcrumbList = [{ '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') }];
  if (city.country_code) breadcrumbList.push({ '@type': 'ListItem', position: 2, name: countryName || city.country_code, item: urlFor(lang, `country/${city.country_code}`) });
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

  // [FAQ-SCHEMA] Standalone FAQPage block from the same data-gated FAQ items
  // rendered on the page — every Question maps 1:1 to a visible Q/A, so the
  // structured data never claims content the page doesn't show.
  const faqSchema = faqItems.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
    : null;

  // [ITEMLIST-SCHEMA] The popularity-ranked destinations, exposed as an
  // ItemList of internal links (only when a real demand signal ranked them).
  const itemListSchema = facts.topDestinations.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: format(translate('citySectionTopDestinations', lang), { city: cityName }),
        itemListElement: facts.topDestinations.map((d, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: d.name,
          url: urlFor(lang, `city/${encodeURIComponent(d.slug)}`),
        })),
      }
    : null;

  const extraSchemaHtml = [faqSchema, itemListSchema].filter(Boolean).map((s) => jsonLdScript(s)).join('\n');
  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}${extraSchemaHtml ? '\n' + extraSchemaHtml : ''}\n${CITY_CSS}`;

  // [THIN-CONTENT-NOINDEX] A city that connects to at most one distinct
  // destination and has no admin-written intro is thin — the generated FAQ for
  // it is largely templated (same shape as every other single-destination
  // city), so it must not flip such a page to index. Cities with real
  // connectivity (2+ destinations) carry genuinely distinct stats/FAQ and are
  // indexed. Always `follow` so link equity flows through either way.
  const robotsContent = (facts.destinationCount <= 1 && !city.intro_text) ? 'noindex, follow' : 'index, follow';

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
