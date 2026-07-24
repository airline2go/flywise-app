const { escHtml, renderShell, jsonLdScript, homeHref, speakableSpec } = require('./shell');
const { localizeCity, localizeCountry } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');
const { nfmt } = require('./connection-facts');
const { computeCountryFacts, buildCountryIntro, buildCountryFaqItems } = require('./country-facts');

const COUNTRY_CSS = `<style>
.country-hero{background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:18px;padding:32px 24px;margin:24px 0;text-align:center}
.country-hero-name{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:#fff}
.country-hero-sub{color:rgba(255,255,255,.55);font-size:13px;margin-top:6px}
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.country-routes-section{margin-top:28px}
.country-routes-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.country-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.country-route-card{display:block;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:13px 15px;font-size:13.5px;font-weight:600;color:var(--tx);text-decoration:none}
.country-route-card:hover{border-color:var(--teal)}
.country-route-card .arrow{color:var(--teal);margin:0 4px}
.country-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}
.country-stat{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px 12px;text-align:center}
.country-stat-value{font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;color:var(--teal);line-height:1.15}
.country-stat-label{font-size:11.5px;color:var(--tx3);margin-top:4px}
.country-chips{margin-top:28px}
.country-chips h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.country-chip-grid{display:flex;flex-wrap:wrap;gap:8px}
.country-chip{display:inline-flex;align-items:center;gap:7px;background:var(--bg2);border:1px solid var(--bd);border-radius:999px;padding:6px 13px;font-size:13px;font-weight:600;color:var(--tx);text-decoration:none}
.country-chip:hover{border-color:var(--teal)}
.country-chip .count{font-size:11px;font-weight:700;color:var(--tx3)}
.country-faq{margin-top:32px}
.country-faq h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.country-faq-item{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:15px 17px;margin-bottom:10px}
.country-faq-q{font-weight:700;font-size:14.5px;color:var(--tx);margin-bottom:6px}
.country-faq-a{font-size:13.5px;color:var(--tx2);line-height:1.55}
@media (max-width:480px){.country-route-grid{grid-template-columns:1fr}.country-stats{grid-template-columns:repeat(2,1fr)}}
</style>`;

function renderCountryPage(country, routes, lang, routeMetaBySlug) {
  const countryName = localizeCountry(country.name, country.code, lang);
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(r.destination_city, r.destination_iata, lang),
  }));

  let title, description;
  if (locRoutes.length === 1) {
    const r = locRoutes[0];
    const otherCity = r.origin_country === country.code ? r.destination_city : r.origin_city;
    title = format(translate('countrySingleRouteTitleTemplate', lang), { country: countryName, otherCity });
    description = format(translate('countrySingleRouteDescriptionTemplate', lang), { country: countryName, otherCity });
  } else if (locRoutes.length <= 4) {
    title = format(translate('countryFewRoutesTitleTemplate', lang), { entity: countryName, count: locRoutes.length });
    description = format(translate('countryFewRoutesDescriptionTemplate', lang), { entity: countryName, count: locRoutes.length });
  } else {
    title = format(translate('countryManyRoutesTitleTemplate', lang), { country: countryName });
    description = format(translate('countryManyRoutesDescriptionTemplate', lang), { country: countryName, count: locRoutes.length });
  }

  const urls = urlsFor(`country/${encodeURIComponent(country.code)}`);
  const url = urls[lang];

  // [COUNTRY-FACTS] Real per-country facts (cities/airports it contains,
  // external destinations & countries it reaches, domestic split, distances,
  // popularity) — see country-facts.js. Computed up front so the intro can
  // weave in the real numbers.
  const facts = computeCountryFacts(country, routes, routeMetaBySlug || {}, lang);
  const introText = country.intro_text || buildCountryIntro(country, facts, countryName, lang);
  const faqItems = buildCountryFaqItems(facts, countryName, lang);

  const breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span><span>${escHtml(countryName)}</span></nav>`;

  const fromRoutes = locRoutes.filter((r) => r.origin_country === country.code);
  const toRoutes = locRoutes.filter((r) => r.destination_country === country.code);
  function routeCardHtml(r) {
    return `<a class="country-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">${escHtml(r.origin_city)}<span class="arrow">→</span>${escHtml(r.destination_city)}</a>`;
  }
  const fromSectionHtml = fromRoutes.length
    ? `<section class="country-routes-section"><h2>${translate('flightsFrom', lang)} ${escHtml(countryName)}</h2><div class="country-route-grid">${fromRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';
  const toSectionHtml = toRoutes.length
    ? `<section class="country-routes-section"><h2>${translate('flightsTo', lang)} ${escHtml(countryName)}</h2><div class="country-route-grid">${toRoutes.map(routeCardHtml).join('')}</div></section>`
    : '';

  // Data-gated stats / chips / FAQ, mirroring the city & airport pages.
  function statTile(value, label) {
    return `<div class="country-stat"><div class="country-stat-value">${value}</div><div class="country-stat-label">${escHtml(label)}</div></div>`;
  }
  const statTiles = [];
  if (facts.cityCount > 0) statTiles.push(statTile(nfmt(facts.cityCount, lang), translate('countryStatCities', lang)));
  if (facts.airportCount > 0) statTiles.push(statTile(nfmt(facts.airportCount, lang), translate('cityStatAirports', lang)));
  if (facts.destinationCount > 0) statTiles.push(statTile(nfmt(facts.destinationCount, lang), translate('cityStatDestinations', lang)));
  if (facts.reachableCountryCount > 0) statTiles.push(statTile(nfmt(facts.reachableCountryCount, lang), translate('cityStatCountries', lang)));
  const statsHtml = statTiles.length >= 2 ? `<div class="country-stats">${statTiles.join('')}</div>` : '';

  const citiesChipsHtml = facts.cities.length >= 2
    ? `<section class="country-chips"><h2>${escHtml(format(translate('countrySectionCities', lang), { country: countryName }))}</h2><div class="country-chip-grid">${facts.cities.slice(0, 24).map((c) => `<a class="country-chip" href="${pathFor(lang, `city/${encodeURIComponent(c.slug)}`)}">${escHtml(c.name)}</a>`).join('')}</div></section>`
    : '';

  const countriesChipsHtml = facts.reachableCountries.length >= 2
    ? `<section class="country-chips"><h2>${escHtml(format(translate('countrySectionReach', lang), { country: countryName }))}</h2><div class="country-chip-grid">${facts.reachableCountries.slice(0, 20).map((c) => `<a class="country-chip" href="${pathFor(lang, `country/${encodeURIComponent(c.code)}`)}">${escHtml(c.name)}<span class="count">${nfmt(c.count, lang)}</span></a>`).join('')}</div></section>`
    : '';

  const faqHtml = faqItems.length
    ? `<section class="country-faq"><h2>${translate('frequentlyAskedQuestions', lang)}</h2>${faqItems.map((f) => `<div class="country-faq-item"><div class="country-faq-q">${escHtml(f.question)}</div><div class="country-faq-a">${escHtml(f.answer)}</div></div>`).join('')}</section>`
    : '';

  const routesWord = locRoutes.length === 1 ? translate('routeWordSingular', lang) : translate('routeWordPlural', lang);
  const mainContent = `<main id="country-main">
  <div id="country-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="country-hero">
  <div class="country-hero-name">✈ ${escHtml(countryName)}</div>
  <div class="country-hero-sub">${locRoutes.length} ${translate('availableWord', lang)} ${routesWord}</div>
</div>
${statsHtml}
<section><p>${escHtml(introText)}</p></section>
${citiesChipsHtml}
${fromSectionHtml}
${toSectionHtml}
${countriesChipsHtml}
${faqHtml}
  </div>
</main>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
    speakable: speakableSpec('.country-faq-q'),
  };

  // [STANDALONE-BREADCRUMB] Standalone top-level BreadcrumbList block
  // (matching render-flight-route.js) instead of nested under WebPage.breadcrumb.
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') },
      { '@type': 'ListItem', position: 2, name: countryName, item: url },
    ],
  };

  const faqSchema = faqItems.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
    : null;
  const itemListSchema = facts.topDestinations.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: format(translate('countrySectionReach', lang), { country: countryName }),
        itemListElement: facts.topDestinations.map((d, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: d.name,
          url: d.slug ? urlFor(lang, `city/${encodeURIComponent(d.slug)}`) : undefined,
        })),
      }
    : null;
  const extraSchemaHtml = [faqSchema, itemListSchema].filter(Boolean).map((s) => jsonLdScript(s)).join('\n');
  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}${extraSchemaHtml ? '\n' + extraSchemaHtml : ''}\n${COUNTRY_CSS}`;

  // [THIN-CONTENT-NOINDEX] A country reaching at most one distinct destination
  // and with no admin-written intro is thin; richer countries carry real
  // stats/FAQ and are indexed. Always `follow`.
  const robotsContent = (facts.destinationCount + facts.domesticCount <= 1 && !country.intro_text) ? 'noindex, follow' : 'index, follow';

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

module.exports = { renderCountryPage };
