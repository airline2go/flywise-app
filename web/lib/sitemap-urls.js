// [PER-TYPE-SITEMAPS] The sitemap index (/sitemap.xml, a dynamic route) points
// at one sitemap per ENTITY TYPE (sitemap-routes.xml, -cities, -countries,
// -airports, -airlines, -blog, -popular, -pages) instead of one per LANGUAGE.
// Each per-content-type file carries that type's URLs in EVERY language, which makes
// per-content-type indexing diagnosable in Search Console (routes vs cities vs
// airports coverage, each in its own report).
//
// [INDEXABLE] Every builder includes ONLY records the backend flags as
// indexable — the backend (flywise-server content endpoints) is the single
// source of truth for indexability, so a page that renders `noindex` (thin
// content) is never listed here. We exclude only records EXPLICITLY flagged
// `indexable === false`; a missing flag is treated as indexable, so the sitemap
// never collapses to empty if it is ever deployed ahead of the backend field.
//
// [SHARDING] Builders return the full { loc, lastmod } list for a type; the
// route handlers shard it into ≤50k-URL / ≤50MB files (chunkUrls) and the index
// enumerates the shards. Adding pages/types or crossing a shard boundary needs
// no code change here.
//
// hreflang is unaffected: it was never emitted inside these sitemaps (it lives
// in each page's <head> <link rel="alternate">). Each entry carries its own real
// <lastmod> (see sitemap-serialize.mjs for the pure, unit-tested logic).
import {
  listAirports,
  sitemapRoutes,
  sitemapCities,
  sitemapCountries,
  sitemapAirlines,
  sitemapAirports,
  sitemapBlog,
  getReviews,
} from './content-api';
import { listLocalizedRouteSitemap } from './localized-route-sitemap';
import { LANGUAGE_CODES, urlFor } from './languages';
import { buildCanonicalSlugMap } from './seo/route-canonical.mjs';
import {
  airportLastmods,
  urlsetXml,
  chunkUrls,
  chunkLastmod,
  sitemapIndexXml,
  shardLoc,
  pageUrls,
  SEO_TEMPLATE_VERSIONS,
  applyTemplateFloor,
} from './sitemap-serialize.mjs';

const LANGS = LANGUAGE_CODES;

function eachLang(relativePath, lastmod, out) {
  for (const lang of LANGS) out.push({ loc: urlFor(lang, relativePath), lastmod });
}

function freshestLastmod(...values) {
  let latestMs = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    const ms = date.getTime();
    if (!Number.isNaN(ms) && ms > latestMs) latestMs = ms;
  }
  return latestMs === -Infinity ? null : new Date(latestMs).toISOString().slice(0, 10);
}

// All entity builders now consume the dedicated /sitemap-data feed, which
// pages to completion and returns only indexable rows with a resolved lastmod.
export async function buildRouteUrls() {
  const routes = await sitemapRoutes();
  const floor = SEO_TEMPLATE_VERSIONS.routes;
  const loserSlugs = buildCanonicalSlugMap(routes);
  const canonicalRoutes = routes.filter((r) => r && r.id && !loserSlugs.has(r.id));
  const urls = [];

  const deRoutes = new Map(canonicalRoutes.map((r) => [r.id, r]));
  for (const r of canonicalRoutes) {
    urls.push({
      loc: urlFor('de', `flights/${r.id}`),
      lastmod: applyTemplateFloor(
        freshestLastmod(r.lastmod, r.updated_at, r.insights_updated_at, r.created_at),
        floor,
      ),
    });
  }

  for (const lang of LANGS) {
    if (lang === 'de') continue;
    const localized = await listLocalizedRouteSitemap(lang);
    for (const item of localized) {
      const route = deRoutes.get(item.id);
      if (!route) continue;
      urls.push({
        loc: urlFor(lang, `flights/${item.id}`),
        lastmod: applyTemplateFloor(
          freshestLastmod(item.lastmod, route.lastmod, route.updated_at, route.insights_updated_at, route.created_at),
          floor,
        ),
      });
    }
  }
  return urls;
}

export async function buildCityUrls() {
  const cities = await sitemapCities();
  const floor = SEO_TEMPLATE_VERSIONS.cities;
  const urls = [];
  for (const c of cities) eachLang(`city/${c.id}`, applyTemplateFloor(c.lastmod, floor), urls);
  return urls;
}

export async function buildCountryUrls() {
  const countries = await sitemapCountries();
  const floor = SEO_TEMPLATE_VERSIONS.countries;
  const urls = [];
  for (const c of countries) eachLang(`country/${c.id}`, applyTemplateFloor(c.lastmod, floor), urls);
  return urls;
}

export async function buildAirportUrls() {
  const [routes, feed] = await Promise.all([sitemapRoutes(), sitemapAirports()]);
  const routeLastmods = new Map(airportLastmods(routes));
  const floor = SEO_TEMPLATE_VERSIONS.airports;
  const urls = [];

  if (feed && feed.length) {
    for (const a of feed) {
      if (a.indexable === false) continue;
      const lastmod = routeLastmods.get(a.id) || a.lastmod || null;
      eachLang(`airport/${a.id}`, applyTemplateFloor(lastmod, floor), urls);
    }
    return urls;
  }

  const airports = await listAirports();
  const nonIndexable = new Set(airports.filter((a) => a.indexable === false).map((a) => a.iata_code));
  for (const [code, lastmod] of routeLastmods) {
    if (nonIndexable.has(code)) continue;
    eachLang(`airport/${code}`, applyTemplateFloor(lastmod, floor), urls);
  }
  return urls;
}

export async function buildAirlineUrls() {
  const airlines = await sitemapAirlines();
  const floor = SEO_TEMPLATE_VERSIONS.airlines;
  const urls = [];
  for (const a of airlines) eachLang(`airline/${a.id}`, applyTemplateFloor(a.lastmod, floor), urls);
  return urls;
}

export async function buildBlogUrls() {
  const floor = SEO_TEMPLATE_VERSIONS.blog;
  const urls = [];
  for (const lang of LANGS) {
    const posts = await sitemapBlog(lang);
    for (const p of posts) urls.push({ loc: urlFor(lang, `blog/${p.id}`), lastmod: applyTemplateFloor(p.lastmod, floor) });
  }
  return urls;
}

export async function buildPopularUrls() {
  const urls = [];
  for (const lang of LANGS) {
    urls.push({ loc: urlFor(lang, 'sitemap'), lastmod: null });
    urls.push({ loc: urlFor(lang, 'popular'), lastmod: null });
    urls.push({ loc: urlFor(lang, 'sitemap/routes/1'), lastmod: null });
  }
  return urls;
}

export async function buildReviewsUrls() {
  const { aggregate } = await getReviews({ limit: 1 });
  if (!aggregate || !aggregate.count) return [];
  const urls = [];
  for (const lang of LANGS) urls.push({ loc: urlFor(lang, 'reviews'), lastmod: null });
  return urls;
}

export async function buildPageUrls() {
  return pageUrls();
}

export const SITEMAP_TYPES = [
  { name: 'pages', build: buildPageUrls },
  { name: 'routes', build: buildRouteUrls },
  { name: 'cities', build: buildCityUrls },
  { name: 'countries', build: buildCountryUrls },
  { name: 'airports', build: buildAirportUrls },
  { name: 'airlines', build: buildAirlineUrls },
  { name: 'blog', build: buildBlogUrls },
  { name: 'popular', build: buildPopularUrls },
  { name: 'reviews', build: buildReviewsUrls },
];
export const SITEMAP_BUILDERS = Object.fromEntries(SITEMAP_TYPES.map((t) => [t.name, t.build]));

export async function buildSitemapIndex() {
  const entries = [];
  for (const { name, build } of SITEMAP_TYPES) {
    const chunks = chunkUrls(await build());
    chunks.forEach((chunk, i) => {
      entries.push({ loc: shardLoc(name, i + 1), lastmod: chunkLastmod(chunk) });
    });
  }
  return sitemapIndexXml(entries);
}

export { urlsetXml, chunkUrls, shardLoc };