// Ported from flywise-app/build/render-city.js. Head-tag construction
// (title/description/canonical/hreflang/OG/robots) moved to the Metadata
// API (buildCityMetadata, consumed via generateMetadata in the page
// files) — everything else (page body markup, JSON-LD schemas, the
// title/description branching logic) is the same logic as the original,
// translated to JSX/a Metadata object instead of HTML-string building.
import { notFound } from 'next/navigation';
import { getCity, getGeoIndex } from './content-api';
import { localizeCity } from './geo';
import { translate, format } from './translate';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, pathFor, urlFor, urlsFor } from './languages';
import { JsonLd, homeHref } from './page-shell';

// Ported verbatim from render-city.js's CITY_CSS constant.
const CITY_CSS = `
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
`;

// Same title/description branching as the original — ported verbatim,
// just returning values instead of assigning into an HTML-string scope.
function buildCityTitleAndDescription(city, locRoutes, cityName, lang) {
  const multiAirport = city.airport_codes && city.airport_codes.length > 1;
  if (locRoutes.length === 1) {
    const r = locRoutes[0];
    const otherCity = r.origin_city_slug === city.city_slug ? r.destination_city : r.origin_city;
    return {
      title: format(translate('citySingleRouteTitleTemplate', lang), { otherCity, city: cityName }),
      description: format(translate('citySingleRouteDescriptionTemplate', lang), { city: cityName, otherCity }),
    };
  }
  if (multiAirport) {
    return {
      title: format(translate('cityMultiAirportTitleTemplate', lang), { city: cityName }),
      description: format(translate('cityMultiAirportDescriptionTemplate', lang), { city: cityName, count: city.airport_codes.length, codes: city.airport_codes.join(', ') }),
    };
  }
  if (locRoutes.length <= 4) {
    return {
      title: format(translate('cityFewRoutesTitleTemplate', lang), { entity: cityName, count: locRoutes.length }),
      description: format(translate('cityFewRoutesDescriptionTemplate', lang), { entity: cityName, count: locRoutes.length }),
    };
  }
  return {
    title: format(translate('cityManyRoutesTitleTemplate', lang), { city: cityName }),
    description: format(translate('cityManyRoutesDescriptionTemplate', lang), { city: cityName, count: locRoutes.length }),
  };
}

// Shared data-fetching + derivation used by both buildCityMetadata() and
// CityPageBody() — fetched once per request (React's fetch memoization
// dedupes the underlying getCity()/getGeoIndex() calls across both).
async function loadCityViewModel(slug, lang) {
  const data = await getCity(slug);
  if (!data) return null;
  const { city, routes } = data;
  const geoIndex = await getGeoIndex();
  const cityName = localizeCity(geoIndex, city.name, city.airport_codes && city.airport_codes[0], lang);
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(geoIndex, r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(geoIndex, r.destination_city, r.destination_iata, lang),
  }));
  const { title, description } = buildCityTitleAndDescription(city, locRoutes, cityName, lang);
  const urls = urlsFor(`city/${encodeURIComponent(city.city_slug)}`);
  const url = urls[lang];
  // [ADMIN-OVERRIDE-ALL-LANGS] intro_text is admin-authored per city, not
  // per language — applies uniformly across all 7 languages.
  const introText = city.intro_text || format(translate('cityIntroTemplate', lang), { entity: cityName });
  // [THIN-CONTENT-NOINDEX] ported verbatim.
  const robotsContent = (locRoutes.length <= 1 && !city.intro_text) ? 'noindex, follow' : 'index, follow';
  return { city, cityName, locRoutes, title, description, urls, url, introText, robotsContent };
}

async function buildCityMetadata(slug, lang) {
  const vm = await loadCityViewModel(slug, lang);
  if (!vm) notFound();
  const { title, description, urls, url, robotsContent } = vm;
  // [X-DEFAULT] Same rule as the original shell.js: default-language URL,
  // falling back to English, falling back to this page's own URL.
  const languageAlternates = {};
  LANGUAGES.forEach((l) => { if (urls[l.code]) languageAlternates[l.code] = urls[l.code]; });
  languageAlternates['x-default'] = urls[DEFAULT_LANGUAGE] || urls.en || url;
  // [TITLE-SUFFIX] The original used the same "{title} | Airpiv" string
  // for both <title> and og:title (shell.js passes one `title` param to
  // both) — match that exactly rather than using the bare title for OG.
  const fullTitle = `${title} | Airpiv`;
  return {
    title: fullTitle,
    description,
    robots: robotsContent,
    alternates: { canonical: url, languages: languageAlternates },
    openGraph: {
      type: 'website',
      siteName: 'Airpiv',
      locale: OG_LOCALE_FOR(lang),
      title: fullTitle,
      description,
      url,
      images: ['https://airpiv.com/og-image.png'],
    },
    twitter: { card: 'summary_large_image', images: ['https://airpiv.com/og-image.png'] },
  };
}

// Matches page-shell.jsx's OG_LOCALE map without importing the whole
// module just for this (keeps this file's metadata path self-contained).
const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR', es: 'es_ES', fr: 'fr_FR', it: 'it_IT', nl: 'nl_NL' };
function OG_LOCALE_FOR(lang) { return OG_LOCALE[lang] || OG_LOCALE.en; }

async function CityPageBody({ slug, lang }) {
  const vm = await loadCityViewModel(slug, lang);
  if (!vm) notFound();
  const { city, cityName, locRoutes, title, description, url, introText } = vm;

  const countryHref = city.country_code ? urlFor(lang, `country/${encodeURIComponent(city.country_code)}`) : null;

  const fromRoutes = locRoutes.filter((r) => r.origin_city_slug === city.city_slug);
  const toRoutes = locRoutes.filter((r) => r.destination_city_slug === city.city_slug);
  const routesWord = locRoutes.length === 1 ? translate('routeWordSingular', lang) : translate('routeWordPlural', lang);

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
  // [STANDALONE-BREADCRUMB] emitted as its own top-level BreadcrumbList
  // JSON-LD block, matching the original (not nested inside WebPage).
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbList };

  function RouteCard({ r }) {
    return (
      <a className="city-route-card" href={pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}>
        {r.origin_city}<span className="arrow">→</span>{r.destination_city}
      </a>
    );
  }

  return (
    <>
      <style>{CITY_CSS}</style>
      <JsonLd schema={schema} />
      <JsonLd schema={breadcrumbSchema} />
      <main id="city-main">
        <div id="city-content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href={homeHref(lang)}>{translate('homeLabel', lang)}</a><span>›</span>
            {countryHref && (<><a href={countryHref}>{city.country_code}</a><span>›</span></>)}
            <span>{cityName}</span>
          </nav>
          <h1>{title}</h1>
          <div className="city-hero">
            <div className="city-hero-name">✈ {cityName}</div>
            <div className="city-hero-sub">{locRoutes.length} {translate('availableWord', lang)} {routesWord}</div>
            {city.airport_codes && city.airport_codes.length > 0 && (
              <div className="city-hero-airports">
                {city.airport_codes.map((a) => (
                  <a key={a} href={pathFor(lang, `airport/${encodeURIComponent(a)}`)} className="city-airport-badge">{a}</a>
                ))}
              </div>
            )}
          </div>
          <section><p>{introText}</p></section>
          {fromRoutes.length > 0 && (
            <section className="city-routes-section">
              <h2>{translate('flightsFrom', lang)} {cityName}</h2>
              <div className="city-route-grid">
                {fromRoutes.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
          {toRoutes.length > 0 && (
            <section className="city-routes-section">
              <h2>{translate('flightsTo', lang)} {cityName}</h2>
              <div className="city-route-grid">
                {toRoutes.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export { buildCityMetadata, CityPageBody, loadCityViewModel };
