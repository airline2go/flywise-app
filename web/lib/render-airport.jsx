// Ported from flywise-app/build/render-airport.js — same pattern as
// render-city.jsx.
import { notFound } from 'next/navigation';
import { getAirport, getGeoIndex } from './content-api';
import { localizeCity, localizeAirport } from './geo';
import { translate, format } from './translate';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, pathFor, urlFor, urlsFor } from './languages';
import { JsonLd, homeHref } from './page-shell';

// Ported verbatim from render-airport.js's AIRPORT_CSS constant.
const AIRPORT_CSS = `
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
.airport-traveler-info-section{margin-top:28px}
.airport-traveler-info-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}
.airport-traveler-info-item{margin-bottom:14px}
.airport-traveler-info-item h3{font-size:13px;color:var(--tx2);margin-bottom:4px}
.airport-traveler-info-item p{font-size:13.5px;color:var(--tx);line-height:1.6}
@media (max-width:480px){.airport-route-grid{grid-template-columns:1fr}}
`;

const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR', es: 'es_ES', fr: 'fr_FR', it: 'it_IT', nl: 'nl_NL' };
function OG_LOCALE_FOR(lang) { return OG_LOCALE[lang] || OG_LOCALE.en; }

function buildAirportTitleAndDescription(airport, locRoutes, cityName, lang) {
  const hasLongHaul = locRoutes.some((r) => r.haul_type === 'long-haul');
  if (locRoutes.length === 1) {
    return {
      title: format(translate('airportSingleRouteTitleTemplate', lang), { code: airport.code, city: cityName }),
      description: format(translate('airportSingleRouteDescriptionTemplate', lang), { code: airport.code, city: cityName }),
    };
  }
  if (hasLongHaul) {
    return {
      title: format(translate('airportMixedHaulTitleTemplate', lang), { code: airport.code, city: cityName }),
      description: format(translate('airportMixedHaulDescriptionTemplate', lang), { code: airport.code, city: cityName }),
    };
  }
  return {
    title: format(translate('airportAllRoutesTitleTemplate', lang), { code: airport.code, city: cityName }),
    description: format(translate('airportAllRoutesDescriptionTemplate', lang), { code: airport.code, city: cityName, count: locRoutes.length }),
  };
}

async function loadAirportViewModel(code, lang) {
  const data = await getAirport(code);
  if (!data) return null;
  const { airport, routes } = data;
  const geoIndex = await getGeoIndex();
  const cityName = localizeCity(geoIndex, airport.city, airport.code, lang);
  const airportName = localizeAirport(airport, lang) || airport.code;
  const locRoutes = routes.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(geoIndex, r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(geoIndex, r.destination_city, r.destination_iata, lang),
  }));
  const { title, description } = buildAirportTitleAndDescription(airport, locRoutes, cityName, lang);
  const urls = urlsFor(`airport/${encodeURIComponent(airport.code)}`);
  const url = urls[lang];
  const introText = format(translate('airportIntroTemplate', lang), { code: airport.code, city: cityName });
  return { airport, cityName, airportName, locRoutes, title, description, urls, url, introText };
}

async function buildAirportMetadata(code, lang) {
  const vm = await loadAirportViewModel(code, lang);
  if (!vm) notFound();
  const { title, description, urls, url } = vm;
  const languageAlternates = {};
  LANGUAGES.forEach((l) => { if (urls[l.code]) languageAlternates[l.code] = urls[l.code]; });
  languageAlternates['x-default'] = urls[DEFAULT_LANGUAGE] || urls.en || url;
  const fullTitle = `${title} | Airpiv`;
  return {
    title: fullTitle,
    description,
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

async function AirportPageBody({ code, lang }) {
  const vm = await loadAirportViewModel(code, lang);
  if (!vm) notFound();
  const { airport, cityName, airportName, locRoutes, title, url, introText } = vm;

  const countryHref = airport.country ? urlFor(lang, `country/${encodeURIComponent(airport.country)}`) : null;
  const cityHref = airport.city_slug ? urlFor(lang, `city/${encodeURIComponent(airport.city_slug)}`) : null;

  const fromRoutes = locRoutes.filter((r) => r.origin_iata === airport.code);
  const toRoutes = locRoutes.filter((r) => r.destination_iata === airport.code);

  function haulLabel(r) {
    if (!r.haul_type) return '';
    return r.haul_type === 'long-haul' ? translate('longHaulTag', lang) : translate('shortHaulTag', lang);
  }
  function RouteCard({ r }) {
    const hl = haulLabel(r);
    return (
      <a className="airport-route-card" href={pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}>
        {r.origin_city}<span className="arrow">→</span>{r.destination_city}
        {hl && <span className="haul-tag">{hl}</span>}
      </a>
    );
  }

  // [ROUTE-INTELLIGENCE-3] Optional, admin-authored traveler info — every
  // item independently omitted when null, so an airport with none of
  // these filled in renders exactly as before.
  const travelerInfoItems = [];
  if (airport.distance_to_city_center_km != null) {
    travelerInfoItems.push({
      key: 'distance',
      label: translate('airportDistanceCityCenterLabel', lang),
      value: format(translate('airportDistanceCityCenterValueTemplate', lang), { distance: Number(airport.distance_to_city_center_km).toLocaleString(getLanguage(lang).locale) }),
    });
  }
  if (airport.transit_options) travelerInfoItems.push({ key: 'transit', label: translate('airportTransitOptionsLabel', lang), value: airport.transit_options });
  if (airport.terminal_info) travelerInfoItems.push({ key: 'terminal', label: translate('airportTerminalInfoLabel', lang), value: airport.terminal_info });
  if (airport.traveler_tips) travelerInfoItems.push({ key: 'tips', label: translate('airportTravelerTipsLabel', lang), value: airport.traveler_tips });

  const breadcrumbList = [{ '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') }];
  let pos = 2;
  if (airport.country) breadcrumbList.push({ '@type': 'ListItem', position: pos++, name: airport.country, item: urlFor(lang, `country/${airport.country}`) });
  if (airport.city_slug) breadcrumbList.push({ '@type': 'ListItem', position: pos++, name: cityName, item: urlFor(lang, `city/${airport.city_slug}`) });
  breadcrumbList.push({ '@type': 'ListItem', position: pos, name: airport.code, item: url });

  // [AIRPORT-SCHEMA] ported verbatim.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Airport',
    name: airportName,
    iataCode: airport.code,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
  };
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbList };

  return (
    <>
      <style>{AIRPORT_CSS}</style>
      <JsonLd schema={schema} />
      <JsonLd schema={breadcrumbSchema} />
      <main id="airport-main">
        <div id="airport-content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href={homeHref(lang)}>{translate('homeLabel', lang)}</a><span>›</span>
            {countryHref && (<><a href={countryHref}>{airport.country}</a><span>›</span></>)}
            {cityHref && (<><a href={cityHref}>{cityName}</a><span>›</span></>)}
            <span>{airport.code}</span>
          </nav>
          <h1>{title}</h1>
          <div className="airport-hero">
            <div className="airport-hero-code">{airport.code}</div>
            <div className="airport-hero-city">{cityName}</div>
            <div className="airport-hero-sub">{translate('airportWord', lang)}</div>
            <div className="airport-facts">
              <div className="airport-fact"><div className="airport-fact-val">{locRoutes.length}</div><div className="airport-fact-lbl">{translate('routesLabel', lang)}</div></div>
              <div className="airport-fact"><div className="airport-fact-val">{fromRoutes.length}</div><div className="airport-fact-lbl">{translate('departuresLabel', lang)}</div></div>
              <div className="airport-fact"><div className="airport-fact-val">{toRoutes.length}</div><div className="airport-fact-lbl">{translate('arrivalsLabel', lang)}</div></div>
            </div>
          </div>
          <section><p>{introText}</p></section>
          {travelerInfoItems.length > 0 && (
            <section className="airport-traveler-info-section">
              <h2>{translate('airportTravelerInfoHeading', lang)}</h2>
              {travelerInfoItems.map((item) => (
                <div key={item.key} className="airport-traveler-info-item">
                  <h3>{item.label}</h3>
                  <p>{item.value}</p>
                </div>
              ))}
            </section>
          )}
          {fromRoutes.length > 0 && (
            <section className="airport-routes-section">
              <h2>{translate('departuresFrom', lang)} {airport.code}</h2>
              <div className="airport-route-grid">
                {fromRoutes.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
          {toRoutes.length > 0 && (
            <section className="airport-routes-section">
              <h2>{translate('arrivalsAt', lang)} {airport.code}</h2>
              <div className="airport-route-grid">
                {toRoutes.map((r) => <RouteCard key={r.slug} r={r} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export { buildAirportMetadata, AirportPageBody };
