// Ported from flywise-app/build/render-airline.js — same pattern as
// render-city.jsx.
import { notFound } from 'next/navigation';
import { getAirline, getGeoIndex } from './content-api';
import { localizeCity } from './geo';
import { translate, format } from './translate';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, pathFor, urlFor, urlsFor } from './languages';
import { JsonLd, homeHref } from './page-shell';

// Ported verbatim from render-airline.js's AIRLINE_CSS constant.
const AIRLINE_CSS = `
.airline-hero{background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:18px;padding:32px 24px;margin:24px 0;text-align:center}
.airline-hero-name{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:#fff}
.airline-hero-code{color:var(--teal);font-size:13px;font-weight:700;letter-spacing:.04em;margin-top:4px;font-family:monospace}
.airline-hero-sub{color:rgba(255,255,255,.55);font-size:13px;margin-top:6px}
.breadcrumb{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--tx3);margin-bottom:14px;flex-wrap:wrap}
.breadcrumb a{color:var(--teal);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.airline-routes-section{margin-top:28px}
.airline-routes-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.airline-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.airline-route-card{display:block;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:13px 15px;font-size:13.5px;font-weight:600;color:var(--tx);text-decoration:none}
.airline-route-card:hover{border-color:var(--teal)}
.airline-route-card .arrow{color:var(--teal);margin:0 4px}
.airline-hub-badge{display:inline-flex;align-items:center;gap:5px;margin-top:10px;background:rgba(15,181,160,.15);border:1px solid rgba(15,181,160,.3);color:var(--teal);font-size:12px;font-weight:700;border-radius:8px;padding:5px 12px;text-decoration:none}
@media (max-width:480px){.airline-route-grid{grid-template-columns:1fr}}
`;

const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR', es: 'es_ES', fr: 'fr_FR', it: 'it_IT', nl: 'nl_NL' };
function OG_LOCALE_FOR(lang) { return OG_LOCALE[lang] || OG_LOCALE.en; }

function buildAirlineTitleAndDescription(airline, locRoutes, lang) {
  if (locRoutes.length === 1) {
    const r = locRoutes[0];
    return {
      title: format(translate('airlineSingleRouteTitleTemplate', lang), { airline: airline.name, otherCity: r.origin_city, otherCity2: r.destination_city }),
      description: format(translate('airlineSingleRouteDescriptionTemplate', lang), { airline: airline.name, otherCity: r.origin_city, otherCity2: r.destination_city }),
    };
  }
  return {
    title: format(translate('airlineManyRoutesTitleTemplate', lang), { airline: airline.name, count: locRoutes.length }),
    description: format(translate('airlineManyRoutesDescriptionTemplate', lang), { airline: airline.name, count: locRoutes.length }),
  };
}

async function loadAirlineViewModel(code, lang) {
  const data = await getAirline(code);
  if (!data) return null;
  const { airline, routes, mostUsedRoutes } = data;
  const geoIndex = await getGeoIndex();
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(geoIndex, r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(geoIndex, r.destination_city, r.destination_iata, lang),
  }));
  const locMostUsed = (mostUsedRoutes || []).map((r) => Object.assign({}, r, {
    origin_city: localizeCity(geoIndex, r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(geoIndex, r.destination_city, r.destination_iata, lang),
  }));
  const { title, description } = buildAirlineTitleAndDescription(airline, locRoutes, lang);
  const urls = urlsFor(`airline/${encodeURIComponent(airline.iata_code)}`);
  const url = urls[lang];
  const introText = airline.intro_text || format(translate('airlineIntroTemplate', lang), { airline: airline.name });
  // [THIN-CONTENT-NOINDEX] same rule as city/country pages.
  const robotsContent = (locRoutes.length <= 1 && !airline.intro_text) ? 'noindex, follow' : 'index, follow';
  return { airline, locRoutes, locMostUsed, title, description, urls, url, introText, robotsContent };
}

async function buildAirlineMetadata(code, lang) {
  const vm = await loadAirlineViewModel(code, lang);
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

async function AirlinePageBody({ code, lang }) {
  const vm = await loadAirlineViewModel(code, lang);
  if (!vm) notFound();
  const { airline, locRoutes, locMostUsed, title, url, introText } = vm;

  function RouteCard({ r }) {
    return (
      <a className="airline-route-card" href={pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}>
        {r.origin_city}<span className="arrow">→</span>{r.destination_city}
      </a>
    );
  }

  // Only worth a separate "most flown" highlight when it's a genuine
  // curated subset of a longer full list.
  const showMostUsed = locMostUsed.length > 0 && locRoutes.length > locMostUsed.length;

  const breadcrumbList = [
    { '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') },
    { '@type': 'ListItem', position: 2, name: airline.name, item: url },
  ];
  // [AIRLINE-SCHEMA] ported verbatim — a genuine schema.org Airline
  // subtype of Organization.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Airline',
    name: airline.name,
    iataCode: airline.iata_code,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbList };

  return (
    <>
      <style>{AIRLINE_CSS}</style>
      <JsonLd schema={schema} />
      <JsonLd schema={breadcrumbSchema} />
      <main id="airline-main">
        <div id="airline-content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href={homeHref(lang)}>{translate('homeLabel', lang)}</a><span>›</span>
            <span>{airline.name}</span>
          </nav>
          <h1>{title}</h1>
          <div className="airline-hero">
            <div className="airline-hero-name">{airline.name}</div>
            <div className="airline-hero-code">{airline.iata_code}</div>
            <div className="airline-hero-sub">{translate('airlineWord', lang)}</div>
            {airline.hubAirport && (
              <a className="airline-hub-badge" href={pathFor(lang, `airport/${encodeURIComponent(airline.hubAirport)}`)}>
                ✈ {translate('airlineHubLabel', lang)}: {airline.hubAirport}
              </a>
            )}
          </div>
          <section><p>{introText}</p></section>
          {showMostUsed && (
            <section className="airline-routes-section">
              <h2>{translate('airlineMostFlownRoutesLabel', lang)}</h2>
              <div className="airline-route-grid">
                {locMostUsed.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
          {locRoutes.length > 0 && (
            <section className="airline-routes-section">
              <h2>{translate('routesLabel', lang)}</h2>
              <div className="airline-route-grid">
                {locRoutes.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export { buildAirlineMetadata, AirlinePageBody };
