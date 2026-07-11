// Ported from flywise-app/build/render-country.js — same pattern as
// render-city.jsx (see that file's header comment for the general
// approach: Metadata API instead of hand-built <head> strings, everything
// else translated 1:1 into JSX).
import { notFound } from 'next/navigation';
import { getCountry, getGeoIndex } from './content-api';
import { localizeCity, localizeCountry } from './geo';
import { translate, format } from './translate';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, pathFor, urlFor, urlsFor } from './languages';
import { JsonLd, homeHref } from './page-shell';

// Ported verbatim from render-country.js's COUNTRY_CSS constant.
const COUNTRY_CSS = `
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
`;

const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR', es: 'es_ES', fr: 'fr_FR', it: 'it_IT', nl: 'nl_NL' };
function OG_LOCALE_FOR(lang) { return OG_LOCALE[lang] || OG_LOCALE.en; }

function buildCountryTitleAndDescription(country, locRoutes, countryName, lang) {
  if (locRoutes.length === 1) {
    const r = locRoutes[0];
    const otherCity = r.origin_country === country.code ? r.destination_city : r.origin_city;
    return {
      title: format(translate('countrySingleRouteTitleTemplate', lang), { country: countryName, otherCity }),
      description: format(translate('countrySingleRouteDescriptionTemplate', lang), { country: countryName, otherCity }),
    };
  }
  if (locRoutes.length <= 4) {
    return {
      title: format(translate('countryFewRoutesTitleTemplate', lang), { entity: countryName, count: locRoutes.length }),
      description: format(translate('countryFewRoutesDescriptionTemplate', lang), { entity: countryName, count: locRoutes.length }),
    };
  }
  return {
    title: format(translate('countryManyRoutesTitleTemplate', lang), { country: countryName }),
    description: format(translate('countryManyRoutesDescriptionTemplate', lang), { country: countryName, count: locRoutes.length }),
  };
}

async function loadCountryViewModel(code, lang) {
  const data = await getCountry(code);
  if (!data) return null;
  const { country, routes } = data;
  const geoIndex = await getGeoIndex();
  const countryName = localizeCountry(geoIndex, country.name, country.code, lang);
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(geoIndex, r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(geoIndex, r.destination_city, r.destination_iata, lang),
  }));
  const { title, description } = buildCountryTitleAndDescription(country, locRoutes, countryName, lang);
  const urls = urlsFor(`country/${encodeURIComponent(country.code)}`);
  const url = urls[lang];
  const introText = country.intro_text || format(translate('countryIntroTemplate', lang), { entity: countryName });
  // [THIN-CONTENT-NOINDEX] same rule as city pages.
  const robotsContent = (locRoutes.length <= 1 && !country.intro_text) ? 'noindex, follow' : 'index, follow';
  return { country, countryName, locRoutes, title, description, urls, url, introText, robotsContent };
}

async function buildCountryMetadata(code, lang) {
  const vm = await loadCountryViewModel(code, lang);
  if (!vm) notFound();
  const { title, description, urls, url, robotsContent } = vm;
  const languageAlternates = {};
  LANGUAGES.forEach((l) => { if (urls[l.code]) languageAlternates[l.code] = urls[l.code]; });
  languageAlternates['x-default'] = urls[DEFAULT_LANGUAGE] || urls.en || url;
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

async function CountryPageBody({ code, lang }) {
  const vm = await loadCountryViewModel(code, lang);
  if (!vm) notFound();
  const { country, countryName, locRoutes, title, description, url, introText } = vm;

  const fromRoutes = locRoutes.filter((r) => r.origin_country === country.code);
  const toRoutes = locRoutes.filter((r) => r.destination_country === country.code);
  const routesWord = locRoutes.length === 1 ? translate('routeWordSingular', lang) : translate('routeWordPlural', lang);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') },
      { '@type': 'ListItem', position: 2, name: countryName, item: url },
    ],
  };

  function RouteCard({ r }) {
    return (
      <a className="country-route-card" href={pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}>
        {r.origin_city}<span className="arrow">→</span>{r.destination_city}
      </a>
    );
  }

  return (
    <>
      <style>{COUNTRY_CSS}</style>
      <JsonLd schema={schema} />
      <JsonLd schema={breadcrumbSchema} />
      <main id="country-main">
        <div id="country-content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href={homeHref(lang)}>{translate('homeLabel', lang)}</a><span>›</span>
            <span>{countryName}</span>
          </nav>
          <h1>{title}</h1>
          <div className="country-hero">
            <div className="country-hero-name">✈ {countryName}</div>
            <div className="country-hero-sub">{locRoutes.length} {translate('availableWord', lang)} {routesWord}</div>
          </div>
          <section><p>{introText}</p></section>
          {fromRoutes.length > 0 && (
            <section className="country-routes-section">
              <h2>{translate('flightsFrom', lang)} {countryName}</h2>
              <div className="country-route-grid">
                {fromRoutes.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
          {toRoutes.length > 0 && (
            <section className="country-routes-section">
              <h2>{translate('flightsTo', lang)} {countryName}</h2>
              <div className="country-route-grid">
                {toRoutes.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export { buildCountryMetadata, CountryPageBody };
