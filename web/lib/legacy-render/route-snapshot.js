// [ROUTE-SNAPSHOT] Phases 9–14: the ONE canonical object a route page is built
// from. Every section (hero, intro, route-facts, price, FAQ, JSON-LD, meta,
// title) reads its numbers from a single snapshot derived here.
//
// Nothing here is fabricated: every field is null/omitted when its underlying
// signal is absent or malformed, and derived counts are computed only from
// validated persisted raw values.
const { PRICE_TTL_MS, ROUTE_DATA_TTL_MS, isFresh } = require('./ttl');

function validPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validCurrency(value) {
  const currency = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

// [CANONICAL-PRICE-SOURCE] One persisted "from" price resolver. A price is
// usable only when its amount, currency and (for aggregates) sample evidence
// are valid. Missing currency is NOT silently converted to EUR.
function resolveCanonicalPrice(route) {
  const sampleCount = Number(route.price_sample_count || 0);
  const currency = validCurrency(route.price_currency);
  if (currency && validPositiveNumber(route.price_min) != null && sampleCount >= 1) {
    return {
      amount: validPositiveNumber(route.price_min),
      currency,
      checkedAt: route.price_updated_at || null,
      source: 'aggregate-min',
    };
  }
  if (currency && validPositiveNumber(route.price_avg) != null && sampleCount >= 1) {
    return {
      amount: validPositiveNumber(route.price_avg),
      currency,
      checkedAt: route.price_updated_at || null,
      source: 'aggregate-avg',
    };
  }
  // A cached price may legitimately be useful as an indicative fallback, but
  // it must carry its own real currency. No currency guessing is permitted.
  const cachedCurrency = validCurrency(route.cached_currency);
  const cachedAmount = validPositiveNumber(route.cached_price);
  if (cachedCurrency && cachedAmount != null) {
    return {
      amount: cachedAmount,
      currency: cachedCurrency,
      checkedAt: null,
      source: 'cached',
    };
  }
  return null;
}

function deriveAirlineCount(route, routeAirlines) {
  if (routeAirlines.length) return routeAirlines.length;
  const count = Number(route.airline_count);
  return Number.isInteger(count) && count > 0 ? count : null;
}

// [STOP-CANON] Derive the entire stop split only from validated, non-negative
// integer buckets. If the persisted object is malformed, omit the split rather
// than publishing a plausible-looking percentage from corrupt input.
function deriveStops(route) {
  const sd = route.stop_distribution;
  if (!sd || typeof sd !== 'object' || Array.isArray(sd)) return null;
  for (const [key, rawValue] of Object.entries(sd)) {
    if (!/^\d+$/.test(String(key))) return null;
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 0) return null;
  }
  const nonstop = Number(sd['0'] || 0);
  const oneStop = Number(sd['1'] || 0);
  const twoPlus = Object.keys(sd).reduce((s, k) => (Number(k) >= 2 ? s + Number(sd[k] || 0) : s), 0);
  const total = nonstop + oneStop + twoPlus;
  if (!(total > 0)) return null;
  return { nonstop, oneStop, twoPlus, total, nonstopShare: Math.round((nonstop / total) * 100) };
}

function deriveSeoSignals(route, snapshot) {
  const facts = {
    hasDistance: snapshot.distanceKm != null && snapshot.distanceKm > 0,
    hasDuration: snapshot.avgDurationMin != null && snapshot.avgDurationMin > 0,
    hasFastestDuration: snapshot.minDurationMin != null && snapshot.minDurationMin > 0,
    hasAirlines: snapshot.airlineCount != null && snapshot.airlineCount > 0,
    hasStops: !!snapshot.stops,
    hasPrice: !!(snapshot.price && snapshot.price.amount > 0),
    hasFreshPrice: !!snapshot.priceIsFresh,
    hasPriceSamples: Number(route.price_sample_count || 0) >= 3,
    hasItineraries: Number(route.itinerary_count || 0) > 0,
    hasDirectFlightSignal: route.direct_flight_available != null,
  };
  const independentFactCount = [facts.hasDistance, facts.hasDuration, facts.hasAirlines, facts.hasStops, facts.hasPrice, facts.hasItineraries, facts.hasDirectFlightSignal].filter(Boolean).length;
  return { ...facts, independentFactCount, searchIntentReady: independentFactCount >= 3 };
}

// [SEO-GENERATED-FRESHNESS] Generated route copy (seo_intro_html/seo_faq)
// contains persisted operational facts and can become stale independently of
// the route row's generic updated_at. If either operational insights or price
// aggregates were refreshed after seo_generated_at, discard only that generated
// copy and let the renderer fall back to its current data-driven content. This
// is intentionally code-level: no DB mutation and no invented replacement data.
function invalidateStaleGeneratedSeo(route) {
  const hasGeneratedCopy = Boolean(route.seo_intro_html)
    || (Array.isArray(route.seo_faq) && route.seo_faq.length > 0);
  if (!hasGeneratedCopy) return false;

  const generatedAt = Date.parse(route.seo_generated_at || '');
  if (!Number.isFinite(generatedAt)) {
    route.seo_intro_html = null;
    route.seo_faq = null;
    return true;
  }

  const sourceUpdatedAt = [route.insights_updated_at, route.price_updated_at]
    .map((value) => Date.parse(value || ''))
    .filter(Number.isFinite);
  const stale = sourceUpdatedAt.some((updatedAt) => updatedAt > generatedAt);
  if (!stale) return false;

  route.seo_intro_html = null;
  route.seo_faq = null;
  return true;
}

function buildRouteSnapshot(route, now = Date.now()) {
  invalidateStaleGeneratedSeo(route);

  const routeAirlines = Array.isArray(route.airlines) ? route.airlines : [];
  const price = resolveCanonicalPrice(route);
  const routeUpdatedAt = route.insights_updated_at
    || (route.intelligence && route.intelligence.operational && route.intelligence.operational.updatedAt)
    || null;

  const distanceKm = validPositiveNumber(route.distance_km);
  const avgDurationMin = validPositiveNumber(route.avg_duration_min);
  const minDurationMin = validPositiveNumber(route.min_duration_min);

  const snapshot = {
    routeId: route.slug || null,
    origin: route.origin_iata || null,
    destination: route.destination_iata || null,
    distanceKm,
    price,
    priceUpdatedAt: route.price_updated_at || null,
    priceIsFresh: price && price.checkedAt ? isFresh(price.checkedAt, PRICE_TTL_MS, now) : false,
    avgDurationMin,
    minDurationMin,
    stops: deriveStops(route),
    airlineCount: deriveAirlineCount(route, routeAirlines),
    routeAirlines,
    routeUpdatedAt,
    routeDataIsFresh: routeUpdatedAt ? isFresh(routeUpdatedAt, ROUTE_DATA_TTL_MS, now) : false,
  };
  snapshot.seoSignals = deriveSeoSignals(route, snapshot);
  return snapshot;
}

function validateSnapshot(route, snapshot) {
  const errors = [];
  const routeAirlines = snapshot.routeAirlines;
  if (routeAirlines.length) {
    const unique = new Set(routeAirlines.map((a) => a && (a.iata_code || a.code || a.name)).filter(Boolean));
    if (route.airline_count != null && Number(route.airline_count) !== unique.size) {
      errors.push(`airline-count-mismatch: airline_count=${route.airline_count} but unique(routeAirlines)=${unique.size}`);
    }
  }
  if (snapshot.stops) {
    const { nonstop, oneStop, twoPlus, total } = snapshot.stops;
    if (nonstop + oneStop + twoPlus !== total) errors.push(`stop-total-mismatch: ${nonstop}+${oneStop}+${twoPlus} !== ${total}`);
  } else if (route.stop_distribution && typeof route.stop_distribution === 'object') {
    errors.push('stop-distribution-empty: stop_distribution present but no valid positive total');
  }
  if (snapshot.price && !(snapshot.price.amount > 0 && snapshot.price.currency)) {
    errors.push(`invalid-price: ${JSON.stringify(snapshot.price)}`);
  }
  if (snapshot.price && snapshot.price.currency && !/^[A-Z]{3}$/.test(snapshot.price.currency)) {
    errors.push(`invalid-currency: ${JSON.stringify(snapshot.price.currency)}`);
  }
  if (snapshot.priceIsFresh && !(snapshot.price && snapshot.price.checkedAt)) errors.push('stale-as-live: priceIsFresh without a checkedAt timestamp');
  if (snapshot.distanceKm == null && route.distance_km != null) errors.push('invalid-distance');
  if (snapshot.avgDurationMin == null && route.avg_duration_min != null) errors.push('invalid-average-duration');
  if (snapshot.minDurationMin == null && route.min_duration_min != null) errors.push('invalid-minimum-duration');
  if (snapshot.origin && snapshot.destination && snapshot.origin === snapshot.destination) errors.push(`origin-equals-destination: ${snapshot.origin}`);
  return errors;
}

// Only contradictions that make the public page itself invalid are critical.
const CRITICAL_PREFIXES = [
  'origin-equals-destination',
  'invalid-price',
  'invalid-currency',
  'invalid-distance',
  'invalid-average-duration',
  'invalid-minimum-duration',
  'stop-total-mismatch',
];
function criticalSnapshotErrors(route, snapshot) {
  return validateSnapshot(route, snapshot).filter((e) => CRITICAL_PREFIXES.some((p) => e.startsWith(p)));
}

module.exports = { buildRouteSnapshot, validateSnapshot, criticalSnapshotErrors, resolveCanonicalPrice, deriveAirlineCount, deriveStops, deriveSeoSignals, invalidateStaleGeneratedSeo };
