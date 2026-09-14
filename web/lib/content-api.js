// Thin fetch/service layer for flywise-server's public content endpoints
// (`content.routes.js`) — all unauthenticated GETs, zero auth complexity.
import { cache } from 'react';
import { buildGeoIndex } from './geo.js';
import { getRouteLocale } from './route-locale-context.js';

const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';
const DEFAULT_REVALIDATE = 86400;

async function fetchJSON(path, { revalidate = DEFAULT_REVALIDATE, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { next: { revalidate } });
      if (res.ok) return res.json();
      const err = new Error(`HTTP ${res.status} for ${path}`);
      err.status = res.status;
      if (res.status !== 429 && res.status < 500) throw err;
      lastErr = err;
    } catch (e) {
      if (e.status && e.status !== 429 && e.status < 500) throw e;
      lastErr = e;
    }
    if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
  }
  throw lastErr;
}

async function listCities() { const data = await fetchJSON('/cities'); return data.cities || []; }
async function listCountries() { const data = await fetchJSON('/countries'); return data.countries || []; }
async function listAirports() { const data = await fetchJSON('/airports'); return data.airports || []; }
async function listAirlines() { const data = await fetchJSON('/airlines'); return data.airlines || []; }

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

const listRouteRedirects = cache(async () => {
  try {
    const data = await fetchJSON('/route-redirects');
    return (data && data.redirects) || [];
  } catch (e) {
    console.warn(`[listRouteRedirects] falling back to none: ${e.message}`);
    return [];
  }
});

async function resolvePersistentRedirect(slug) {
  const redirects = await listRouteRedirects();
  if (!redirects.length) return null;
  const bySource = new Map(redirects.map((r) => [r.source_slug, r]));
  const hit = bySource.get(slug);
  if (!hit) return null;
  let target = hit.target_slug;
  const next = bySource.get(target);
  if (next && next.source_slug !== next.target_slug) target = next.target_slug;
  return { target, status: hit.status_code || 301 };
}

async function listBlogPosts(lang) {
  const path = lang && lang !== 'de' ? `/blog-posts?lang=${encodeURIComponent(lang)}` : '/blog-posts';
  const data = await fetchJSON(path);
  return data.posts || [];
}

const fetchAllSitemapData = cache(async (type, query = '') => {
  const items = [];
  for (let page = 0; ; page++) {
    const path = `/sitemap-data/${type}?page=${page}${query ? '&' + query : ''}`;
    let data;
    try { data = await fetchJSON(path); }
    catch (e) { if (e && e.status === 404 && page === 0) return []; throw e; }
    if (data && Array.isArray(data.items)) items.push(...data.items);
    if (!data || !data.hasMore) break;
  }
  return items;
});

const sitemapRoutes = () => fetchAllSitemapData('routes');
const sitemapCities = () => fetchAllSitemapData('cities');
const sitemapCountries = () => fetchAllSitemapData('countries');
const sitemapAirlines = () => fetchAllSitemapData('airlines');
const sitemapAirports = () => fetchAllSitemapData('airports');
const sitemapBlog = (lang) => fetchAllSitemapData('blog', lang && lang !== 'de' ? `lang=${encodeURIComponent(lang)}` : '');

async function fetchDetailOrNull(path) {
  try { return await fetchJSON(path); }
  catch (e) { if (e && e.status === 404) return null; throw e; }
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

async function getRoutePage(slug, lang = getRouteLocale()) {
  const encoded = encodeURIComponent(slug);
  if (lang && lang !== 'de') {
    const data = await fetchDetailOrNull(`/route-pages/${encoded}/localized?lang=${encodeURIComponent(lang)}`);
    if (!data || !data.route) return null;
    const route = data.route;
    const seo = route.seo || {};
    return {
      ...route,
      seo_lang: lang,
      seo_title: seo.title || null,
      seo_meta_description: seo.metaDescription || null,
      seo_intro_html: seo.introHtml || null,
      seo_faq: Array.isArray(seo.faq) ? seo.faq : null,
      localized_hreflang: data.hreflang || [],
    };
  }
  const data = await fetchDetailOrNull(`/route-pages/${encoded}`);
  return (data && data.route) || null;
}

const routeRenders = cache(async (slug) => {
  if (!slug) return false;
  try { return !!(await getRoutePage(slug)); }
  catch { return true; }
});

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

async function getReviews({ route = null, limit = 20, offset = 0 } = {}) {
  const empty = { reviews: [], total: 0, aggregate: { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } };
  const qs = new URLSearchParams();
  if (route) qs.set('route', route);
  if (limit) qs.set('limit', String(limit));
  if (offset) qs.set('offset', String(offset));
  const q = qs.toString();
  try {
    const data = await fetchJSON(`/reviews${q ? `?${q}` : ''}`);
    if (!data || !data.ok) return empty;
    return { reviews: data.reviews || [], total: data.total || 0, aggregate: data.aggregate || empty.aggregate };
  } catch { return empty; }
}

const getGeoIndex = cache(async () => {
  const [cities, countries] = await Promise.all([listCities(), listCountries()]);
  return buildGeoIndex(cities, countries);
});

export {
  listCities, listCountries, listAirports, listAirlines, listRoutePages, listBlogPosts,
  listRouteRedirects, resolvePersistentRedirect,
  getCity, getCountry, getAirport, getAirline, getRoutePage, routeRenders, getRelatedRoutes, getBlogPost,
  getReviews,
  getGeoIndex,
  sitemapRoutes, sitemapCities, sitemapCountries, sitemapAirlines, sitemapAirports, sitemapBlog,
};
