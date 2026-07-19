// Thin fetch/service layer for flywise-server's public content endpoints
// (`content.routes.js`) — all unauthenticated GETs, zero auth complexity.
// This is the Phase 0/1 replacement for flywise-app/build/generate-pages.js's
// fetchWithRetry()-based list/detail fetching: instead of one batch script
// fetching everything up front, each page component fetches only the data
// it needs, and Next.js's `fetch` cache (see the `next: { revalidate }`
// option below) handles caching/ISR per-URL automatically.
import { cache } from 'react';
import { buildGeoIndex } from './geo';

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

async function listRoutePages() {
  const data = await fetchJSON('/route-pages');
  return data.routes || [];
}

async function listBlogPosts(lang) {
  const path = lang === 'en' ? '/blog-posts-en' : '/blog-posts';
  const data = await fetchJSON(path);
  return data.posts || [];
}

// ─── Detail fetches (used by individual pages) ─────────────────────────
// [RESPONSE-SHAPE] Each of these bundles the entity together with the
// route_pages that use it (confirmed directly against content.routes.js's
// res.json() calls, not assumed) — matching what the old
// render-city.js/render-country.js/render-airport.js/render-airline.js
// each expected as (entity, routes[, mostUsedRoutes]) parameters.

async function getCity(slug) {
  const data = await fetchJSON(`/cities/${encodeURIComponent(slug)}`);
  return data.city ? { city: data.city, routes: data.routes || [] } : null;
}

async function getCountry(code) {
  const data = await fetchJSON(`/countries/${encodeURIComponent(code)}`);
  return data.country ? { country: data.country, routes: data.routes || [] } : null;
}

async function getAirport(code) {
  const data = await fetchJSON(`/airports/${encodeURIComponent(code)}`);
  return data.airport ? { airport: data.airport, routes: data.routes || [] } : null;
}

async function getAirline(code) {
  const data = await fetchJSON(`/airlines/${encodeURIComponent(code)}`);
  return data.airline ? { airline: data.airline, routes: data.routes || [], mostUsedRoutes: data.mostUsedRoutes || [] } : null;
}

async function getRoutePage(slug) {
  const data = await fetchJSON(`/route-pages/${encodeURIComponent(slug)}`);
  return data.route || null;
}

async function getRelatedRoutes(slug) {
  const data = await fetchJSON(`/route-pages/${encodeURIComponent(slug)}/related`);
  return data.related || [];
}

async function getBlogPost(slug, lang) {
  const path = lang === 'en' ? `/blog-posts-en/${encodeURIComponent(slug)}` : `/blog-posts/${encodeURIComponent(slug)}`;
  const data = await fetchJSON(path);
  return data.post || null;
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
  getCity, getCountry, getAirport, getAirline, getRoutePage, getRelatedRoutes, getBlogPost,
  getGeoIndex,
};
