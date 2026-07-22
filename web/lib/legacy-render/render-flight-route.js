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
// [HAUL-3-TIER] Suffix for haul-typed translation keys. A medium-haul route
// (1500–4000 km) must not be described as a "short-haul hop" or a "long-haul
// flight" — it gets its own MediumHaul phrasing. Keys without a MediumHaul
// variant intentionally keep the binary short/long split (e.g. the intro
// opening and closing, which never assert the haul distance).
function haulSuffix(r) {
  return r.haul_type === 'long-haul' ? 'LongHaul' : (r.haul_type === 'medium-haul' ? 'MediumHaul' : 'ShortHaul');
}

function buildDynamicIntro(r, lang) {
  const hasDistance = r.distance_km != null;
  const isLongHaul = r.haul_type === 'long-haul';
  const isDomestic = !!(r.origin_country && r.destination_country && r.origin_country === r.destination_country);
  const distanceStr = hasDistance ? r.distance_km.toLocaleString(getLanguage(lang).locale) : null;

  // Opening/closing never state the haul distance → keep binary short/long.
  const openingKey = isDomestic
    ? (isLongHaul ? 'routeIntroOpeningDomesticLongHaul' : 'routeIntroOpeningDomesticShortHaul')
    : (isLongHaul ? 'routeIntroOpeningLongHaul' : 'routeIntroOpeningShortHaul');
  const opening = format(translate(openingKey, lang), { origin: r.origin_city, destination: r.destination_city });

  // The distance phrase DOES assert the haul category → three-way.
  const distancePhrase = hasDistance
    ? format(translate(`routeIntroDistance${haulSuffix(r)}`, lang), { distance: distanceStr })
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
      answer: format(translate(`routeFaqDistanceAnswer${haulSuffix(route)}`, lang), { distance: route.distance_km.toLocaleString(getLanguage(lang).locale) }),
    }
    : {
      question: format(translate('routeFaqAirportQuestion', lang), { destination: route.destination_city }),
      answer: format(translate('routeFaqAirportAnswer', lang), { destCode: route.destination_iata }),
    };
  const bestTimeFaqItem = route.distance_km != null
    ? {
      question: format(translate('routeFaqBestTimeQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: translate(`routeFaqBestTimeAnswer${haulSuffix(route)}`, lang),
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

  // [ROUTE-FAQ-EXPANSION] Fastest flight time — only when the minimum flight
  // time is a persisted field AND is genuinely shorter than the average (i.e.
  // a nonstop option pulls it below the mixed average); otherwise it would just
  // restate the duration FAQ. Real Phase 1 data, never fabricated.
  if (route.min_duration_min != null && route.avg_duration_min != null && route.min_duration_min < route.avg_duration_min) {
    items.push({
      question: format(translate('routeFaqFastestQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: format(translate('routeFaqFastestAnswer', lang), { duration: formatHoursMinutes(route.min_duration_min, lang) }),
    });
  }

  // [ROUTE-FAQ-EXPANSION] Nonstop vs connecting split from the real observed
  // stop_distribution ({"0": nonstop, "1": one-stop, ...}). Only shown when the
  // route genuinely has both nonstop and connecting options — the interesting
  // case the yes/no direct FAQ can't quantify.
  if (route.stop_distribution && typeof route.stop_distribution === 'object') {
    const nonstop = Number(route.stop_distribution['0'] || 0);
    const withStops = Object.keys(route.stop_distribution).reduce(
      (sum, k) => (k !== '0' ? sum + Number(route.stop_distribution[k] || 0) : sum),
      0,
    );
    if (nonstop > 0 && withStops > 0) {
      items.push({
        question: format(translate('routeFaqStopsQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
        answer: format(translate('routeFaqStopsAnswer', lang), {
          nonstop: Number(nonstop).toLocaleString(getLanguage(lang).locale),
          withStops: Number(withStops).toLocaleString(getLanguage(lang).locale),
        }),
      });
    }
  }

  // [ROUTE-FAQ-EXPANSION] Alternative DEPARTURE airports — mirrors the existing
  // destination alternative-airports FAQ, for the origin city. Real sibling
  // airports from the city's own airport_codes; omitted for single-airport
  // origins.
  const depAltAirports = getAlternativeAirports(route.origin_city, route.origin_iata, lang);
  if (depAltAirports.length) {
    items.push({
      question: format(translate('routeFaqDepAltAirportsQuestion', lang), { origin: route.origin_city }),
      answer: format(translate('routeFaqDepAltAirportsAnswer', lang), { origin: route.origin_city, airports: depAltAirports.join(', ') }),
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
  // Body text names the haul category, so it is three-way (domestic + not).
  const bodyKey = isDomestic
    ? `routeBestTimeBodyDomestic${haulSuffix(route)}`
    : `routeBestTimeBody${haulSuffix(route)}`;
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

// Organization schema is now injected uniformly for every page by shell.js's
// renderShell() — no longer duplicated per render-*.js file.
//
// [INLINE-CRITICAL-CSS] The flight-route page's LCP element is the dark hero
// card, styled by flight-route.css. Served as a second <link>, it was a
// separate render-blocking round-trip that held LCP at ~2.7s on mobile while
// FCP (chrome, styled by shared-layout.css) was already 0.8s. Inlining these
// ~4KB of section styles into <head> lets the hero paint with the HTML — no
// extra request. Read from the same public/ file (single source, no drift)
// and bundled by Next's file tracing; if that ever fails to include it, we
// fall back to the external stylesheet so a page can never break.
// The section CSS is inlined (imported as a bundled string, not fetched via a
// <link>) so the page's LCP element — the hero card it styles — paints with
// the HTML instead of waiting on a second render-blocking round-trip.
// [ROUTE-FACTS] Server-rendered "route facts" section — surfaces the route's
// real intelligence (distance, average & fastest flight time, airline count,
// nonstop share, the nonstop/1-stop/2+-stop breakdown, and a data-freshness
// line) as visible, crawlable content instead of leaving it only inside FAQ
// text or the client-only live widget. Reuses the existing .route-insight-*
// card styles. Every card/line is data-gated; the whole section is omitted
// unless at least two facts are available, and nothing is fabricated.
function buildRouteFactsHtml(route, lang) {
  const loc = getLanguage(lang).locale;
  const small = (t) => `<small style="font-size:.6em;font-weight:700;color:var(--tx3);margin-inline-start:2px">${t}</small>`;
  const card = (valHtml, lbl) => `<div class="route-insight-card"><div class="route-insight-val">${valHtml}</div><div class="route-insight-lbl">${escHtml(lbl)}</div></div>`;

  const cards = [];
  if (route.distance_km != null) cards.push(card(`${route.distance_km.toLocaleString(loc)}${small('km')}`, translate('routeFactDistance', lang)));
  if (route.avg_duration_min != null) cards.push(card(formatHoursMinutes(route.avg_duration_min, lang), translate('routeFactAvgDuration', lang)));
  if (route.min_duration_min != null && route.avg_duration_min != null && route.min_duration_min < route.avg_duration_min) {
    cards.push(card(formatHoursMinutes(route.min_duration_min, lang), translate('routeFactFastest', lang)));
  }
  if (route.airline_count != null && route.airline_count > 0) cards.push(card(route.airline_count.toLocaleString(loc), translate('routeFactAirlines', lang)));

  let breakdownHtml = '';
  const sd = route.stop_distribution;
  if (sd && typeof sd === 'object') {
    const nonstop = Number(sd['0'] || 0);
    const oneStop = Number(sd['1'] || 0);
    const twoPlus = Object.keys(sd).reduce((s, k) => (Number(k) >= 2 ? s + Number(sd[k] || 0) : s), 0);
    const total = nonstop + oneStop + twoPlus;
    if (total > 0) {
      cards.push(card(`${Math.round((nonstop / total) * 100)}${small('%')}`, translate('routeFactNonstopShare', lang)));
      const parts = [];
      if (nonstop > 0) parts.push(format(translate('routeStopsNonstop', lang), { count: nonstop.toLocaleString(loc) }));
      if (oneStop > 0) parts.push(format(translate('routeStopsOneStop', lang), { count: oneStop.toLocaleString(loc) }));
      if (twoPlus > 0) parts.push(format(translate('routeStopsTwoPlus', lang), { count: twoPlus.toLocaleString(loc) }));
      breakdownHtml = `<div class="route-facts-note"><span class="route-facts-note-lbl">${escHtml(translate('routeStopsBreakdownLabel', lang))}:</span> ${escHtml(parts.join(' · '))}</div>`;
    }
  }

  if (cards.length < 2) return '';

  const updatedAt = route.insights_updated_at || (route.intelligence && route.intelligence.operational && route.intelligence.operational.updatedAt);
  const freshHtml = updatedAt
    ? `<div class="route-facts-note">${escHtml(format(translate('routeDataUpdated', lang), { date: String(updatedAt).slice(0, 10) }))}</div>`
    : '';

  return `<section class="route-facts-section"><h2>${translate('routeFactsHeading', lang)}</h2><div class="route-insights-grid">${cards.join('')}</div>${breakdownHtml}${freshHtml}</section>`;
}

// [E-E-A-T] In-context trust section: a short data-methodology note plus
// links to the methodology / data-sources / editorial-policy / transparency
// pages, right next to the route's data. The "last updated" date is NOT
// repeated here — the route-facts section already shows it — so this section
// stays focused on sourcing/trust links, no duplication.
function buildTrustHtml(route, lang) {
  const links = [
    ['/methodology.html', translate('methodologyLabel', lang)],
    ['/data-sources.html', translate('dataSourcesLabel', lang)],
    ['/editorial-policy.html', translate('editorialPolicyLabel', lang)],
    ['/transparency.html', translate('transparencyPageLabel', lang)],
  ].map(([href, label]) => `<a href="${href}">${escHtml(label)}</a>`).join('');
  return `<section class="route-eeat"><h2>${translate('routeTrustHeading', lang)}</h2>`
    + `<p>${escHtml(translate('routeDataMethodologyText', lang))}</p>`
    + `<p class="route-eeat-links">${links}</p></section>`;
}

const FLIGHT_ROUTE_CSS = require('./flight-route-css');
// [INTERNAL-LINKING] Styles for the hero city links and the "flights from/to"
// sections added to the live renderer — appended to the inlined route CSS.
const INTERNAL_LINK_CSS = `.route-hero-cities a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.35)}`
  + `.route-hero-cities a:hover{border-bottom-color:#fff}`
  + `.route-hero-badges{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0 2px}`
  + `.route-hero-badges span{font-size:12px;color:rgba(255,255,255,.92);background:rgba(255,255,255,.12);padding:4px 10px;border-radius:999px;white-space:nowrap}`
  + `.route-citylinks-section{margin-top:28px}`
  + `.route-citylinks-section h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin-bottom:12px}`
  + `.route-eeat{margin-top:28px;padding:16px 18px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px}`
  + `.route-eeat h2{font-family:'Syne',sans-serif;font-size:1.15rem;color:var(--tx);margin-bottom:8px}`
  + `.route-eeat p{font-size:13.5px;color:var(--tx3);line-height:1.55}`
  + `.route-eeat-links{margin-top:12px;display:flex;gap:16px;flex-wrap:wrap}`
  + `.route-eeat-links a{color:var(--teal);text-decoration:none;font-weight:600}`
  + `.route-eeat-links a:hover{text-decoration:underline}`;
const ROUTE_HEAD_EXTRA_STATIC = `<style>${FLIGHT_ROUTE_CSS}${INTERNAL_LINK_CSS}</style>`;

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

// [ROUTE-SEO-META] Stable, data-descriptive <title> — names the facets the
// page covers (flight time, distance, airlines), never a volatile value, so the
// title never churns between crawls (a price-in-title would). Localized; the
// visible <h1> is derived from the part before " | " in the render below.
function buildRouteTitle(route, lang) {
  return format(translate('routeTitleInfo', lang), { origin: route.origin_city, destination: route.destination_city });
}

// Format a "from" price with its currency — used ONLY in the meta description,
// never the title.
function formatRoutePrice(price, currency, lang) {
  const n = Math.round(Number(price)).toLocaleString(getLanguage(lang).locale);
  if (currency === 'EUR') return `${n} €`;
  if (currency === 'USD') return `$${n}`;
  if (currency === 'GBP') return `£${n}`;
  return `${n} ${currency || 'EUR'}`;
}

// [ROUTE-SEO-META] Data-gated meta description. The volatile "from" price
// (route.cached_price — a cache-only value the server attaches from its
// route_price cache) lives HERE, not in the title, so it can refresh without
// destabilising the title. Every clause is omitted when its data is missing, so
// a data-poor route gets a shorter, still-accurate description, never an
// invented one.
function buildRouteMetaDescription(route, lang) {
  let lead = format(translate('routeMetaBase', lang), { origin: route.origin_city, destination: route.destination_city });
  if (route.cached_price != null && Number(route.cached_price) > 0) {
    lead += format(translate('routeMetaFrom', lang), { price: formatRoutePrice(route.cached_price, route.cached_currency || 'EUR', lang) });
  }
  const parts = [lead];
  if (route.distance_km != null) {
    parts.push(format(translate('routeMetaDistance', lang), { distance: Number(route.distance_km).toLocaleString(getLanguage(lang).locale) }));
  }
  if (route.all_direct === true) parts.push(translate('routeMetaDirectAll', lang));
  else if (route.direct_flight_available === true) parts.push(translate('routeMetaDirectYes', lang));
  return parts.join('. ') + '.';
}

function renderFlightRoutePage(routeRaw, lang, relatedRoutes, cityLinks) {
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
  // [ROUTE-SEO-META] Precedence: an admin manual override wins, then the
  // server-side SEO engine's output (route.seo — populated once that system is
  // live; effectiveRouteSeo already folds custom_* over generated seo_*), then
  // the data-driven default built here. The <title> is deliberately STABLE
  // (flight time / distance / airlines) with NO price; the volatile "from"
  // price appears only in the meta description, so the title never churns.
  const title = route.custom_title || (route.seo && route.seo.title) || buildRouteTitle(route, lang);
  const description = route.custom_meta_description || (route.seo && route.seo.metaDescription) || buildRouteMetaDescription(route, lang);

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

  // [AIRLINE-SECTION] Real carriers observed on this route (route.airlines,
  // from content.routes.js's route_airlines->airlines join), each linking to
  // its own airline page — durable internal linking + per-route content.
  // Omitted when the route has no observed airlines yet; reuses the existing
  // airport-info-grid styling.
  const airlinesHtml = (route.airlines && route.airlines.length)
    ? `<section class="airport-info-section"><h2>${translate('airlinesOnRouteHeading', lang)}</h2><div class="airport-info-grid">${route.airlines.map((a) => `<a class="airport-info-card" href="${pathFor(lang, `airline/${encodeURIComponent(a.iata_code)}`)}"><span class="airport-info-code">${escHtml(a.iata_code)}</span><span class="airport-info-city">${escHtml(a.name || a.iata_code)}</span></a>`).join('')}</div></section>`
    : '';

  let distanceHtml = '';
  if (route.distance_km != null) {
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

  // [INTERNAL-LINKING] Hero city names link to their city pages (were plain
  // text). Falls back to plain text when a city has no slug.
  const originCityNode = route.origin_city_slug
    ? `<a href="${pathFor(lang, `city/${encodeURIComponent(route.origin_city_slug)}`)}">${escHtml(route.origin_city)}</a>`
    : `<span>${escHtml(route.origin_city)}</span>`;
  const destCityNode = route.destination_city_slug
    ? `<a href="${pathFor(lang, `city/${encodeURIComponent(route.destination_city_slug)}`)}">${escHtml(route.destination_city)}</a>`
    : `<span>${escHtml(route.destination_city)}</span>`;

  // [INTERNAL-LINKING] "Flights from {origin}" / "Flights to {destination}"
  // link sections from the build-time city-route groupings (render.js),
  // pushing internal links per page toward the 20–30 target. Omitted empty.
  function cityRouteSectionHtml(routes, headingLabel, cityName) {
    if (!routes || !routes.length) return '';
    const cards = routes.map((r) => {
      const oCity = localizeCity(r.origin_city, r.origin_iata, lang);
      const dCity = localizeCity(r.destination_city, r.destination_iata, lang);
      return `<a class="related-route-card" href="${pathFor(lang, `flights/${encodeURIComponent(r.slug)}`)}">${escHtml(oCity)} → ${escHtml(dCity)}</a>`;
    }).join('');
    return `<section class="route-citylinks-section"><h2>${headingLabel} ${escHtml(cityName)}</h2><div class="related-routes-grid">${cards}</div></section>`;
  }
  const moreFromOriginHtml = cityRouteSectionHtml(cityLinks && cityLinks.fromOrigin, translate('flightsFrom', lang), route.origin_city);
  const moreToDestinationHtml = cityRouteSectionHtml(cityLinks && cityLinks.toDestination, translate('flightsTo', lang), route.destination_city);

  const bestTimeHtml = buildBestTimeHtml(route, lang);
  const routeFactsHtml = buildRouteFactsHtml(route, lang);
  const trustHtml = buildTrustHtml(route, lang);
  const faqItems = buildFaqItems(route, lang);
  const faqHtml = faqItems.map((f) => `<div class="route-faq-item"><div class="route-faq-q">${escHtml(f.question)}</div><div class="route-faq-a">${escHtml(f.answer)}</div></div>`).join('');

  // [CTR-TITLE] The <title>/og:title carry the "… | Compare & Save" call to
  // action for the search snippet, but the visible <h1> uses just the clean
  // heading before the pipe (e.g. "Cheap flights Frankfurt to Barcelona"),
  // since a CTA reads oddly as an on-page heading. Splitting on " | " is safe:
  // the generated template has exactly one, and an admin custom_title rarely
  // does (and still renders fine either way).
  const heading = String(title).split(' | ')[0];
  const mainContent = `<main id="route-main">
  <div id="route-content">
${breadcrumbHtml}
<h1>${escHtml(heading)}</h1>
<div class="route-hero">
  <div class="route-hero-cities">
    ${originCityNode}
    <span class="route-hero-arrow">✈</span>
    ${destCityNode}
  </div>
  <div class="route-hero-badges"><span>✓ ${translate('heroBadgeLivePrices', lang)}</span><span>✓ ${translate('heroBadgeNoHiddenFees', lang)}</span><span>✓ ${translate('heroBadgeAirlines', lang)}</span></div>
  ${distanceHtml}
  <div class="route-price-box" id="route-price-box">
    <div style="color:rgba(255,255,255,.5);font-size:13px">${translate('loadingPrice', lang)}</div>
  </div>
  <div class="route-trust-signal" id="route-trust-signal" style="display:none"></div>
  <a href="${bookingUrl}" class="route-cta">${translate('searchFlightsNow', lang)}</a>
</div>
<section><p>${escHtml(introText)}</p></section>
${routeFactsHtml}
${bestTimeHtml}
${airportInfoHtml}
${altAirportsHtml}
${airlinesHtml}
<section id="route-insights-section"></section>
<section class="route-faq">
  <h2>${translate('frequentlyAskedQuestions', lang)}</h2>
  ${faqHtml}
</section>
${trustHtml}
${relatedRoutesHtml}
${moreFromOriginHtml}
${moreToDestinationHtml}
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

  // [ITEMLIST-SCHEMA] Structured ItemList mirroring the visible "similar
  // routes" section — an ordered list of linked route pages for search
  // engines. Emitted only when there are related routes.
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

  // [THIN-CONTENT-NOINDEX] A route with no real intelligence data at all
  // (no distance, no average/fastest duration, no observed airline count, and
  // no stop distribution) and no admin-authored intro/FAQ is thin: its intro
  // and FAQ are then fully templated boilerplate shared in shape with every
  // other dataless route, so it must not be indexed. Any single real data
  // point, or any admin-written intro_text/custom_faq, makes the page
  // genuinely distinct and keeps it indexed. Always `follow` so link equity
  // keeps flowing either way — matching the city/country/airline/airport rule.
  const hasRealRouteData = route.distance_km != null
    || route.avg_duration_min != null
    || (route.airline_count != null && route.airline_count > 0)
    || (route.stop_distribution && typeof route.stop_distribution === 'object' && Object.keys(route.stop_distribution).length > 0);
  const hasAdminRouteContent = !!(route.intro_text || (route.custom_faq && route.custom_faq.length));
  const robotsContent = (!hasRealRouteData && !hasAdminRouteContent) ? 'noindex, follow' : 'index, follow';

  const html = renderShell({
    lang,
    // [CTR-TITLE] The route title template already ends in a "| Compare &
    // Save"-style call to action (see routeTitleTemplate); appending "| Airpiv"
    // on top would push past Google's title width and waste the space the
    // pipe-separated CTA was chosen to save. Brand stays in og:site_name,
    // the description, and every other page type's title.
    title,
    description,
    canonicalUrl: url,
    urls,
    robotsContent,
    headExtra,
    mainContent,
    scripts: buildLiveScript(route, lang),
  });

  return { html, seo: { title, description, canonicalUrl: url, schema } };
}

module.exports = { renderFlightRoutePage, buildRouteTitle, buildRouteMetaDescription };
