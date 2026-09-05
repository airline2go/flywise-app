// Thin fetch/service layer for flywise-server's public content endpoints
// (`content.routes.js`) — all unauthenticated GETs, zero auth complexity.
// This is the Phase 0/1 replacement for flywise-app/build/generate-pages.js's
// fetchWithRetry()-based list/detail fetching: instead of one batch script
// fetching everything up front, each page component fetches only the data
// it needs, and Next.js's `fetch` cache (see the `next: { revalidate }`
// option below) handles caching/ISR per-URL automatically.
import { cache } from 'react';
import { buildGeoIndex } from './geo.js';

const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';

// [ISR] Time-based revalidation default. Must stay aligned with the entity
// route handlers' `export const revalidate` (currently 86400 = 24h): Next.js
// sets a route's effective revalidate to the MINIMUM of its segment config and
// every fetch() revalidation it makes, so a lower value here silently clamps the
// pages back down (a 3600 here pinned the 86400 pages to 1h). Admin edits still
// refresh affected pages immediately via /api/revalidate regardless of this
// window. 86400s = 24 hours.
const DEFAULT_REVALIDATE = 86400;

// [RESILIENCE] Bounded retry with backoff for transient upstream failures
// (network errors, 429 rate-limits, 5xx). This restores the retry behavior the
// old build/generate-pages.js had (fetchWithRetry) that the Phase-1 migration
// dropped — it matters both at build time (prerendering the top routes fires
// many detail fetches that can brush the backend's shared rate limit) and for
// first-request page generation (a single transient blip no longer turns into a
// failed render). 4xx other than 429 (e.g. a genuine 404) fails fast — retrying
// a "not found" only adds latency.
async function fetchJSON(path, { revalidate = DEFAULT_REVALIDATE, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { next: { revalidate } });
      if (res.ok) return res.json();
      const err = new Error(`HTTP ${res.status} for ${path}`);
      err.status = res.status;
      if (res.status !== 429 && res.status < 500) throw err; // non-retryable
      lastErr = err;
    } catch (e) {
      if (e.status && e.status !== 429 && e.status < 500) throw e; // non-retryable
      lastErr = e;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt)); // 300ms, 600ms
    }
  }
  throw lastErr;
}

// ─── Lists (used by generateStaticParams) ──────────────────────────────

async function listCities() {
  const data = await fetchJSON('/cities');
  return data.cities || [];
}

async function listCountries() {
  const data = await fetchJSON('/countries');
  return data.countries || [];
}

async function listAirports() {
  const data = await fetchJSON('/airports');
  return data.airports || [];
}

async function listAirlines() {
  const data = await fetchJSON('/airlines');
  return data.airlines || [];
}

// [ROUTE-PAGES-PAGINATION] P1-8. The backend /route-pages feed pages at 1000
// rows (PostgREST's cap); the catalogue is already larger, so a single fetch
// truncated the list and biased related-routes / popular-routes / internal
// linking / entity stats to the first 1000. Walk page=0,1,2,… until the server
// says hasMore is false — exactly like fetchAllSitemapData — to get the COMPLETE
// set. Wrapped in cache() so the many renders in one request share one walk.
//
// Backward-safe: an older backend that doesn't send `hasMore` returns undefined
// → we stop after page 0 (the previous single-fetch behaviour), never looping.
const listRoutePages = cache(async () => {
  const all = [];
  for (let page = 0; page < 10000; page++) {
    const data = await fetchJSON(`/route-pages?page=${page}`);
    const rows = (data && data.routes) || [];
    all.push(...rows);
    if (!data || !data.hasMore || rows.length === 0) break;
  }
  return all;
});

// [P0-4] Persistent route redirects (loser→winner and any hand-added ones).
// Cached per request like the other feeds. A missing/erroring endpoint degrades
// to no redirects (the dynamic F1 map still covers live losers) rather than
// breaking route serving — the frontend may be deployed ahead of the backend.
const listRouteRedirects = cache(async () => {
  try {
    const data = await fetchJSON('/route-redirects');
    return (data && data.redirects) || [];
  } catch (e) {
    console.warn(`[listRouteRedirects] falling back to none: ${e.message}`);
    return [];
  }
});

// Resolve a persistent redirect for a slug. Returns { target, status } or null.
// Single-hop is guaranteed at write time, but we defensively collapse one extra
// hop and stop, so a mis-seeded chain can never loop.
async function resolvePersistentRedirect(slug) {
  const redirects = await listRouteRedirects();
  if (!redirects.length) return null;
  const bySource = new Map(redirects.map((r) => [r.source_slug, r]));
  let hit = bySource.get(slug);
  if (!hit) return null;
  let target = hit.target_slug;
  const next = bySource.get(target);
  if (next && next.source_slug !== next.target_slug) target = next.target_slug; // collapse at most one extra hop
  return { target, status: hit.status_code || 301 };
}

// [MULTILANG-BLOG] German (the source) reads the base list; every other
// language reads its translated rows via ?lang=xx (served from
// blog_post_translations). Replaces the old de/en-only split.
async function listBlogPosts(lang) {
  const path = lang && lang !== 'de' ? `/blog-posts?lang=${encodeURIComponent(lang)}` : '/blog-posts';
  const data = await fetchJSON(path);
  return data.posts || [];
}

// ─── Sitemap feed (paginated, unbounded) ───────────────────────────────
// [SITEMAP-SCALE] The list endpoints above cap at PostgREST's 1000 rows, which
// would truncate a large sitemap. The dedicated /sitemap-data/<type> endpoints
// page explicitly, so we walk page=0,1,2,… until hasMore is false and get EVERY
// indexable page's { id, lastmod } (routes also carry their two IATA codes for
// airport derivation). Wrapped in cache() so the index route — which builds the
// routes AND airports sitemaps in one pass — scans the routes feed only once
// per request. Each page URL is still individually fetch-cached (ISR).
const fetchAllSitemapData = cache(async (type, query = '') => {
  const items = [];
  for (let page = 0; ; page++) {
    const path = `/sitemap-data/${type}?page=${page}${query ? '&' + query : ''}`;
    let data;
    try {
      data = await fetchJSON(path);
    } catch (e) {
      // [DEPLOY-ORDER] If the backend feed isn't live yet (frontend deployed
      // ahead of the /sitemap-data endpoints), a 404 degrades to an empty type
      // rather than 500-ing the whole sitemap; ISR keeps serving the last good
      // version and the next revalidation self-heals once the backend is up.
      // Any other error rethrows so ISR does NOT overwrite good data with a
      // partial set.
      if (e && e.status === 404 && page === 0) return [];
      throw e;
    }
    if (data && Array.isArray(data.items)) items.push(...data.items);
    if (!data || !data.hasMore) break;
  }
  return items;
});

const sitemapRoutes = () => fetchAllSitemapData('routes');
const sitemapCities = () => fetchAllSitemapData('cities');
const sitemapCountries = () => fetchAllSitemapData('countries');
const sitemapAirlines = () => fetchAllSitemapData('airlines');
// [P0-10] Single-source airport indexability (authoritative + fallback codes),
// each item { id, indexable, lastmod }. Empty when the backend feed isn't
// deployed yet (deploy-order safe) — callers fall back accordingly.
const sitemapAirports = () => fetchAllSitemapData('airports');
const sitemapBlog = (lang) => fetchAllSitemapData('blog', lang && lang !== 'de' ? `lang=${encodeURIComponent(lang)}` : '');

// ─── Detail fetches (used by individual pages) ─────────────────────────
// [RESPONSE-SHAPE] Each of these bundles the entity together with the
// route_pages that use it (confirmed directly against content.routes.js's
// res.json() calls, not assumed) — matching what the old
// render-city.js/render-country.js/render-airport.js/render-airline.js
// each expected as (entity, routes[, mostUsedRoutes]) parameters.

// [NOT-FOUND-IS-NULL] A detail endpoint returning 404 means the entity simply
// doesn't exist (e.g. an airport code like LBG that appears in search but has no
// page). That's a legitimate "not found", not a server error — return null so
// the route handler answers a clean 404 instead of letting the throw bubble to
// a 500 (bad for SEO — Google reads 500 as "site broken" — and it floods the
// error logs). Any non-404 failure still throws.
async function fetchDetailOrNull(path) {
  try {
    return await fetchJSON(path);
  } catch (e) {
    if (e && e.status === 404) return null;
    throw e;
  }
}

async function getCity(slug) {
  const data = await fetchDetailOrNull(`/cities/${encodeURIComponent(slug)}`);
  return data && data.city ? { city: data.city, routes: data.routes || [] } : null;
}

async function getCountry(code) {
  const data = await fetchDetailOrNull(`/countries/${encodeURIComponent(code)}`);
  return data && data.country ? { country: data.country, routes: data.routes || [] } : null;
}

async function getAirport(code) {
  const data = await fetchDetailOrNull(`/airports/${encodeURIComponent(code)}`);
  return data && data.airport ? { airport: data.airport, routes: data.routes || [] } : null;
}

async function getAirline(code) {
  const data = await fetchDetailOrNull(`/airlines/${encodeURIComponent(code)}`);
  return data && data.airline ? { airline: data.airline, routes: data.routes || [], mostUsedRoutes: data.mostUsedRoutes || [] } : null;
}

async function getRoutePage(slug) {
  const data = await fetchDetailOrNull(`/route-pages/${encodeURIComponent(slug)}`);
  return (data && data.route) || null;
}

async function getRelatedRoutes(slug) {
  const data = await fetchDetailOrNull(`/route-pages/${encodeURIComponent(slug)}/related`);
  return (data && data.related) || [];
}

async function getBlogPost(slug, lang) {
  const base = `/blog-posts/${encodeURIComponent(slug)}`;
  const path = lang && lang !== 'de' ? `${base}?lang=${encodeURIComponent(lang)}` : base;
  const data = await fetchDetailOrNull(path);
  return (data && data.post) || null;
}

// ─── Geo index ──────────────────────────────────────────────────────────
// [REQUEST-SCOPED-CACHE] React's `cache()` memoizes this per-request (per
// server render pass) — city/country lists are fetched once and the built
// index is shared across every localizeCity()/localizeCountry() call
// within that same request, without leaking into or racing with any
// other concurrent request. This replaces the old build script's
// call-setGeoData()-once-globally pattern; see geo.js's header comment.
const getGeoIndex = cache(async () => {
  const [cities, countries] = await Promise.all([listCities(), listCountries()]);
  return buildGeoIndex(cities, countries);
});

export {
  listCities, listCountries, listAirports, listAirlines, listRoutePages, listBlogPosts,
  listRouteRedirects, resolvePersistentRedirect,
  getCity, getCountry, getAirport, getAirline, getRoutePage, getRelatedRoutes, getBlogPost,
  getGeoIndex,
  sitemapRoutes, sitemapCities, sitemapCountries, sitemapAirlines, sitemapAirports, sitemapBlog,
};
