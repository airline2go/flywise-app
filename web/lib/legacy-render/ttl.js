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

const ROUTE_PAGE_REVALIDATE_S = 15 * MINUTE / 1000;
const ENTITY_PAGE_REVALIDATE_S = 24 * HOUR / 1000;

// Next ISR windows: the sitemap index is intentionally force-dynamic (0s) so
// backend throttling cannot poison a prerendered index; its HTTP response still
// advertises a 1-hour cache window. Route children/shards revalidate every 15m.
const SITEMAP_REVALIDATE_S = 0;
const SITEMAP_ROUTE_REVALIDATE_S = 15 * MINUTE / 1000;
const SITEMAP_SHARD_REVALIDATE_S = 15 * MINUTE / 1000;

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
  SITEMAP_ROUTE_REVALIDATE_S,
  SITEMAP_SHARD_REVALIDATE_S,
  isFresh,
};
