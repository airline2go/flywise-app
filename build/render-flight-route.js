const { escHtml, renderShell, jsonLdScript, homeHref } = require('./shell');
const { localizeCity, getAlternativeAirports } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');
const { pickVariant } = require('./content-variants');

// [BUG-FIX] The original flight-route.html wrote its JSON-LD schema TWICE —
// a second, dead write unconditionally clobbered the first with a generic
// hardcoded 2-question FAQ, discarding the real dynamic FAQ/custom_faq data.
// This generator writes it once, correctly, with the real FAQ items.

// [CONTENT-VARIATION-2] Expanded from a 2-variable branch (haul type,
// distance presence) to also branch on: domestic vs international
// (origin_country === destination_country — a different opening
// template), single- vs multi-carrier (airline_count, persisted by
// Phase 1's route intelligence core — appends a short clause), and
// route popularity (route_score_confidence === 'high' — appends a
// short clause). The closing sentence itself is picked between 2
// variants via a deterministic hash of the route's slug, so even two
// routes sharing every other dimension above don't read byte-identical.
// Every new clause is independently omitted when its underlying signal
// is unknown (null) — never fabricated.
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

// Build-time equivalent of the fmtHrsMin() helper that used to live only
// inside buildLiveScript()'s client-side string — now usable at build
// time since avg_duration_min is a persisted Phase 1 field.
function formatHoursMinutes(min, lang) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + translate('hoursAbbrev', lang) + (m > 0 ? ` ${m}${translate('minutesAbbrev', lang)}` : '');
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

  const items = [bestTimeFaqItem, haulQuestion];

  // [CONTENT-VARIATION-2] Previously this FAQ item only ever existed
  // client-side (buildLiveScript(), appended to the DOM after page load,
  // never in the static HTML/JSON-LD a crawler sees) since duration data
  // was only available from a live request. Now avg_duration_min is a
  // persisted Phase 1 field, so it can be a real build-time FAQ item.
  if (route.avg_duration_min != null) {
    const directLineKey = route.all_direct ? 'allFlightsDirect' : (route.direct_flight_available ? 'directFlightsAvailable' : 'noDirectFlights');
    items.push({
      question: format(translate('routeDurationFaqQuestionTemplate', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: format(translate('routeDurationFaqAnswerTemplate', lang), { duration: formatHoursMinutes(route.avg_duration_min, lang), directLine: translate(directLineKey, lang) }),
    });
  }

  // [CONTENT-VARIATION-2] New — varies FAQ content based on the route's
  // actual airline data (Phase 1), rather than a fixed question set.
  if (route.airline_count != null && route.airline_count > 0) {
    items.push({
      question: format(translate('routeFaqAirlineQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: route.airline_count === 1
        ? translate('routeFaqAirlineAnswerSingle', lang)
        : format(translate('routeFaqAirlineAnswerMulti', lang), { count: route.airline_count }),
    });
  }

  // [CONTENT-VARIATION-3] Explicit, distinctly-worded direct-flight FAQ
  // (a real long-tail search query in its own right) — separate from the
  // duration FAQ's folded-in directLine, reusing the same three existing
  // allFlightsDirect/directFlightsAvailable/noDirectFlights answer strings.
  if (route.direct_flight_available != null) {
    const directLineKey = route.all_direct ? 'allFlightsDirect' : (route.direct_flight_available ? 'directFlightsAvailable' : 'noDirectFlights');
    items.push({
      question: format(translate('routeFaqDirectQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: translate(directLineKey, lang),
    });
  }

  // [CONTENT-VARIATION-3] Alternative-airports FAQ — only when the
  // destination city genuinely has sibling airports (real data from
  // data.js's city airport_codes, already used for the airport-info
  // section below); omitted entirely otherwise, never fabricated.
  const altAirports = getAlternativeAirports(route.destination_city, route.destination_iata, lang);
  if (altAirports.length) {
    items.push({
      question: format(translate('routeFaqAltAirportsQuestion', lang), { destination: route.destination_city }),
      answer: format(translate('routeFaqAltAirportsAnswer', lang), { destination: route.destination_city, airports: altAirports.join(', ') }),
    });
  }

  // [CONTENT-VARIATION-4] Fastest-connection FAQ — a distinct long-tail query
  // ("fastest flight X to Y") answered from the persisted min_duration_min
  // (the shortest itinerary actually seen), separate from the duration FAQ's
  // average. Omitted when unknown, never fabricated.
  if (route.min_duration_min != null) {
    items.push({
      question: format(translate('routeFaqFastestQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: format(translate('routeFaqFastestAnswer', lang), { duration: formatHoursMinutes(route.min_duration_min, lang) }),
    });
  }

  // [CONTENT-VARIATION-4] Popularity FAQ — only added when route intelligence
  // has HIGH confidence that this is a genuinely popular route (same signal
  // buildDynamicIntro() uses). Never added on a guess: an unknown or
  // low/medium confidence route simply omits this question.
  if (route.route_score_confidence === 'high') {
    items.push({
      question: format(translate('routeFaqPopularQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: translate('routeFaqPopularAnswer', lang),
    });
  }

  if (route.custom_faq && route.custom_faq.length) return route.custom_faq;
  return items;
}

// [CONTENT-VARIATION-3] Was a flat 2-variant branch (long-haul/short-haul)
// shared verbatim by every route of that haul type — the single most
// repetitive section on the page. Now branches on domestic vs international
// too (4 body variants), appends a tip clause built from the route's real
// persisted direct/connecting field (never fabricated), and picks a closing
// sentence deterministically per-route so two routes sharing every other
// signal still read differently.
function buildBestTimeHtml(route, lang) {
  if (route.distance_km == null) return '';
  const isLongHaul = route.haul_type === 'long-haul';
  const isDomestic = !!(route.origin_country && route.destination_country && route.origin_country === route.destination_country);
  const bodyKey = isDomestic
    ? (isLongHaul ? 'routeBestTimeBodyDomesticLongHaul' : 'routeBestTimeBodyDomesticShortHaul')
    : (isLongHaul ? 'routeBestTimeBodyLongHaul' : 'routeBestTimeBodyShortHaul');
  const body = format(translate(bodyKey, lang), { origin: escHtml(route.origin_city), destination: escHtml(route.destination_city) });
  const bookingWindow = translate(isLongHaul ? 'routeBestTimeWindowLongHaul' : 'routeBestTimeWindowShortHaul', lang);

  let tip = '';
  if (route.all_direct === true) tip = translate('routeBestTimeTipDirect', lang);
  else if (route.direct_flight_available === false) tip = translate('routeBestTimeTipConnecting', lang);
  else if (route.direct_flight_available === true) tip = translate('routeBestTimeTipMixed', lang);

  const closingKeys = ['routeBestTimeClosingV1', 'routeBestTimeClosingV2'];
  const closing = translate(closingKeys[pickVariant(`${route.slug}:bt`, closingKeys.length)], lang);

  return `<section class="route-besttime-section"><h2>${translate('routeBestTimeHeading', lang)}</h2>` +
    `<div class="route-booking-window"><span class="route-booking-window-lbl">${translate('routeBestTimeBookingWindowLabel', lang)}</span><span class="route-booking-window-val">${bookingWindow}</span></div>` +
    `<p>${body}${tip ? ` ${tip}` : ''} ${closing}</p></section>`;
}

// [E-E-A-T] Trust section on the route page itself: shows when this route's
// flight data was last refreshed (from the persisted insights_updated_at
// Phase 1 field — a real timestamp, omitted when unknown, never faked) and
// links to the methodology / data-sources / editorial-policy pages. The same
// pages are linked site-wide from the footer (shell.js); surfacing them
// in-context on the route page — next to a concrete "last updated" date — is
// the signal search engines actually weigh for a data-driven page.
function buildTrustHtml(route, lang) {
  const links = [
    ['/methodology.html', translate('methodologyLabel', lang)],
    ['/data-sources.html', translate('dataSourcesLabel', lang)],
    ['/editorial-policy.html', translate('editorialPolicyLabel', lang)],
  ].map(([href, label]) => `<a href="${href}">${escHtml(label)}</a>`).join('');

  let updatedLine = '';
  if (route.insights_updated_at) {
    const d = new Date(route.insights_updated_at);
    if (!Number.isNaN(d.getTime())) {
      const dateStr = d.toLocaleDateString(getLanguage(lang).locale, { year: 'numeric', month: 'long', day: 'numeric' });
      updatedLine = `<p class="route-data-updated">📅 ${escHtml(translate('dataLastUpdatedFullLabel', lang))}: <time datetime="${d.toISOString().slice(0, 10)}">${escHtml(dateStr)}</time></p>`;
    }
  }

  return `<section class="route-eeat"><h2>${translate('routeTrustHeading', lang)}</h2>${updatedLine}` +
    `<p>${escHtml(translate('routeDataMethodologyText', lang))}</p>` +
    `<p class="route-eeat-links">${links}</p></section>`;
}

// Organization schema is now injected uniformly for every page by shell.js's
// renderShell() — no longer duplicated per render-*.js file.
const ROUTE_HEAD_EXTRA_STATIC = `<link rel="stylesheet" href="/flight-route.css">` +
  `<style>.route-eeat{margin-top:28px;padding:16px 18px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px}` +
  `.route-eeat h2{font-family:'Syne',sans-serif;font-size:1.15rem;color:var(--tx);margin-bottom:8px}` +
  `.route-eeat p{font-size:13.5px;color:var(--tx3);line-height:1.55}` +
  `.route-data-updated{margin-bottom:8px}` +
  `.route-eeat-links{margin-top:12px;display:flex;gap:16px;flex-wrap:wrap}` +
  `.route-eeat-links a{color:var(--teal);text-decoration:none;font-weight:600}` +
  `.route-eeat-links a:hover{text-decoration:underline}</style>`;

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
    // [HAUL-3-TIER] Three-way label so a medium-haul route (1500–4000 km) is
    // shown as "Mittelstrecke", not mislabeled short/long. Prose/FAQ branches
    // elsewhere key off `haul_type === 'long-haul'` and so already treat a
    // medium-haul route as non-long-haul (short-haul phrasing) — only this
    // explicit distance badge needs the dedicated middle label.
    const haulLabelKey = route.haul_type === 'long-haul' ? 'longHaulFlightLabel'
      : route.haul_type === 'medium-haul' ? 'mediumHaulFlightLabel'
        : 'shortHaulFlightLabel';
    const haulLabel = translate(haulLabelKey, lang);
    distanceHtml = `<div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:6px">📏 ${route.distance_km.toLocaleString(getLanguage(lang).locale)} km · ${haulLabel}</div>`;
  }

  // [ROUTE-INTELLIGENCE-3] Each related route now carries a reasonKey
  // computed by computeRelatedRoutes() (generate-pages.js) — surfaced as a
  // short subtitle so the suggestion isn't just an unexplained city pair.
  // reasonKey is null for a candidate that matched only on the base
  // same-city relation with no stronger signal — no subtitle shown then.
  const RELATED_REASON_KEYS = {
    popularWithTravelers: 'relatedReasonPopular',
    moreFlightOptions: 'relatedReasonMoreFlights',
    similarTripLength: 'relatedReasonSimilarTrip',
    sameRegion: 'relatedReasonSameRegion',
  };
  const relatedRoutesHtml = (relatedRoutes && relatedRoutes.length)
    ? `<section id="related-routes-section"><h2>${translate('similarFlightRoutes', lang)}</h2><div class="related-routes-grid">${relatedRoutes.map((r) => {
      const oCity = localizeCity(r.origin_city, r.origin_iata, lang);
      const dCity = localizeCity(r.destination_city, r.destination_iata, lang);
      const reasonTranslationKey = r.reasonKey && RELATED_REASON_KEYS[r.reasonKey];
      const reasonHtml = reasonTranslationKey ? `<span class="related-route-reason">${translate(reasonTranslationKey, lang)}</span>` : '';
      return `<a class="related-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">${escHtml(oCity)} → ${escHtml(dCity)}${reasonHtml}</a>`;
    }).join('')}</div></section>`
    : '';

  const bestTimeHtml = buildBestTimeHtml(route, lang);
  const trustHtml = buildTrustHtml(route, lang);
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
${trustHtml}
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

  // [ITEMLIST-SCHEMA] Structured ItemList for the "similar routes" block, so
  // search engines see the curated set of related route pages as an ordered
  // list of linked items (matching the visible related-routes section) — not
  // just anchor tags. Emitted only when there are related routes to list.
  const relatedItemListSchema = (relatedRoutes && relatedRoutes.length)
    ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: translate('similarFlightRoutes', lang),
      numberOfItems: relatedRoutes.length,
      itemListElement: relatedRoutes.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: urlFor(lang, `flights/${encodeURIComponent(r.slug)}`),
        name: `${localizeCity(r.origin_city, r.origin_iata, lang)} → ${localizeCity(r.destination_city, r.destination_iata, lang)}`,
      })),
    }
    : null;

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${jsonLdScript(flightSchema)}\n`
    + `${relatedItemListSchema ? jsonLdScript(relatedItemListSchema) + '\n' : ''}${ROUTE_HEAD_EXTRA_STATIC}`;

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
