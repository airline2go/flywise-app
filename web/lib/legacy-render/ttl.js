// [TTL-POLICY] Single source of truth for SEO freshness windows.
//
// Client live-price freshness, persisted-price freshness, route-data freshness
// and Next ISR windows are intentionally separate concerns. These values mirror
// the actual production route handlers; tests parse those literal revalidate
// values so the policy cannot silently drift.
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const LIVE_PRICE_TTL_MS = 24 * HOUR;
const PRICE_TTL_MS = 7 * DAY;
const ROUTE_DATA_TTL_MS = 30 * DAY;

// Flight-route pages are on-demand ISR and need a short safety-net because the
// route catalogue can change outside a frontend deployment.
const ROUTE_PAGE_REVALIDATE_S = 15 * MINUTE / 1000;

// Entity pages (city/country/airport/airline) intentionally revalidate more
// slowly because their catalogue content changes much less frequently.
const ENTITY_PAGE_REVALIDATE_S = 24 * HOUR / 1000;

// The sitemap index is a 1h safety-net. Route child sitemaps are separately
// refreshed every 15m, so new/removed routes propagate without rebuilding the
// whole index on every request.
const SITEMAP_REVALIDATE_S = HOUR / 1000;
const SITEMAP_CHILD_REVALIDATE_S = 15 * MINUTE / 1000;

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
  ENTITY_PAGE_REVALIDATE_S,
  SITEMAP_REVALIDATE_S,
  SITEMAP_CHILD_REVALIDATE_S,
  isFresh,
};
