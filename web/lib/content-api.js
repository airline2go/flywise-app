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

// [ISR] Time-based revalidation as the default for Phase 1 — see the
// migration plan's rationale for not blocking on building on-demand
// revalidation first. 3600s = 1 hour.
const DEFAULT_REVALIDATE = 3600;

async function fetchJSON(path, { revalidate = DEFAULT_REVALIDATE } = {}) {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate } });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
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
