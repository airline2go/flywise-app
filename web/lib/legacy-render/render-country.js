const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity, localizeCountry } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');

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
@media (max-width:480px){.country-route-grid{grid-template-columns:1fr}}
</style>`;

function renderCountryPage(country, routes, lang) {
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
  const introText = country.intro_text || format(translate('countryIntroTemplate', lang), { entity: countryName });

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

  const routesWord = locRoutes.length === 1 ? translate('routeWordSingular', lang) : translate('routeWordPlural', lang);
  const mainContent = `<main id="country-main">
  <div id="country-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="country-hero">
  <div class="country-hero-name">✈ ${escHtml(countryName)}</div>
  <div class="country-hero-sub">${locRoutes.length} ${translate('availableWord', lang)} ${routesWord}</div>
</div>
<section><p>${escHtml(introText)}</p></section>
${fromSectionHtml}
${toSectionHtml}
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

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${COUNTRY_CSS}`;

  // [THIN-CONTENT-NOINDEX] Same rule as render-city.js — a country with at
  // most one route and no admin-written intro isn't worth indexing on its
  // own; still `follow` so link equity flows through to its route.
  const robotsContent = (locRoutes.length <= 1 && !country.intro_text) ? 'noindex, follow' : 'index, follow';

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
