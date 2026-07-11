const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity, getAlternativeAirports } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');

// [BUG-FIX] The original flight-route.html wrote its JSON-LD schema TWICE —
// a second, dead write unconditionally clobbered the first with a generic
// hardcoded 2-question FAQ, discarding the real dynamic FAQ/custom_faq data.
// This generator writes it once, correctly, with the real FAQ items.

function buildDynamicIntro(r, lang) {
  const hasDistance = r.distance_km != null;
  const isLongHaul = r.haul_type === 'long-haul';
  const distanceStr = hasDistance ? r.distance_km.toLocaleString(getLanguage(lang).locale) : null;
  const opening = format(translate(isLongHaul ? 'routeIntroOpeningLongHaul' : 'routeIntroOpeningShortHaul', lang), { origin: r.origin_city, destination: r.destination_city });
  const distancePhrase = hasDistance
    ? format(translate(isLongHaul ? 'routeIntroDistanceLongHaul' : 'routeIntroDistanceShortHaul', lang), { distance: distanceStr })
    : '';
  const closing = translate(isLongHaul ? 'routeIntroClosingLongHaul' : 'routeIntroClosingShortHaul', lang);
  return opening + distancePhrase + closing;
}

function buildFaqItems(route, lang) {
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
  if (route.custom_faq && route.custom_faq.length) return route.custom_faq;
  return [bestTimeFaqItem, haulQuestion];
}

function buildBestTimeHtml(route, lang) {
  if (route.distance_km == null) return '';
  const isLongHaul = route.haul_type === 'long-haul';
  const body = format(translate(isLongHaul ? 'routeBestTimeBodyLongHaul' : 'routeBestTimeBodyShortHaul', lang), { origin: escHtml(route.origin_city), destination: escHtml(route.destination_city) });
  const bookingWindow = translate(isLongHaul ? 'routeBestTimeWindowLongHaul' : 'routeBestTimeWindowShortHaul', lang);
  return `<section class="route-besttime-section"><h2>${translate('routeBestTimeHeading', lang)}</h2>` +
    `<div class="route-booking-window"><span class="route-booking-window-lbl">${translate('routeBestTimeBookingWindowLabel', lang)}</span><span class="route-booking-window-val">${bookingWindow}</span></div>` +
    `<p>${body}</p></section>`;
}

// Organization schema is now injected uniformly for every page by shell.js's
// renderShell() — no longer duplicated per render-*.js file.
const ROUTE_HEAD_EXTRA_STATIC = `<link rel="stylesheet" href="/flight-route.css">`;

// [LIVE-PRICE-WIDGET] The price box, "prices checked today" trust signal,
// and average-duration insights are genuinely live data from Duffel/Redis —
// baking a snapshot of these into a "static" page would go stale within
// minutes and actively mislead customers on price, which is worse than the
// current behavior. These stay as a small, isolated client-side enhancement
// — unlike the old anti-pattern, they never touch title/description/
// canonical/hreflang/JSON-LD; those are 100% real and complete before this
// script ever runs. The 4th (duration-derived) FAQ question appends
// visually only — it does not rewrite the already-valid JSON-LD written at
// build time, avoiding any runtime structured-data mutation.
//
// Every translated string used here is resolved at BUILD time via
// translate()/format() and baked into the generated script as a literal —
// the only genuinely runtime-only pieces (a live price, a "minutes ago"
// count, a computed duration) use a `{placeholder}`.replace(...) at the
// JS level against an already-translated template string.
function buildLiveScript(route, lang) {
  return `<script>
(function(){
var PROXY = 'https://api.airpiv.com';
function escHtml(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
// [ROUTE-SCORE-4A] First-party impression/click tracking — fire-and-forget,
// never affects page behavior if it fails. sendBeacon (with a text/plain
// Blob, not JSON) is preferred so a click that immediately navigates away
// doesn't abort a plain fetch mid-flight; text/plain also avoids a CORS
// preflight that sendBeacon can't reliably complete before unload.
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
  // Hands the originating route page off to app.js's prefillSearchFromUrl(),
  // which reads this (once) to attribute the resulting booking_start signal
  // back to this specific route page/language — no URL or search-flow
  // change involved, purely an in-memory relay for tracking.
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
      var faqSection = document.querySelector('.route-faq');
      if (faqSection && !faqSection.dataset.durationFaqAdded) {
        var durationFaqHtml = '<div class="route-faq-item"><div class="route-faq-q">${escHtml(format(translate('routeDurationFaqQuestionTemplate', lang), { origin: route.origin_city, destination: route.destination_city }))}</div><div class="route-faq-a">' + ${JSON.stringify(translate('routeDurationFaqAnswerTemplate', lang))}.replace('{duration}', fmtHrsMin(ins.avgDurationMin)).replace('{directLine}', directLine) + '</div></div>';
        faqSection.insertAdjacentHTML('beforeend', durationFaqHtml);
        faqSection.dataset.durationFaqAdded = '1';
      }
    }
  })
  .catch(function(){
    document.getElementById('route-price-box').innerHTML = '<div style="color:rgba(255,255,255,.5);font-size:13px">${translate('priceUnavailable', lang)}</div>';
  });
try { if (typeof gtag === 'function') gtag('event', 'route_page_view', { origin: ${JSON.stringify(route.origin_iata)}, destination: ${JSON.stringify(route.destination_iata)}, slug: ${JSON.stringify(route.slug)} }); } catch (e) {}
})();
</script>`;
}

function renderFlightRoutePage(routeRaw, lang, relatedRoutes) {
  const route = Object.assign({}, routeRaw, {
    origin_city: localizeCity(routeRaw.origin_city, routeRaw.origin_iata, lang),
    destination_city: localizeCity(routeRaw.destination_city, routeRaw.destination_iata, lang),
  });

  // [ADMIN-OVERRIDE-ALL-LANGS] custom_title/custom_meta_description/intro_text
  // are admin-authored per route (not per language) — they used to only
  // apply when lang===DEFAULT_LANGUAGE, silently no-op-ing for the other 6
  // languages while custom_faq (below) already applied uniformly. Now
  // consistent: an admin override always wins over the generated template,
  // regardless of language.
  const title = route.custom_title || format(translate('routeTitleTemplate', lang), { origin: route.origin_city, destination: route.destination_city });
  const description = route.custom_meta_description || format(translate('routeDescriptionTemplate', lang), { origin: route.origin_city, originCode: route.origin_iata, destination: route.destination_city, destCode: route.destination_iata });

  const urls = urlsFor(`flights/${encodeURIComponent(route.slug)}`);
  const url = urls[lang];
  const introText = route.intro_text || buildDynamicIntro(route, lang);
  const bookingUrl = `/search/${encodeURIComponent(route.origin_iata)}-${encodeURIComponent(route.destination_iata)}`;

  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span>`;
  if (route.destination_country) breadcrumbHtml += `<a href="${urlFor(lang, `country/${encodeURIComponent(route.destination_country)}`)}">${escHtml(route.destination_country)}</a><span>›</span>`;
  if (route.destination_city_slug) breadcrumbHtml += `<a href="${urlFor(lang, `city/${encodeURIComponent(route.destination_city_slug)}`)}">${escHtml(route.destination_city)}</a><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(route.origin_city)} → ${escHtml(route.destination_city)}</span></nav>`;

  const breadcrumbItems = [{ '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') }];
  let bcPos = 2;
  if (route.destination_country) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_country, item: urlFor(lang, `country/${encodeURIComponent(route.destination_country)}`) });
  if (route.destination_city_slug) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_city, item: urlFor(lang, `city/${encodeURIComponent(route.destination_city_slug)}`) });
  breadcrumbItems.push({ '@type': 'ListItem', position: bcPos, name: `${route.origin_city} → ${route.destination_city}`, item: url });

  const airportInfoHtml = `<section class="airport-info-section"><h2>${translate('airportInformation', lang)}</h2><div class="airport-info-grid">` +
    `<a class="airport-info-card" href="${pathFor(lang, `airport/${encodeURIComponent(route.origin_iata)}`)}"><span class="airport-info-code">${escHtml(route.origin_iata)}</span><span class="airport-info-city">${escHtml(route.origin_city)}</span></a>` +
    `<a class="airport-info-card" href="${pathFor(lang, `airport/${encodeURIComponent(route.destination_iata)}`)}"><span class="airport-info-code">${escHtml(route.destination_iata)}</span><span class="airport-info-city">${escHtml(route.destination_city)}</span></a>` +
    `</div></section>`;

  const altAirports = getAlternativeAirports(route.destination_city, route.destination_iata, lang);
  const altAirportsHtml = altAirports.length
    ? `<section class="airport-info-section"><h2>${translate('alternativeAirportsIn', lang)} ${escHtml(route.destination_city)}</h2><div class="airport-info-grid">${altAirports.map((code) => `<a class="airport-info-card" href="${pathFor(lang, `airport/${encodeURIComponent(code)}`)}"><span class="airport-info-code">${escHtml(code)}</span><span class="airport-info-city">${escHtml(route.destination_city)}</span></a>`).join('')}</div></section>`
    : '';

  let distanceHtml = '';
  if (route.distance_km != null) {
    const haulLabel = route.haul_type === 'long-haul' ? translate('longHaulFlightLabel', lang) : translate('shortHaulFlightLabel', lang);
    distanceHtml = `<div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:6px">📏 ${route.distance_km.toLocaleString(getLanguage(lang).locale)} km · ${haulLabel}</div>`;
  }

  const relatedRoutesHtml = (relatedRoutes && relatedRoutes.length)
    ? `<section id="related-routes-section"><h2>${translate('similarFlightRoutes', lang)}</h2><div class="related-routes-grid">${relatedRoutes.map((r) => {
      const oCity = localizeCity(r.origin_city, r.origin_iata, lang);
      const dCity = localizeCity(r.destination_city, r.destination_iata, lang);
      return `<a class="related-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">${escHtml(oCity)} → ${escHtml(dCity)}</a>`;
    }).join('')}</div></section>`
    : '';

  const bestTimeHtml = buildBestTimeHtml(route, lang);
  const faqItems = buildFaqItems(route, lang);
  const faqHtml = faqItems.map((f) => `<div class="route-faq-item"><div class="route-faq-q">${escHtml(f.question)}</div><div class="route-faq-a">${escHtml(f.answer)}</div></div>`).join('');

  const mainContent = `<main id="route-main">
  <div id="route-content">
${breadcrumbHtml}
<h1>${escHtml(title)}</h1>
<div class="route-hero">
  <div class="route-hero-cities">
    <span>${escHtml(route.origin_city)}</span>
    <span class="route-hero-arrow">✈</span>
    <span>${escHtml(route.destination_city)}</span>
  </div>
  ${distanceHtml}
  <div class="route-price-box" id="route-price-box">
    <div style="color:rgba(255,255,255,.5);font-size:13px">${translate('loadingPrice', lang)}</div>
  </div>
  <div class="route-trust-signal" id="route-trust-signal" style="display:none"></div>
  <a href="${bookingUrl}" class="route-cta">${translate('searchFlightsNow', lang)}</a>
</div>
<section><p>${escHtml(introText)}</p></section>
${bestTimeHtml}
${airportInfoHtml}
${altAirportsHtml}
<section id="route-insights-section"></section>
<section class="route-faq">
  <h2>${translate('frequentlyAskedQuestions', lang)}</h2>
  ${faqHtml}
</section>
${relatedRoutesHtml}
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
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    },
  };

  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems };

  // [FLIGHT-SCHEMA] New — schema.org Flight, giving search engines a
  // structured departure/arrival-airport pair for this route in addition
  // to the generic WebPage/FAQPage/BreadcrumbList schemas above.
  const flightSchema = {
    '@context': 'https://schema.org',
    '@type': 'Flight',
    departureAirport: { '@type': 'Airport', iataCode: route.origin_iata, name: route.origin_city },
    arrivalAirport: { '@type': 'Airport', iataCode: route.destination_iata, name: route.destination_city },
  };

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${jsonLdScript(flightSchema)}\n${ROUTE_HEAD_EXTRA_STATIC}`;

  const html = renderShell({
    lang,
    title: `${title} | Airpiv`,
    description,
    canonicalUrl: url,
    urls,
    headExtra,
    mainContent,
    scripts: buildLiveScript(route, lang),
  });

  return { html, seo: { title: `${title} | Airpiv`, description, canonicalUrl: url, schema } };
}

module.exports = { renderFlightRoutePage };
