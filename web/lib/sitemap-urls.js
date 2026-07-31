// [PER-TYPE-SITEMAPS] The sitemap index (/sitemap.xml, a dynamic route) points
// at one sitemap per ENTITY TYPE (sitemap-routes.xml, -cities, -countries,
// -airports, -airlines, -blog, -popular, -pages) instead of one per LANGUAGE.
// Each per-type file carries that type's URLs in EVERY language, which makes
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
  listCities,
  listCountries,
  listAirlines,
  listAirports,
  listRoutePages,
  listBlogPosts,
} from './content-api';
import { LANGUAGE_CODES, urlFor } from './languages';
import {
  toLastmod,
  routeLastmod,
  airportEntriesFromRoutes,
  urlsetXml,
  chunkUrls,
  chunkLastmod,
  sitemapIndexXml,
  shardLoc,
  pageUrls,
} from './sitemap-serialize.mjs';

// Every entity URL exists in all 8 languages (German unprefixed at root, the
// other 7 under /xx/) — the same rule the pages use for their canonical tag.
const LANGS = LANGUAGE_CODES;

// Emit one { loc, lastmod } per language for a single relative path.
function eachLang(relativePath, lastmod, out) {
  for (const lang of LANGS) out.push({ loc: urlFor(lang, relativePath), lastmod });
}

export async function buildRouteUrls() {
  const routes = await listRoutePages();
  const urls = [];
  for (const r of routes) {
    if (r.indexable === false) continue;
    eachLang(`flights/${r.slug}`, routeLastmod(r), urls);
  }
  return urls;
}

export async function buildCityUrls() {
  const cities = await listCities();
  const urls = [];
  for (const c of cities) {
    if (c.indexable === false) continue;
    eachLang(`city/${c.city_slug}`, toLastmod(c.updated_at || c.created_at), urls);
  }
  return urls;
}

export async function buildCountryUrls() {
  const countries = await listCountries();
  const urls = [];
  for (const c of countries) {
    if (c.indexable === false) continue;
    eachLang(`country/${c.code}`, toLastmod(c.updated_at || c.created_at), urls);
  }
  return urls;
}

export async function buildAirportUrls() {
  // The distinct airport set + each one's freshest date is derived from the
  // route_pages list (see airportEntriesFromRoutes). Indexability comes from the
  // /airports list, which flags a thin airport (≤1 distinct destination, no admin
  // content). Airports touched by routes but not yet in the airports table carry
  // no flag and are kept (a fallback page renders for them).
  const [routes, airports] = await Promise.all([listRoutePages(), listAirports()]);
  const nonIndexable = new Set(airports.filter((a) => a.indexable === false).map((a) => a.iata_code));
  const urls = [];
  for (const [code, lastmod] of airportEntriesFromRoutes(routes)) {
    if (nonIndexable.has(code)) continue;
    eachLang(`airport/${code}`, lastmod, urls);
  }
  return urls;
}

export async function buildAirlineUrls() {
  const airlines = await listAirlines();
  const urls = [];
  for (const a of airlines) {
    if (a.indexable === false) continue;
    eachLang(`airline/${a.iata_code}`, toLastmod(a.updated_at || a.created_at), urls);
  }
  return urls;
}

export async function buildBlogUrls() {
  // Each language has its OWN blog slugs (German from the base list, the others
  // from blog_post_translations). Blog posts are hand-written published articles
  // — never thin — so there is no indexable gate here.
  const urls = [];
  for (const lang of LANGS) {
    const posts = await listBlogPosts(lang);
    for (const p of posts) urls.push({ loc: urlFor(lang, `blog/${p.slug}`), lastmod: toLastmod(p.updated_at || p.published_at) });
  }
  return urls;
}

export async function buildPopularUrls() {
  // The crawlable hub pages (/sitemap + /popular) in every language — no
  // meaningful per-entry lastmod, so they carry none.
  const urls = [];
  for (const lang of LANGS) {
    urls.push({ loc: urlFor(lang, 'sitemap'), lastmod: null });
    urls.push({ loc: urlFor(lang, 'popular'), lastmod: null });
  }
  return urls;
}

// Static marketing/legal pages (home + about + legal). The list + serialization
// live in sitemap-serialize.mjs (pageUrls) so they're unit-testable without
// importing this module's content-api/react dependency chain.
export async function buildPageUrls() {
  return pageUrls();
}

// ─── The sitemap registry — single source of truth for the index + shards ──
// Ordered list of every per-type sitemap. The dynamic index route iterates it,
// the per-type root routes bind one entry each, and the overflow shard route
// resolves a `<type>-<n>.xml` request through SITEMAP_BUILDERS. Adding a type
// here wires it into all three automatically.
export const SITEMAP_TYPES = [
  { name: 'pages', build: buildPageUrls },
  { name: 'routes', build: buildRouteUrls },
  { name: 'cities', build: buildCityUrls },
  { name: 'countries', build: buildCountryUrls },
  { name: 'airports', build: buildAirportUrls },
  { name: 'airlines', build: buildAirlineUrls },
  { name: 'blog', build: buildBlogUrls },
  { name: 'popular', build: buildPopularUrls },
];
export const SITEMAP_BUILDERS = Object.fromEntries(SITEMAP_TYPES.map((t) => [t.name, t.build]));

// Build the full <sitemapindex>: for every type, shard its URLs and reference
// each shard (with the shard's own newest <lastmod>). Types with no indexable
// URLs contribute nothing (no orphan references).
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

// Re-exported so the route handlers import everything sitemap-related from here.
export { urlsetXml, chunkUrls, shardLoc };
