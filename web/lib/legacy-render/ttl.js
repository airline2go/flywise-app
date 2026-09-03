// [TTL-POLICY] Phase 12: the SINGLE source of truth for every freshness
// window in the SEO render path. Before this, the only freshness rule was a
// bare `FRESH_MS = 24h` literal buried inside the flight-route live script;
// any other "is this fresh?" decision risked drifting to a different number.
// Every consumer — the client live-price "live" gate, the snapshot's data
// freshness, and the ISR revalidation windows — now derives from here so the
// policy lives in exactly one place.
//
// CommonJS to match the other legacy-render modules (they are required, not
// imported, by the generators).

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// A client-fetched live price is only labelled "live" when its check is within
// this window; older checks fall back to the canonical snapshot price with an
// honest "last checked on" stamp (never called "live").
const LIVE_PRICE_TTL_MS = 24 * HOUR;

// How long a persisted price aggregate (price_min/avg/max) is considered a
// current indicative figure for display. Beyond it the value is stale and
// should be treated with lower confidence (not surfaced as a fresh price).
const PRICE_TTL_MS = 7 * DAY;

// How long the route's operational intelligence (distance/duration/stops/
// airlines) is considered current. Route structure changes slowly, so this is
// deliberately long.
const ROUTE_DATA_TTL_MS = 30 * DAY;

// The ISR safety-net revalidation window for a route page, in SECONDS (Next's
// `export const revalidate` unit). Admin edits refresh immediately via
// /api/revalidate; this is only the daily fallback.
const ROUTE_PAGE_REVALIDATE_S = 24 * 60 * 60;

// True when `checkedAt` (anything Date can parse) is within `ttlMs` of `now`.
// A missing/invalid/future timestamp is NOT fresh — we never label uncertain
// data as current.
function isFresh(checkedAt, ttlMs, now = Date.now()) {
  if (!checkedAt) return false;
  const t = new Date(checkedAt).getTime();
  if (!Number.isFinite(t)) return false;
  const age = now - t;
  return age >= 0 && age <= ttlMs;
}

module.exports = {
  LIVE_PRICE_TTL_MS,
  PRICE_TTL_MS,
  ROUTE_DATA_TTL_MS,
  ROUTE_PAGE_REVALIDATE_S,
  isFresh,
};
