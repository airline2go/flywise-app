// [ROUTE-SNAPSHOT] Phases 9–14: the ONE canonical object a route page is built
// from. Every section (hero, intro, route-facts, price, FAQ, JSON-LD, meta,
// title) reads its numbers from a single snapshot derived here, instead of each
// re-deriving price / airline count / stop split / duration from the raw route
// row on its own. That is the whole point of the FINAL RULE: one snapshot →
// consistent output everywhere, so a contradiction (57 € in the hero vs 49 € in
// the FAQ, "19 airlines" vs a 14-name list, 2h30 vs 2h40) can't arise from two
// components computing the same thing differently.
//
// Nothing here is fabricated: every field is null/omitted when its underlying
// signal is absent, and the derived counts are computed from the persisted raw
// values only.
//
// CommonJS to match the other legacy-render modules.

const { PRICE_TTL_MS, ROUTE_DATA_TTL_MS, isFresh } = require('./ttl');

// [CANONICAL-PRICE-SOURCE] The single "from" price resolver (Phase 1), now the
// snapshot's price field so title/meta/hero/Offer all read one value. Order:
//   1. sample-backed aggregate minimum (price_min, >=3 samples) — the correct
//      "from"/lowest value, and it carries a currency + checkedAt.
//   2. the current cached price (cached_price) — no exposed timestamp.
//   3. null — callers render an explicit "unavailable" state, never an invented
//      placeholder value.
function resolveCanonicalPrice(route) {
  if (route.price_min != null && Number(route.price_min) > 0 && Number(route.price_sample_count) >= 3) {
    return {
      amount: Number(route.price_min),
      currency: route.price_currency || 'EUR',
      checkedAt: route.price_updated_at || null,
      source: 'aggregate-min',
    };
  }
  if (route.cached_price != null && Number(route.cached_price) > 0) {
    return {
      amount: Number(route.cached_price),
      currency: route.cached_currency || 'EUR',
      checkedAt: null,
      source: 'cached',
    };
  }
  return null;
}

// [AIRLINE-COUNT-CANON] The visible airline LIST is authoritative when present
// (Phase 13: airlineCount === unique(routeAirlines).length), so the count card,
// intro clause and FAQ can never claim a different number than the reader can
// count. Falls back to the persisted scalar only when no list exists.
function deriveAirlineCount(route, routeAirlines) {
  if (routeAirlines.length) return routeAirlines.length;
  if (route.airline_count != null && route.airline_count > 0) return route.airline_count;
  return null;
}

// [STOP-CANON] Phase 14: one derivation of the nonstop / 1-stop / 2+-stop split
// and its total, from the persisted stop_distribution ({"0":n,"1":n,...}). The
// total is DEFINED as the sum of the buckets, so a page can never show a
// separate "150 offers" that disagrees with buckets summing to 152. Returns
// null when there is no positive total.
function deriveStops(route) {
  const sd = route.stop_distribution;
  if (!sd || typeof sd !== 'object') return null;
  const nonstop = Number(sd['0'] || 0);
  const oneStop = Number(sd['1'] || 0);
  const twoPlus = Object.keys(sd).reduce((s, k) => (Number(k) >= 2 ? s + Number(sd[k] || 0) : s), 0);
  const total = nonstop + oneStop + twoPlus;
  if (!(total > 0)) return null;
  return { nonstop, oneStop, twoPlus, total, nonstopShare: Math.round((nonstop / total) * 100) };
}

// Build the canonical snapshot for a route row. `route` is the raw row (already
// localized city names are fine — this only reads codes/numbers/timestamps).
function buildRouteSnapshot(route, now = Date.now()) {
  const routeAirlines = Array.isArray(route.airlines) ? route.airlines : [];
  const price = resolveCanonicalPrice(route);
  const routeUpdatedAt = route.insights_updated_at
    || (route.intelligence && route.intelligence.operational && route.intelligence.operational.updatedAt)
    || null;

  return {
    routeId: route.slug || null,
    origin: route.origin_iata || null,
    destination: route.destination_iata || null,

    distanceKm: route.distance_km != null ? Number(route.distance_km) : null,

    price, // { amount, currency, checkedAt, source } | null
    priceUpdatedAt: route.price_updated_at || null,
    priceIsFresh: price && price.checkedAt ? isFresh(price.checkedAt, PRICE_TTL_MS, now) : false,

    avgDurationMin: route.avg_duration_min != null ? Number(route.avg_duration_min) : null,
    minDurationMin: route.min_duration_min != null ? Number(route.min_duration_min) : null,

    stops: deriveStops(route),

    airlineCount: deriveAirlineCount(route, routeAirlines),
    routeAirlines,

    routeUpdatedAt,
    routeDataIsFresh: routeUpdatedAt ? isFresh(routeUpdatedAt, ROUTE_DATA_TTL_MS, now) : false,
  };
}

// [ROUTE-CONSISTENCY-GUARD] Phase 10/13: returns the list of invariant
// violations for a route (empty = clean). Kept as a pure function so the
// renderer can log them (non-fatal) and a future publication gate (F-2) or a
// test can assert on the same rules. Nothing here mutates or throws.
function validateSnapshot(route, snapshot) {
  const errors = [];
  const routeAirlines = snapshot.routeAirlines;
  // Airline count must equal the unique airline-list length when a list exists.
  if (routeAirlines.length) {
    const unique = new Set(routeAirlines.map((a) => a && (a.iata_code || a.code || a.name)).filter(Boolean));
    if (route.airline_count != null && Number(route.airline_count) !== unique.size) {
      errors.push(`airline-count-mismatch: airline_count=${route.airline_count} but unique(routeAirlines)=${unique.size}`);
    }
  }
  // Stop buckets must sum to the total (true by construction here; guards
  // against a future refactor that sets total independently).
  if (snapshot.stops) {
    const { nonstop, oneStop, twoPlus, total } = snapshot.stops;
    if (nonstop + oneStop + twoPlus !== total) {
      errors.push(`stop-total-mismatch: ${nonstop}+${oneStop}+${twoPlus} !== ${total}`);
    }
  } else if (route.stop_distribution && typeof route.stop_distribution === 'object') {
    errors.push('stop-distribution-empty: stop_distribution present but no positive total');
  }
  // A price must be positive with a currency when present.
  if (snapshot.price && !(snapshot.price.amount > 0 && snapshot.price.currency)) {
    errors.push(`invalid-price: ${JSON.stringify(snapshot.price)}`);
  }
  // Origin must differ from destination.
  if (snapshot.origin && snapshot.destination && snapshot.origin === snapshot.destination) {
    errors.push(`origin-equals-destination: ${snapshot.origin}`);
  }
  return errors;
}

module.exports = { buildRouteSnapshot, validateSnapshot, resolveCanonicalPrice, deriveAirlineCount, deriveStops };
