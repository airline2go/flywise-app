const { escHtml, renderShell, jsonLdScript, homeHref, speakableSpec } = require('./shell');
const { robotsMeta } = require('./indexability');
const { localizeCity, getAlternativeAirports, hasCity } = require('./data');
const { translate, format } = require('./translate');
const { LANGUAGES, getLanguage, pathFor, urlFor, urlsFor } = require('./languages');
const { pickVariant } = require('./content-variants');
// [ROUTE-SNAPSHOT] Phases 9–14: one canonical object drives the whole page.
const { buildRouteSnapshot, validateSnapshot, criticalSnapshotErrors, resolveCanonicalPrice } = require('./route-snapshot');
const { LIVE_PRICE_TTL_MS } = require('./ttl');

// [SECONDARY-AIRPORT-NAMES] A secondary/low-cost airport shares a city entity
// with the main airport (e.g. Frankfurt owns FRA and HHN), so the data layer
// maps its IATA code to the CITY name — which made an "alternative airport"
// card read "Frankfurt", wrongly implying it is Frankfurt's main airport (FRA).
// This curated, factual map gives such airports their real name so the card is
// honest ("Frankfurt-Hahn (HHN)"); any code not listed falls back to a neutral
// "Alternative airport" label rather than the plain city name. Names are
// proper nouns (identical across languages), so one map serves every locale.
const SECONDARY_AIRPORT_NAMES = {
  HHN: 'Frankfurt-Hahn', NRN: 'Weeze (Niederrhein)', CRL: 'Brussels-Charleroi',
  BVA: 'Paris-Beauvais', NYO: 'Stockholm-Skavsta', BMA: 'Stockholm-Bromma',
  TRF: 'Oslo-Torp', GRO: 'Girona-Costa Brava', REU: 'Reus', SXF: 'Berlin-Schönefeld',
  EWR: 'Newark', LGA: 'New York-LaGuardia', ONT: 'Ontario', BUR: 'Hollywood Burbank',
  STN: 'London-Stansted', LTN: 'London-Luton', LGW: 'London-Gatwick',
  BGY: 'Milan-Bergamo',
};

// [AIRLINE-COUNT-CANON] / [ROUTE-CONSISTENCY-GUARD] both now live in
// route-snapshot.js: the snapshot's `airlineCount` is the single source of
// truth (list length authoritative), and `validateSnapshot()` performs the
// build-time invariant checks (airline count = unique list length; stop buckets
// sum to their total; positive priced currency; origin ≠ destination). This
// generator reads the derived values off the snapshot rather than re-deriving
// them, so no two sections can compute the same number differently.

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

function buildDynamicIntro(r, lang, snapshot) {
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
  const carrierCount = snapshot.airlineCount;
  if (carrierCount != null) {
    carrierClause = carrierCount === 1
      ? translate('routeIntroCarrierSingle', lang)
      : format(translate('routeIntroCarrierMulti', lang), { count: carrierCount });
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

// ISO-8601 duration (e.g. 90 -> "PT1H30M") for schema.org estimatedFlightDuration.
function isoDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const body = `${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
  return `PT${body || '0M'}`;
}

function buildFaqItems(route, lang, snapshot) {
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
  // actual airline data (Phase 1), rather than a fixed question set. Uses the
  // canonical airline count (list length when present) so the FAQ never claims
  // a different number than the visible airline list.
  const faqAirlineCount = snapshot.airlineCount;
  if (faqAirlineCount != null) {
    items.push({
      question: format(translate('routeFaqAirlineQuestion', lang), { origin: route.origin_city, destination: route.destination_city }),
      answer: faqAirlineCount === 1
        ? translate('routeFaqAirlineAnswerSingle', lang)
        : format(translate('routeFaqAirlineAnswerMulti', lang), { count: faqAirlineCount }),
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
  if (snapshot.stops) {
    // [STOP-CANON] nonstop vs connecting from the ONE snapshot split, so the
    // FAQ can never disagree with the route-facts breakdown. withStops is the
    // total minus nonstop (= one-stop + two-plus), by construction.
    const nonstop = snapshot.stops.nonstop;
    const withStops = snapshot.stops.total - snapshot.stops.nonstop;
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
function buildRouteFactsHtml(route, lang, snapshot) {
  const loc = getLanguage(lang).locale;
  const small = (t) => `<small style="font-size:.6em;font-weight:700;color:var(--tx3);margin-inline-start:2px">${t}</small>`;
  const card = (valHtml, lbl) => `<div class="route-insight-card"><div class="route-insight-val">${valHtml}</div><div class="route-insight-lbl">${escHtml(lbl)}</div></div>`;

  const cards = [];
  if (route.distance_km != null) cards.push(card(`${route.distance_km.toLocaleString(loc)}${small('km')}`, translate('routeFactDistance', lang)));
  if (route.avg_duration_min != null) cards.push(card(formatHoursMinutes(route.avg_duration_min, lang), translate('routeFactAvgDuration', lang)));
  if (route.min_duration_min != null && route.avg_duration_min != null && route.min_duration_min < route.avg_duration_min) {
    cards.push(card(formatHoursMinutes(route.min_duration_min, lang), translate('routeFactFastest', lang)));
  }
  const factsAirlineCount = snapshot.airlineCount;
  if (factsAirlineCount != null) cards.push(card(factsAirlineCount.toLocaleString(loc), translate('routeFactAirlines', lang)));

  let breakdownHtml = '';
  if (snapshot.stops) {
    // [STOP-CANON] The breakdown + nonstop-share read the ONE snapshot split.
    const { nonstop, oneStop, twoPlus, nonstopShare } = snapshot.stops;
    {
      cards.push(card(`${nonstopShare}${small('%')}`, translate('routeFactNonstopShare', lang)));
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

// [ROUTE-PRICE-FACTS] Server-rendered, crawlable "average flight prices" from
// the route's PERSISTED price aggregates (price_avg/min/max/trend, computed over
// price_sample_count recent checks). This is deliberately separate from the
// hero's live price box (which stays client-side for real-time booking
// accuracy): it is framed as an INDICATIVE AVERAGE with its own freshness date,
// never as a live bookable quote. Fully data-gated — shown only when there's a
// real average from at least a few samples; nothing is fabricated.
function buildPriceHtml(route, lang) {
  if (route.price_avg == null || !(Number(route.price_sample_count) >= 3)) return '';
  const loc = getLanguage(lang).locale;
  const ccy = route.price_currency || 'EUR';
  const card = (valHtml, lbl) => `<div class="route-insight-card"><div class="route-insight-val">${valHtml}</div><div class="route-insight-lbl">${escHtml(lbl)}</div></div>`;

  const cards = [card(escHtml(formatRoutePrice(route.price_avg, ccy, lang)), translate('routePriceAvgLabel', lang))];
  // Range card only when min and max DISPLAY as different values — a raw
  // 38.5 vs 39.4 both render "39 €", so gate on the rounded output, not the raw
  // numbers, to avoid a pointless "39 € – 39 €".
  if (route.price_min != null && route.price_max != null) {
    const minStr = formatRoutePrice(route.price_min, ccy, lang);
    const maxStr = formatRoutePrice(route.price_max, ccy, lang);
    if (minStr !== maxStr) cards.push(card(`${escHtml(minStr)} – ${escHtml(maxStr)}`, translate('routePriceRangeLabel', lang)));
  }
  const trendMap = { down: ['↓', 'priceTrendDown'], up: ['↑', 'priceTrendUp'], stable: ['→', 'priceTrendStable'] };
  const trend = trendMap[route.price_trend];
  if (trend) cards.push(card(`${trend[0]} ${escHtml(translate(trend[1], lang))}`, translate('routePriceTrendLabel', lang)));

  // [TIMESTAMP-SEPARATION] The price section's freshness line describes PRICE
  // data (price_updated_at), so it uses the price-specific label — distinct
  // from the route-facts section, which describes STRECKENDATEN (route data)
  // via its own insights_updated_at. Mixing the two under one "Flugdaten
  // aktualisiert" label was the source of the conflicting-timestamps confusion.
  const updated = route.price_updated_at ? String(route.price_updated_at).slice(0, 10) : null;
  const note = format(translate('routePriceNote', lang), { count: Number(route.price_sample_count).toLocaleString(loc) })
    + (updated ? ` ${format(translate('routePriceCheckedOn', lang), { date: updated })}` : '');

  return `<section class="route-facts-section"><h2>${translate('routePriceHeading', lang)}</h2>`
    + `<div class="route-insights-grid">${cards.join('')}</div>`
    + `<div class="route-facts-note">${escHtml(note)}</div></section>`;
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
  + `.route-eeat-links a:hover{text-decoration:underline}`
  + `.route-generated-body h2{font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--tx);margin:22px 0 10px}`
  + `.route-generated-body p{font-size:14.5px;line-height:1.7;color:var(--tx2);margin-bottom:12px}`;
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
function buildLiveScript(route, lang, snapshot) {
  return `<script>
(function(){
var PROXY = 'https://api.airpiv.com';
// [I18N-SCRIPT-SAFE] Every translated label used below is embedded via
// JSON.stringify, never inline in a single-quoted string — otherwise any value
// containing an apostrophe (e.g. French "aujourd'hui") or quote would close the
// JS string early and break this whole <script>, silently killing the live
// price for that entire language.
var L = {
  priceLabel: ${JSON.stringify(translate('priceLabel', lang))},
  priceLabelLive: ${JSON.stringify(translate('priceLabelLive', lang))},
  priceFromTpl: ${JSON.stringify(translate('priceFromTemplate', lang))},
  priceLastCheckedTpl: ${JSON.stringify(translate('priceLastCheckedTemplate', lang))},
  priceUnavailable: ${JSON.stringify(translate('priceUnavailable', lang))},
  pricesCheckedTodaySuffix: ${JSON.stringify(translate('pricesCheckedTodaySuffix', lang))},
  offersForRouteSuffix: ${JSON.stringify(translate('offersComparedForRouteSuffix', lang))},
  lastUpdatedLabel: ${JSON.stringify(translate('lastUpdatedLabel', lang))},
  hoursAbbrev: ${JSON.stringify(translate('hoursAbbrev', lang))},
  minutesAbbrev: ${JSON.stringify(translate('minutesAbbrev', lang))},
  flightData: ${JSON.stringify(translate('flightDataForThisRoute', lang))},
  avgTravel: ${JSON.stringify(translate('averageTotalTravelTime', lang))},
  shortestFlight: ${JSON.stringify(translate('shortestFlightTimeFound', lang))}
};
// [CANONICAL-PRICE] The single server-side price of record for this route,
// baked from the persisted price_min aggregate (the same value the visible
// "average prices" section and the JSON-LD Offer use). The hero shows the LIVE
// price only when the live check is genuinely fresh (see FRESH_MS); otherwise
// it falls back to this canonical value with an honest "last checked on"
// stamp — so the hero, the price section and the schema never disagree, and the
// page never calls a days-old number "live".
var CANON_PRICE = ${snapshot.price ? snapshot.price.amount.toFixed(0) : 'null'};
var CANON_CCY = ${JSON.stringify((snapshot.price && snapshot.price.currency) || 'EUR')};
var CANON_DATE = ${JSON.stringify(snapshot.price && snapshot.price.checkedAt ? String(snapshot.price.checkedAt).slice(0, 10) : null)};
var FRESH_MS = ${LIVE_PRICE_TTL_MS}; // "live" freshness window, from the central TTL policy (ttl.js)
function fmtCcy(n){ return CANON_CCY === 'EUR' ? (n + ' €') : CANON_CCY === 'USD' ? ('$' + n) : CANON_CCY === 'GBP' ? ('£' + n) : (n + ' ' + CANON_CCY); }
function renderCanonicalPrice(box, trustEl){
  if (CANON_PRICE == null) {
    box.innerHTML = '<div style="color:rgba(255,255,255,.5);font-size:13px">' + L.priceUnavailable + '</div>';
    return;
  }
  box.innerHTML = '<div class="route-price-val">' + L.priceFromTpl.replace('{price}', fmtCcy(CANON_PRICE)) + '</div><div class="route-price-lbl">' + L.priceLabel + '</div>';
  if (trustEl && CANON_DATE) {
    trustEl.innerHTML = '<span>' + L.priceLastCheckedTpl.replace('{date}', CANON_DATE) + '</span>';
    trustEl.style.display = '';
  }
}
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

var priceAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
// [PRICE-TIMEOUT] Never leave the box stuck on "loading…": if the live price
// request stalls (slow network, or an ad/tracker blocker blocking
// api.airpiv.com), abort after 8s so the .catch below shows the "unavailable"
// fallback instead of a permanent "Chargement du prix…".
var priceTimer = setTimeout(function(){ if (priceAbort) priceAbort.abort(); }, 8000);
fetch(PROXY + '/route-price?from=' + encodeURIComponent(${JSON.stringify(route.origin_iata)}) + '&to=' + encodeURIComponent(${JSON.stringify(route.destination_iata)}), priceAbort ? { signal: priceAbort.signal } : undefined)
  .then(function(r){ return r.json(); })
  .then(function(j){
    clearTimeout(priceTimer);
    var box = document.getElementById('route-price-box');
    var trustEl = document.getElementById('route-trust-signal');
    // [LIVE-VS-CANONICAL] A live price is shown as "live" only when the check
    // is genuinely fresh. The freshness decision is now made ONCE, server-side:
    // when the backend returns a canonical price snapshot (j.snapshot, see
    // flywise-server config/price.js) we trust snapshot.isLive so the TTL lives
    // in exactly one place. Only when no snapshot is present (older backend /
    // rollout) do we fall back to computing freshness locally against FRESH_MS.
    var snap = j && j.snapshot;
    var liveAgeMs = (j.ok && j.checkedAt) ? (Date.now() - new Date(j.checkedAt).getTime()) : Infinity;
    var liveFresh = snap
      ? (snap.isLive === true && j.price != null)
      : (j.ok && j.price != null && j.checkedAt && liveAgeMs >= 0 && liveAgeMs <= FRESH_MS);
    if (liveFresh) {
      box.innerHTML = '<div class="route-price-val">' + L.priceFromTpl.replace('{price}', j.price.toFixed(0)) + '</div><div class="route-price-lbl">' + L.priceLabelLive + '</div>';
      if (j.departure_date) {
        var ctaLink = document.querySelector('.route-cta');
        if (ctaLink) ctaLink.href = ctaLink.getAttribute('href') + '?depart=' + encodeURIComponent(j.departure_date);
      }
      if (trustEl) {
        var minutesAgo = Math.max(0, Math.round(liveAgeMs / 60000));
        var agoText = minutesAgo < 1 ? ${JSON.stringify(translate('justNow', lang))} : (minutesAgo === 1 ? ${JSON.stringify(translate('updatedOneMinuteAgo', lang))} : ${JSON.stringify(translate('updatedMinutesAgoTemplate', lang))}.replace('{min}', minutesAgo));
        // [ROUTE-SPECIFIC-TRUST] Prefer the per-route offers-compared count
        // (snapshot.offersCount) over the legacy site-wide daily counter, so the
        // number honestly describes THIS route. Fall back to checksToday only
        // when the snapshot doesn't carry a count.
        var countHtml = '';
        if (snap && snap.offersCount != null) countHtml = '<span>✓ ' + snap.offersCount + ' ' + L.offersForRouteSuffix + '</span>';
        else if (j.checksToday != null) countHtml = '<span>✓ ' + j.checksToday + ' ' + L.pricesCheckedTodaySuffix + '</span>';
        trustEl.innerHTML = countHtml + '<span>· ' + L.lastUpdatedLabel + ' ' + agoText + '</span>';
        trustEl.style.display = '';
      }
    } else {
      renderCanonicalPrice(box, trustEl);
    }
    if (j.ok && j.insights) {
      var ins = j.insights;
      function fmtHrsMin(min) { var h = Math.floor(min / 60), m = min % 60; return h + L.hoursAbbrev + (m > 0 ? ' ' + m + L.minutesAbbrev : ''); }
      var directLine = ins.allDirect
        ? ${JSON.stringify(translate('allFlightsDirect', lang))}
        : (ins.directAvailable ? ${JSON.stringify(translate('directFlightsAvailable', lang))} : ${JSON.stringify(translate('noDirectFlights', lang))});
      var airlinesLine = ins.airlines.length ? (${JSON.stringify(translate('airlinesFlyingThisRoute', lang))} + ' ' + ins.airlines.join(', ') + '.') : '';
      var insightsHtml = '<section class="route-insights-section"><h2>' + L.flightData + '</h2><div class="route-insights-grid">' +
        '<div class="route-insight-card"><div class="route-insight-val">' + fmtHrsMin(ins.avgDurationMin) + '</div><div class="route-insight-lbl">' + L.avgTravel + '</div></div>' +
        '<div class="route-insight-card"><div class="route-insight-val">' + fmtHrsMin(ins.minDurationMin) + '</div><div class="route-insight-lbl">' + L.shortestFlight + '</div></div>' +
      '</div><p style="margin-top:10px">' + directLine + (airlinesLine ? ' ' + airlinesLine : '') + '</p></section>';
      var insightsTarget = document.getElementById('route-insights-section');
      if (insightsTarget) insightsTarget.outerHTML = insightsHtml;
    }
  })
  .catch(function(){
    clearTimeout(priceTimer);
    // Live check failed/blocked/timed out — fall back to the canonical price
    // (with its "last checked on" stamp) rather than a bare "unavailable".
    renderCanonicalPrice(document.getElementById('route-price-box'), document.getElementById('route-trust-signal'));
  });
try { if (typeof gtag === 'function') gtag('event', 'route_page_view', { origin: ${JSON.stringify(route.origin_iata)}, destination: ${JSON.stringify(route.destination_iata)}, slug: ${JSON.stringify(route.slug)} }); } catch (e) {}
})();
</script>`;
}

// [ROUTE-SEO-META] Natural-language, search-friendly <title> — "Flights from
// {origin} to {destination} …" phrasing (never an arrow), localized city names,
// always ending in the brand "| Airpiv". The descriptive facet words are
// data-gated so the title never claims what the route can't back up, and never
// contains a volatile price value (that stays in the meta description):
//   • "Prices" (the primary template) is used only when a real cached price
//     exists — otherwise the word is dropped, never a fabricated price.
//   • the "Flight Time & Distance" fallback is used only when a distance is known.
//   • the "Direct flights" fallback is used only when directness is known.
//   • otherwise the plain "Flights from … to …" base template.
// Every route's origin/destination pair is unique, so every generated title is
// unique; the fallbacks exist to shed a facet word, not to disambiguate.
function buildRouteTitle(route, lang) {
  const vars = { origin: route.origin_city, destination: route.destination_city };
  // [CANONICAL-PRICE-SOURCE] The "Prices" facet appears only when the ONE
  // canonical price resolver yields a value — the same source the meta
  // description, hero and Offer use, so the title never promises a price the
  // rest of the page can't back up.
  const hasPrice = resolveCanonicalPrice(route) != null;
  const hasDistance = route.distance_km != null;
  const isDirect = route.all_direct === true || route.direct_flight_available === true;
  const key = hasPrice ? 'routeTitlePrimary'
    : hasDistance ? 'routeTitleFacts'
      : isDirect ? 'routeTitleDirect'
        : 'routeTitleBase';
  return format(translate(key, lang), vars);
}

// Format a price with its currency — used by the on-page price cards and the
// meta description's live "from" clause.
function formatRoutePrice(price, currency, lang) {
  const n = Math.round(Number(price)).toLocaleString(getLanguage(lang).locale);
  if (currency === 'EUR') return `${n} €`;
  if (currency === 'USD') return `$${n}`;
  if (currency === 'GBP') return `£${n}`;
  return `${n} ${currency || 'EUR'}`;
}

// [CANONICAL-PRICE-SOURCE] resolveCanonicalPrice now lives in route-snapshot.js
// (imported above) and is exposed as snapshot.price. It stays the single "from"
// price for the title facet, meta description, hero fallback and JSON-LD Offer.

// [ROUTE-SEO-META] Natural-language meta description — one localized sentence
// naming what the page lets you compare (live prices, flight time, distance,
// airlines, direct flights) for this specific city pair. Unique per route
// (origin/destination differ), no arrows, no keyword stuffing.
// When — and only when — a REAL live price exists (route.cached_price, the
// cache-only value the server attaches from its route_price cache), a natural
// "from {price}" clause is appended. The price value is never generated or
// estimated: no cached price → the generic sentence stands alone, and the price
// value never appears in the <title> (only here).
function buildRouteMetaDescription(route, lang) {
  const vars = { origin: route.origin_city, destination: route.destination_city };
  const base = format(translate('routeMeta', lang), vars);
  // [CANONICAL-PRICE-SOURCE] The "ab/from …" clause uses the ONE canonical
  // price (same value the title facet, hero fallback and Offer use), so the
  // SERP snippet never advertises a figure the page itself doesn't show.
  const cp = resolveCanonicalPrice(route);
  if (cp) {
    const price = formatRoutePrice(cp.amount, cp.currency, lang);
    return base + format(translate('routeMetaPrice', lang), { price });
  }
  return base;
}

function renderFlightRoutePage(routeRaw, lang, relatedRoutes, cityLinks, relatedArticles = []) {
  const route = Object.assign({}, routeRaw, {
    origin_city: localizeCity(routeRaw.origin_city, routeRaw.origin_iata, lang),
    destination_city: localizeCity(routeRaw.destination_city, routeRaw.destination_iata, lang),
  });
  // [ROUTE-SNAPSHOT] Build the ONE canonical object the whole page reads from
  // (price, airline count, stop split, durations, distance, freshness). Every
  // section below is handed this snapshot instead of re-deriving values, so no
  // two components can disagree.
  const snapshot = buildRouteSnapshot(routeRaw);
  // [ROUTE-CONSISTENCY-GUARD] Surface any invariant violation (airline count vs
  // unique list, stop total, invalid price, origin=destination) in the render
  // log before the page is served. Non-fatal — logs once per render, never
  // blocks the page (publication-gating is a separate follow-up, F-2).
  const consistencyErrors = validateSnapshot(routeRaw, snapshot);
  if (consistencyErrors.length) {
    try { console.warn(`[route-consistency] ${routeRaw.slug || '?'} ${consistencyErrors.join('; ')}`); } catch (e) { /* noop */ }
  }

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
  // [ROUTE-SEO-GENERATED] The engine generates content in one language at a
  // time (route.seo_lang), so it must only be used when it matches the
  // current page's language — otherwise German copy would leak onto /en, /fr, …
  const gen = !!(route.seo_lang && route.seo_lang === lang);
  const title = route.custom_title || (gen && route.seo_title) || buildRouteTitle(route, lang);
  const description = route.custom_meta_description || (gen && route.seo_meta_description) || buildRouteMetaDescription(route, lang);

  // [ROUTE-CANONICAL] For an exact-duplicate route (same airport pair under a
  // second slug) render.js sets route.canonicalSlug to the canonical winner, so
  // canonical AND hreflang point at the winner's URLs (in every language)
  // instead of this duplicate's own — consolidating the duplicate's indexing.
  const canonicalSlug = route.canonicalSlug || route.slug;
  const urls = urlsFor(`flights/${encodeURIComponent(canonicalSlug)}`);
  const url = urls[lang];
  // Server-generated from data blocks (never user input) — safe as raw HTML.
  const generatedBodyHtml = (gen && !route.intro_text && route.seo_intro_html) ? route.seo_intro_html : null;
  const introText = route.intro_text || buildDynamicIntro(route, lang, snapshot);
  const bookingUrl = `/search/${encodeURIComponent(route.origin_iata)}-${encodeURIComponent(route.destination_iata)}`;

  let breadcrumbHtml = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${homeHref(lang)}">${translate('homeLabel', lang)}</a><span>›</span>`;
  if (route.destination_country) breadcrumbHtml += `<a href="${urlFor(lang, `country/${encodeURIComponent(route.destination_country)}`)}">${escHtml(route.destination_country)}</a><span>›</span>`;
  // [CITY-LINK-GUARD] Only link (and list in JSON-LD) a destination city that
  // actually has a page — many route records carry a city_slug for a city that
  // was never given one, so an unconditional link 404s. When absent, keep the
  // city name as plain text in the visible trail but drop it from the
  // BreadcrumbList so no structured-data item points at a 404 URL.
  const destCityHasPage = hasCity(route.destination_city_slug);
  if (route.destination_city_slug) breadcrumbHtml += destCityHasPage
    ? `<a href="${urlFor(lang, `city/${encodeURIComponent(route.destination_city_slug)}`)}">${escHtml(route.destination_city)}</a><span>›</span>`
    : `<span>${escHtml(route.destination_city)}</span><span>›</span>`;
  breadcrumbHtml += `<span>${escHtml(route.origin_city)} → ${escHtml(route.destination_city)}</span></nav>`;

  const breadcrumbItems = [{ '@type': 'ListItem', position: 1, name: translate('homeLabel', lang), item: urlFor(lang, '') }];
  let bcPos = 2;
  if (route.destination_country) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_country, item: urlFor(lang, `country/${encodeURIComponent(route.destination_country)}`) });
  if (route.destination_city_slug && destCityHasPage) breadcrumbItems.push({ '@type': 'ListItem', position: bcPos++, name: route.destination_city, item: urlFor(lang, `city/${encodeURIComponent(route.destination_city_slug)}`) });
  breadcrumbItems.push({ '@type': 'ListItem', position: bcPos, name: `${route.origin_city} → ${route.destination_city}`, item: url });

  const airportInfoHtml = `<section class="airport-info-section"><h2>${translate('airportInformation', lang)}</h2><div class="airport-info-grid">` +
    `<a class="airport-info-card" href="${pathFor(lang, `airport/${encodeURIComponent(route.origin_iata)}`)}"><span class="airport-info-code">${escHtml(route.origin_iata)}</span><span class="airport-info-city">${escHtml(route.origin_city)}</span></a>` +
    `<a class="airport-info-card" href="${pathFor(lang, `airport/${encodeURIComponent(route.destination_iata)}`)}"><span class="airport-info-code">${escHtml(route.destination_iata)}</span><span class="airport-info-city">${escHtml(route.destination_city)}</span></a>` +
    `</div></section>`;

  // [ALT-AIRPORT-NAMING] Show the alternative airport's real name (curated
  // secondary-airport map) rather than the shared city name, so e.g. HHN never
  // reads as if it were Frankfurt's main airport. Unknown codes get a neutral
  // "Alternative airport" label instead of the misleading bare city name.
  const altAirportSubtitle = (code) => SECONDARY_AIRPORT_NAMES[code] || translate('alternativeAirportLabel', lang);
  const altAirports = getAlternativeAirports(route.destination_city, route.destination_iata, lang);
  const altAirportsHtml = altAirports.length
    ? `<section class="airport-info-section"><h2>${translate('alternativeAirportsIn', lang)} ${escHtml(route.destination_city)}</h2><div class="airport-info-grid">${altAirports.map((code) => `<a class="airport-info-card" href="${pathFor(lang, `airport/${encodeURIComponent(code)}`)}"><span class="airport-info-code">${escHtml(code)}</span><span class="airport-info-city">${escHtml(altAirportSubtitle(code))}</span></a>`).join('')}</div></section>`
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
  // text). Falls back to plain text when a city has no slug — or, per
  // [CITY-LINK-GUARD], when the slug has no actual page (else the link 404s).
  const originCityNode = hasCity(route.origin_city_slug)
    ? `<a href="${pathFor(lang, `city/${encodeURIComponent(route.origin_city_slug)}`)}">${escHtml(route.origin_city)}</a>`
    : `<span>${escHtml(route.origin_city)}</span>`;
  const destCityNode = hasCity(route.destination_city_slug)
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

  // [ROUTE-RELATED-ARTICLES] Blog posts that genuinely mention this route's
  // cities (matched in render.js), linking routes → the blog. Reuses the
  // related-routes card styling; omitted when there are no matching articles
  // (e.g. every language without a blog).
  const relatedArticlesHtml = (relatedArticles && relatedArticles.length)
    ? `<section class="route-citylinks-section"><h2>${translate('routeRelatedArticles', lang)}</h2><div class="related-routes-grid">${relatedArticles.map((p) => `<a class="related-route-card" href="${pathFor(lang, `blog/${encodeURIComponent(p.slug)}`)}">${escHtml(p.title)}</a>`).join('')}</div></section>`
    : '';

  const bestTimeHtml = buildBestTimeHtml(route, lang);
  const routeFactsHtml = buildRouteFactsHtml(route, lang, snapshot);
  const priceHtml = buildPriceHtml(route, lang);
  const trustHtml = buildTrustHtml(route, lang);
  // Manual FAQ wins, then generated (matching language), then the template default.
  const faqItems = (route.custom_faq && route.custom_faq.length) ? route.custom_faq
    : (gen && Array.isArray(route.seo_faq) && route.seo_faq.length) ? route.seo_faq
      : buildFaqItems(route, lang, snapshot);
  const faqHtml = faqItems.map((f) => `<div class="route-faq-item"><div class="route-faq-q">${escHtml(f.question)}</div><div class="route-faq-a">${escHtml(f.answer)}</div></div>`).join('');

  // [CTR-TITLE] The <title>/og:title carry the descriptive facet clause and the
  // brand ("… – Prices, Flight Time & Airlines | Airpiv"), but the visible <h1>
  // uses just the clean natural-language phrase — "Flights from {origin} to
  // {destination}" — since the facet clause and brand read oddly as an on-page
  // heading. We strip the brand (before " | ") and then the facet clause
  // (before " – "); a route with no facet clause simply keeps the whole phrase.
  // An admin custom_title rarely uses either separator (and still renders fine).
  const heading = String(title).split(' | ')[0].split(' – ')[0];
  // The generated body's own "booking strategy" section already covers best-time
  // advice, so the templated bestTimeHtml is dropped to avoid saying it twice.
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
${generatedBodyHtml ? `<section class="route-generated-body">${generatedBodyHtml}</section>` : `<section><p>${escHtml(introText)}</p></section>`}
${routeFactsHtml}
${priceHtml}
${generatedBodyHtml ? '' : bestTimeHtml}
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
${relatedArticlesHtml}
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
    speakable: speakableSpec('.route-faq-q'),
    mainEntity: {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    },
  };

  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems };

  // [FLIGHT-SCHEMA] schema.org Flight, giving search engines a structured
  // departure/arrival-airport pair for this route in addition to the generic
  // WebPage/FAQPage/BreadcrumbList schemas above.
  // [TRAVEL-SCHEMA] Enriched with the route's REAL travel facts when known:
  // flightDistance (km) and estimatedFlightDuration as an ISO-8601 duration
  // from the persisted average flight time. Both are data-gated — a route with
  // no distance/duration simply omits that property, never a fabricated value.
  const flightSchema = {
    '@context': 'https://schema.org',
    '@type': 'Flight',
    departureAirport: { '@type': 'Airport', iataCode: route.origin_iata, name: route.origin_city },
    arrivalAirport: { '@type': 'Airport', iataCode: route.destination_iata, name: route.destination_city },
  };
  if (route.distance_km != null) flightSchema.flightDistance = `${route.distance_km} km`;
  if (route.avg_duration_min != null) flightSchema.estimatedFlightDuration = isoDuration(route.avg_duration_min);
  // [PRICE-OFFER-SCHEMA] Emit an Offer with the lowest observed fare so Google
  // can surface a price for the route. Gated on the SAME quality bar as the
  // visible "average prices" panel (a real min from >= 3 samples) — never a
  // fabricated or single-sample outlier quote. priceCurrency mirrors the
  // persisted aggregate; the price is the lowest observed fare (price_min).
  // [CANONICAL-PRICE-SOURCE] The Offer is emitted only for the sample-backed
  // aggregate price (same quality bar as the visible price panel) and its
  // price/currency come straight from the ONE canonical resolver — so the
  // structured-data price can never disagree with the hero, title or meta.
  const offerPrice = snapshot.price;
  if (offerPrice && offerPrice.source === 'aggregate-min') {
    flightSchema.offers = {
      '@type': 'Offer',
      price: offerPrice.amount.toFixed(2),
      priceCurrency: offerPrice.currency,
      availability: 'https://schema.org/InStock',
      url,
    };
  }

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

  // [ARTICLES-ITEMLIST] Structured ItemList mirroring the visible "related
  // articles" section — linked blog posts, emitted only when there are matches.
  const articlesItemListSchema = (relatedArticles && relatedArticles.length)
    ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: translate('routeRelatedArticles', lang),
      numberOfItems: relatedArticles.length,
      itemListElement: relatedArticles.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: urlFor(lang, `blog/${encodeURIComponent(p.slug)}`),
        name: p.title,
      })),
    }
    : null;

  const headExtra = `${jsonLdScript(schema)}\n${jsonLdScript(breadcrumbSchema)}\n${jsonLdScript(flightSchema)}\n`
    + `${relatedItemListSchema ? jsonLdScript(relatedItemListSchema) + '\n' : ''}`
    + `${articlesItemListSchema ? jsonLdScript(articlesItemListSchema) + '\n' : ''}${ROUTE_HEAD_EXTRA_STATIC}`;

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
  // [PUBLICATION-GATE] F-2: a route whose data is genuinely broken/contradictory
  // (invalid route, malformed price, impossible stop total) must not be pushed
  // to the index — set noindex,follow so users still reach it but Google
  // doesn't index contradictory content. Narrow by design (see
  // criticalSnapshotErrors); always `follow` to keep link equity flowing.
  const criticalErrors = criticalSnapshotErrors(routeRaw, snapshot);
  const robotsContent = robotsMeta({
    type: 'flight-route',
    hasRealRouteData,
    hasAdminContent: hasAdminRouteContent,
    hasCriticalError: criticalErrors.length > 0,
  });

  const html = renderShell({
    lang,
    // [ROUTE-SEO-META] The route title template already ends in the brand
    // ("… | Airpiv") — matching every other page type — so it is passed through
    // as-is; renderShell must not append the brand a second time.
    title,
    description,
    canonicalUrl: url,
    urls,
    robotsContent,
    headExtra,
    mainContent,
    scripts: buildLiveScript(route, lang, snapshot),
  });

  return { html, seo: { title, description, canonicalUrl: url, schema } };
}

module.exports = { renderFlightRoutePage, buildRouteTitle, buildRouteMetaDescription, resolveCanonicalPrice };
