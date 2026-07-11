// Ported from flywise-app/build/render-flight-route.js — same pattern as
// render-city.jsx/render-country.jsx/render-airport.jsx/render-airline.jsx,
// with two structural differences:
//
// 1. flight-route.css is a real standalone stylesheet (not a small inline
//    <style> string like the other four entity types), so it's imported
//    as a proper CSS module here instead of embedded as a JS template
//    string — same "proper import so it hoists into <head>" reasoning as
//    RootLayoutChrome.jsx's shared-layout.css.
// 2. The live price/tracking/insights widget genuinely needs to run
//    client-side (real-time Duffel/Redis data — baking a snapshot into
//    the page would go stale within minutes). It's rendered via
//    next/script's documented dangerouslySetInnerHTML + required `id`
//    pattern (see node_modules/next/dist/docs/01-app/02-guides/scripts.md)
//    instead of a raw <script> tag. It never touches title/description/
//    canonical/hreflang/JSON-LD — those are 100% complete before this
//    script ever runs, same guarantee the original had.
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { getRoutePage, listRoutePages, getGeoIndex } from './content-api';
import { localizeCity, getAlternativeAirports } from './geo';
import { translate, format } from './translate';
import { pickVariant } from './content-variants';
import { computeRelatedRoutes } from './related-routes';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, pathFor, urlFor, urlsFor } from './languages';
import { JsonLd, homeHref } from './page-shell';
import '../styles/flight-route.css';

const OG_LOCALE = { de: 'de_DE', en: 'en_GB', ar: 'ar_AR', es: 'es_ES', fr: 'fr_FR', it: 'it_IT', nl: 'nl_NL' };
function OG_LOCALE_FOR(lang) { return OG_LOCALE[lang] || OG_LOCALE.en; }

// [CONTENT-VARIATION-2/3] ported verbatim from render-flight-route.js —
// see that file's header comment for the full rationale (domestic vs
// international branching, carrier-count clause, popularity clause,
// deterministic per-route closing sentence).
function buildDynamicIntro(r, lang) {
  const hasDistance = r.distance_km != null;
  const isLongHaul = r.haul_type === 'long-haul';
  const isDomestic = !!(r.origin_country && r.destination_country && r.origin_country === r.destination_country);
  const distanceStr = hasDistance ? r.distance_km.toLocaleString(getLanguage(lang).locale) : null;

  const openingKey = isDomestic
    ? (isLongHaul ? 'routeIntroOpeningDomesticLongHaul' : 'routeIntroOpeningDomesticShortHaul')
    : (isLongHaul ? 'routeIntroOpeningLongHaul' : 'routeIntroOpeningShortHaul');
  const opening = format(translate(openingKey, lang), { origin: r.origin_city, destination: r.destination_city });

  const distancePhrase = hasDistance
    ? format(translate(isLongHaul ? 'routeIntroDistanceLongHaul' : 'routeIntroDistanceShortHaul', lang), { distance: distanceStr })
    : '';

  const closingVariantKeys = isLongHaul
    ? ['routeIntroClosingLongHaul', 'routeIntroClosingLongHaulV2']
    : ['routeIntroClosingShortHaul', 'routeIntroClosingShortHaulV2'];
  const closing = translate(closingVariantKeys[pickVariant(r.slug, closingVariantKeys.length)], lang);

  let carrierClause = '';
  if (r.airline_count != null && r.airline_count > 0) {
    carrierClause = r.airline_count === 1
      ? translate('routeIntroCarrierSingle', lang)
      : format(translate('routeIntroCarrierMulti', lang), { count: r.airline_count });
  }

  const popularClause = r.route_score_confidence === 'high' ? translate('routeIntroPopular', lang) : '';

  return opening + distancePhrase + closing + carrierClause + popularClause;
}

function formatHoursMinutes(min, lang) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + translate('hoursAbbrev', lang) + (m > 0 ? ` ${m}${translate('minutesAbbrev', lang)}` : '');
}

// Ported verbatim (minus escHtml — JSX escapes text nodes automatically,
// so the FAQ items built here are plain strings, safe both as JSX
// children and as JSON-LD values via jsonLdSafeString).
function buildFaqItems(route, lang, geoIndex) {
  const haulQuestion = route.distance_km != null
    ? {
      question: format(translate('routeFaqDistanceQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: format(translate(route.haul_type === 'long-haul' ? 'routeFaqDistanceAnswerLongHaul' : 'routeFaqDistanceAnswerShortHaul', lang), { distance: route.distance_km.toLocaleString(getLanguage(lang).locale) }),
    }
    : {
      question: format(translate('routeFaqAirportQuestion', lang), { destination: route.destination_city }),
      answer: format(translate('routeFaqAirportAnswer', lang), { destCode: route.destination_iata }),
    };
  const bestTimeFaqItem = route.distance_km != null
    ? {
      question: format(translate('routeFaqBestTimeQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: translate(route.haul_type === 'long-haul' ? 'routeFaqBestTimeAnswerLongHaul' : 'routeFaqBestTimeAnswerShortHaul', lang),
    }
    : {
      question: format(translate('routeFaqCheapestQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: translate('routeFaqCheapestAnswer', lang),
    };

  const items = [bestTimeFaqItem, haulQuestion];

  if (route.avg_duration_min != null) {
    const directLineKey = route.all_direct ? 'allFlightsDirect' : (route.direct_flight_available ? 'directFlightsAvailable' : 'noDirectFlights');
    items.push({
      question: format(translate('routeDurationFaqQuestionTemplate', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: format(translate('routeDurationFaqAnswerTemplate', lang), { duration: formatHoursMinutes(route.avg_duration_min, lang), directLine: translate(directLineKey, lang) }),
    });
  }

  if (route.airline_count != null && route.airline_count > 0) {
    items.push({
      question: format(translate('routeFaqAirlineQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: route.airline_count === 1
        ? translate('routeFaqAirlineAnswerSingle', lang)
        : format(translate('routeFaqAirlineAnswerMulti', lang), { count: route.airline_count }),
    });
  }

  if (route.direct_flight_available != null) {
    const directLineKey = route.all_direct ? 'allFlightsDirect' : (route.direct_flight_available ? 'directFlightsAvailable' : 'noDirectFlights');
    items.push({
      question: format(translate('routeFaqDirectQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: translate(directLineKey, lang),
    });
  }

  const altAirports = getAlternativeAirports(geoIndex, route.destination_city, route.destination_iata, lang);
  if (altAirports.length) {
    items.push({
      question: format(translate('routeFaqAltAirportsQuestion', lang), { destination: route.destination_city }),
      answer: format(translate('routeFaqAltAirportsAnswer', lang), { destination: route.destination_city, airports: altAirports.join(', ') }),
    });
  }

  if (route.custom_faq && route.custom_faq.length) return route.custom_faq;
  return items;
}

function buildRouteTitleAndDescription(route, lang) {
  const title = route.custom_title || format(translate('routeTitleTemplate', lang), { origin: route.origin_city, destination: route.destination_city });
  const description = route.custom_meta_description || format(translate('routeDescriptionTemplate', lang), { origin: route.origin_city, originCode: route.origin_iata, destination: route.destination_city, destCode: route.destination_iata });
  return { title, description };
}

async function loadRouteViewModel(slug, lang) {
  const routeRaw = await getRoutePage(slug);
  if (!routeRaw) return null;
  const geoIndex = await getGeoIndex();

  const route = Object.assign({}, routeRaw, {
    origin_city: localizeCity(geoIndex, routeRaw.origin_city, routeRaw.origin_iata, lang),
    destination_city: localizeCity(geoIndex, routeRaw.destination_city, routeRaw.destination_iata, lang),
  });

  const { title, description } = buildRouteTitleAndDescription(route, lang);
  const urls = urlsFor(`flights/${encodeURIComponent(route.slug)}`);
  const url = urls[lang];
  const introText = route.intro_text || buildDynamicIntro(route, lang);
  const bookingUrl = `/search/${encodeURIComponent(route.origin_iata)}-${encodeURIComponent(route.destination_iata)}`;

  // [ROUTE-INTELLIGENCE-3] computeRelatedRoutes() runs on the raw
  // (unlocalized) route + full route list — same as generate-pages.js's
  // orchestration — then each candidate is localized here, matching the
  // original's per-item localizeCity() calls inside the render function.
  const allRoutes = await listRoutePages();
  const relatedRaw = computeRelatedRoutes(routeRaw, allRoutes);
  const relatedRoutes = relatedRaw.map((r) => Object.assign({}, r, {
    origin_city: localizeCity(geoIndex, r.origin_city, r.origin_iata, lang),
    destination_city: localizeCity(geoIndex, r.destination_city, r.destination_iata, lang),
  }));

  const altAirports = getAlternativeAirports(geoIndex, route.destination_city, route.destination_iata, lang);
  const faqItems = buildFaqItems(route, lang, geoIndex);

  return { route, title, description, urls, url, introText, bookingUrl, relatedRoutes, altAirports, faqItems };
}

async function buildFlightRouteMetadata(slug, lang) {
  const vm = await loadRouteViewModel(slug, lang);
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

// [CONTENT-VARIATION-3] ported verbatim from buildBestTimeHtml() — now a
// JSX-returning function instead of a raw HTML-string builder (JSX
// escapes text nodes automatically, so the explicit escHtml() calls the
// original needed are no longer necessary).
function BestTimeSection({ route, lang }) {
  if (route.distance_km == null) return null;
  const isLongHaul = route.haul_type === 'long-haul';
  const isDomestic = !!(route.origin_country && route.destination_country && route.origin_country === route.destination_country);
  const bodyKey = isDomestic
    ? (isLongHaul ? 'routeBestTimeBodyDomesticLongHaul' : 'routeBestTimeBodyDomesticShortHaul')
    : (isLongHaul ? 'routeBestTimeBodyLongHaul' : 'routeBestTimeBodyShortHaul');
  const body = format(translate(bodyKey, lang), { origin: route.origin_city, destination: route.destination_city });
  const bookingWindow = translate(isLongHaul ? 'routeBestTimeWindowLongHaul' : 'routeBestTimeWindowShortHaul', lang);

  let tip = '';
  if (route.all_direct === true) tip = translate('routeBestTimeTipDirect', lang);
  else if (route.direct_flight_available === false) tip = translate('routeBestTimeTipConnecting', lang);
  else if (route.direct_flight_available === true) tip = translate('routeBestTimeTipMixed', lang);

  const closingKeys = ['routeBestTimeClosingV1', 'routeBestTimeClosingV2'];
  const closing = translate(closingKeys[pickVariant(`${route.slug}:bt`, closingKeys.length)], lang);

  return (
    <section className="route-besttime-section">
      <h2>{translate('routeBestTimeHeading', lang)}</h2>
      <div className="route-booking-window">
        <span className="route-booking-window-lbl">{translate('routeBestTimeBookingWindowLabel', lang)}</span>
        <span className="route-booking-window-val">{bookingWindow}</span>
      </div>
      <p>{body}{tip ? ` ${tip}` : ''} {closing}</p>
    </section>
  );
}

const RELATED_REASON_KEYS = {
  popularWithTravelers: 'relatedReasonPopular',
  moreFlightOptions: 'relatedReasonMoreFlights',
  similarTripLength: 'relatedReasonSimilarTrip',
  sameRegion: 'relatedReasonSameRegion',
};

// [LIVE-PRICE-WIDGET] ported verbatim from buildLiveScript() — the price
// box, "prices checked today" trust signal, and average-duration insights
// are genuinely live data from Duffel/Redis. Every translated string is
// still resolved at request time via translate()/format() and baked into
// the script as a literal; only a live price, a "minutes ago" count, and
// a computed duration are resolved in the browser.
function buildLiveScript(route, lang) {
  return `(function(){
var PROXY = 'https://api.airpiv.com';
function sendRouteTrack(eventType) {
  try {
    var payload = JSON.stringify({ event_type: eventType, route_slug: ${JSON.stringify(route.slug)}, origin_iata: ${JSON.stringify(route.origin_iata)}, destination_iata: ${JSON.stringify(route.destination_iata)}, language: ${JSON.stringify(lang)} });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(PROXY + '/track/route-page', new Blob([payload], { type: 'text/plain' }));
    } else {
      fetch(PROXY + '/track/route-page', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: payload });
    }
  } catch (e) {}
}
sendRouteTrack('impression');
var routeCtaEl = document.querySelector('.route-cta');
if (routeCtaEl) routeCtaEl.addEventListener('click', function () {
  try { sessionStorage.setItem('fw_route_ref', JSON.stringify({ slug: ${JSON.stringify(route.slug)}, origin: ${JSON.stringify(route.origin_iata)}, destination: ${JSON.stringify(route.destination_iata)}, lang: ${JSON.stringify(lang)} })); } catch (e) {}
  sendRouteTrack('click');
});

fetch(PROXY + '/route-price?from=' + encodeURIComponent(${JSON.stringify(route.origin_iata)}) + '&to=' + encodeURIComponent(${JSON.stringify(route.destination_iata)}))
  .then(function(r){ return r.json(); })
  .then(function(j){
    var box = document.getElementById('route-price-box');
    if (j.ok && j.price != null) {
      var priceTpl = ${JSON.stringify(translate('priceFromTemplate', lang))};
      box.innerHTML = '<div class="route-price-val">' + priceTpl.replace('{price}', j.price.toFixed(0)) + '</div><div class="route-price-lbl">${translate('priceLabel', lang)}</div>';
      if (j.departure_date) {
        var ctaLink = document.querySelector('.route-cta');
        if (ctaLink) ctaLink.href = ctaLink.getAttribute('href') + '?depart=' + encodeURIComponent(j.departure_date);
      }
    } else {
      box.innerHTML = '<div style="color:rgba(255,255,255,.5);font-size:13px">${translate('priceUnavailable', lang)}</div>';
    }
    var trustEl = document.getElementById('route-trust-signal');
    if (trustEl && j.ok && j.checksToday != null && j.checkedAt) {
      var minutesAgo = Math.max(0, Math.round((Date.now() - new Date(j.checkedAt).getTime()) / 60000));
      var agoText = minutesAgo < 1 ? ${JSON.stringify(translate('justNow', lang))} : (minutesAgo === 1 ? ${JSON.stringify(translate('updatedOneMinuteAgo', lang))} : ${JSON.stringify(translate('updatedMinutesAgoTemplate', lang))}.replace('{min}', minutesAgo));
      trustEl.innerHTML = '<span>✓ ' + j.checksToday + ' ${translate('pricesCheckedTodaySuffix', lang)}</span><span>· ${translate('lastUpdatedLabel', lang)} ' + agoText + '</span>';
      trustEl.style.display = '';
    }
    if (j.ok && j.insights) {
      var ins = j.insights;
      function fmtHrsMin(min) { var h = Math.floor(min / 60), m = min % 60; return h + '${translate('hoursAbbrev', lang)}' + (m > 0 ? ' ' + m + '${translate('minutesAbbrev', lang)}' : ''); }
      var directLine = ins.allDirect
        ? ${JSON.stringify(translate('allFlightsDirect', lang))}
        : (ins.directAvailable ? ${JSON.stringify(translate('directFlightsAvailable', lang))} : ${JSON.stringify(translate('noDirectFlights', lang))});
      var airlinesLine = ins.airlines.length ? (${JSON.stringify(translate('airlinesFlyingThisRoute', lang))} + ' ' + ins.airlines.join(', ') + '.') : '';
      var insightsHtml = '<section class="route-insights-section"><h2>${translate('flightDataForThisRoute', lang)}</h2><div class="route-insights-grid">' +
        '<div class="route-insight-card"><div class="route-insight-val">' + fmtHrsMin(ins.avgDurationMin) + '</div><div class="route-insight-lbl">${translate('averageTotalTravelTime', lang)}</div></div>' +
        '<div class="route-insight-card"><div class="route-insight-val">' + fmtHrsMin(ins.minDurationMin) + '</div><div class="route-insight-lbl">${translate('shortestFlightTimeFound', lang)}</div></div>' +
      '</div><p style="margin-top:10px">' + directLine + (airlinesLine ? ' ' + airlinesLine : '') + '</p></section>';
      var insightsTarget = document.getElementById('route-insights-section');
      if (insightsTarget) insightsTarget.outerHTML = insightsHtml;
    }
  })
  .catch(function(){
    document.getElementById('route-price-box').innerHTML = '<div style="color:rgba(255,255,255,.5);font-size:13px">${translate('priceUnavailable', lang)}</div>';
  });
try { if (typeof gtag === 'function') gtag('event', 'route_page_view', { origin: ${JSON.stringify(route.origin_iata)}, destination: ${JSON.stringify(route.destination_iata)}, slug: ${JSON.stringify(route.slug)} }); } catch (e) {}
})();`;
}

async function FlightRoutePageBody({ slug, lang }) {
  const vm = await loadRouteViewModel(slug, lang);
  if (!vm) notFound();
  const { route, title, description, url, introText, bookingUrl, relatedRoutes, altAirports, faqItems } = vm;

  const breadcrumbItems = [{ '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') }];
  let bcPos = 2;
  if (route.destination_country) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_country, item: urlFor(lang, `country/${encodeURIComponent(route.destination_country)}`) });
  if (route.destination_city_slug) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_city, item: urlFor(lang, `city/${encodeURIComponent(route.destination_city_slug)}`) });
  breadcrumbItems.push({ '@type': 'ListItem', position: bcPos, name: `${route.origin_city} → ${route.destination_city}`, item: url });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: getLanguage(lang).locale,
    availableLanguage: LANGUAGES.map((l) => l.locale),
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    },
  };
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems };
  // [FLIGHT-SCHEMA] schema.org Flight — structured departure/arrival
  // airport pair, in addition to the generic WebPage/FAQPage/BreadcrumbList
  // schemas above.
  const flightSchema = {
    '@context': 'https://schema.org',
    '@type': 'Flight',
    departureAirport: { '@type': 'Airport', iataCode: route.origin_iata, name: route.origin_city },
    arrivalAirport: { '@type': 'Airport', iataCode: route.destination_iata, name: route.destination_city },
  };

  let distanceInfo = null;
  if (route.distance_km != null) {
    const haulLabel = route.haul_type === 'long-haul' ? translate('longHaulFlightLabel', lang) : translate('shortHaulFlightLabel', lang);
    distanceInfo = `📏 ${route.distance_km.toLocaleString(getLanguage(lang).locale)} km · ${haulLabel}`;
  }

  return (
    <>
      <JsonLd schema={schema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={flightSchema} />
      <main id="route-main">
        <div id="route-content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href={homeHref(lang)}>{translate('homeLabel', lang)}</a><span>›</span>
            {route.destination_country && (
              <>
                <a href={pathFor(lang, `country/${encodeURIComponent(route.destination_country)}`)}>{route.destination_country}</a><span>›</span>
              </>
            )}
            {route.destination_city_slug && (
              <>
                <a href={pathFor(lang, `city/${encodeURIComponent(route.destination_city_slug)}`)}>{route.destination_city}</a><span>›</span>
              </>
            )}
            <span>{route.origin_city} → {route.destination_city}</span>
          </nav>
          <h1>{title}</h1>
          <div className="route-hero">
            <div className="route-hero-cities">
              <span>{route.origin_city}</span>
              <span className="route-hero-arrow">✈</span>
              <span>{route.destination_city}</span>
            </div>
            {distanceInfo && <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 6 }}>{distanceInfo}</div>}
            <div className="route-price-box" id="route-price-box">
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>{translate('loadingPrice', lang)}</div>
            </div>
            <div className="route-trust-signal" id="route-trust-signal" style={{ display: 'none' }} />
            <a href={bookingUrl} className="route-cta">{translate('searchFlightsNow', lang)}</a>
          </div>
          <section><p>{introText}</p></section>
          <BestTimeSection route={route} lang={lang} />
          <section className="airport-info-section">
            <h2>{translate('airportInformation', lang)}</h2>
            <div className="airport-info-grid">
              <a className="airport-info-card" href={pathFor(lang, `airport/${encodeURIComponent(route.origin_iata)}`)}>
                <span className="airport-info-code">{route.origin_iata}</span>
                <span className="airport-info-city">{route.origin_city}</span>
              </a>
              <a className="airport-info-card" href={pathFor(lang, `airport/${encodeURIComponent(route.destination_iata)}`)}>
                <span className="airport-info-code">{route.destination_iata}</span>
                <span className="airport-info-city">{route.destination_city}</span>
              </a>
            </div>
          </section>
          {altAirports.length > 0 && (
            <section className="airport-info-section">
              <h2>{translate('alternativeAirportsIn', lang)} {route.destination_city}</h2>
              <div className="airport-info-grid">
                {altAirports.map((code) => (
                  <a key={code} className="airport-info-card" href={pathFor(lang, `airport/${encodeURIComponent(code)}`)}>
                    <span className="airport-info-code">{code}</span>
                    <span className="airport-info-city">{route.destination_city}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
          <section id="route-insights-section" />
          <section className="route-faq">
            <h2>{translate('frequentlyAskedQuestions', lang)}</h2>
            {faqItems.map((f, i) => (
              <div className="route-faq-item" key={i}>
                <div className="route-faq-q">{f.question}</div>
                <div className="route-faq-a">{f.answer}</div>
              </div>
            ))}
          </section>
          {relatedRoutes.length > 0 && (
            <section id="related-routes-section">
              <h2>{translate('similarFlightRoutes', lang)}</h2>
              <div className="related-routes-grid">
                {relatedRoutes.map((r) => {
                  const reasonTranslationKey = r.reasonKey && RELATED_REASON_KEYS[r.reasonKey];
                  return (
                    <a key={r.slug} className="related-route-card" href={pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}>
                      {r.origin_city} → {r.destination_city}
                      {reasonTranslationKey && <span className="related-route-reason">{translate(reasonTranslationKey, lang)}</span>}
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
      <Script id={`route-live-${route.slug}-${lang}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: buildLiveScript(route, lang) }} />
    </>
  );
}

export { buildFlightRouteMetadata, FlightRoutePageBody };
