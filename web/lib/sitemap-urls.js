// [PER-TYPE-SITEMAPS] The sitemap index (public/sitemap.xml) now points at one
// sitemap per ENTITY TYPE (sitemap-routes.xml, -cities, -countries, -airports,
// -airlines, -blog, -popular) instead of one per LANGUAGE. Each per-type file
// carries that type's URLs in EVERY language, so total coverage is byte-for-byte
// the same set of URLs as the old per-language split — just grouped by type,
// which makes per-content-type indexing diagnosable in Search Console (routes vs
// cities vs airports coverage, each in its own report).
//
// hreflang is unaffected: it was never emitted inside these sitemaps (it lives
// in each page's <head> <link rel="alternate">), so regrouping changes nothing
// there. Each entry still carries its own real <lastmod> (see
// sitemap-serialize.mjs for the pure, unit-tested logic).
import {
  listCities,
  listCountries,
  listAirlines,
  listRoutePages,
  listBlogPosts,
} from './content-api';
import { LANGUAGE_CODES, urlFor } from './languages';
import {
  toLastmod,
  routeLastmod,
  airportEntriesFromRoutes,
  urlsetXml,
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
  for (const r of routes) eachLang(`flights/${r.slug}`, routeLastmod(r), urls);
  return urls;
}

export async function buildCityUrls() {
  const cities = await listCities();
  const urls = [];
  for (const c of cities) eachLang(`city/${c.city_slug}`, toLastmod(c.updated_at || c.created_at), urls);
  return urls;
}

export async function buildCountryUrls() {
  const countries = await listCountries();
  const urls = [];
  for (const c of countries) eachLang(`country/${c.code}`, toLastmod(c.updated_at || c.created_at), urls);
  return urls;
}

export async function buildAirportUrls() {
  // Airports have no list endpoint; the distinct set + each one's freshest date
  // is derived from the route_pages list (see airportEntriesFromRoutes).
  const routes = await listRoutePages();
  const urls = [];
  for (const [code, lastmod] of airportEntriesFromRoutes(routes)) eachLang(`airport/${code}`, lastmod, urls);
  return urls;
}

export async function buildAirlineUrls() {
  const airlines = await listAirlines();
  const urls = [];
  for (const a of airlines) eachLang(`airline/${a.iata_code}`, toLastmod(a.updated_at || a.created_at), urls);
  return urls;
}

export async function buildBlogUrls() {
  // Each language has its OWN blog slugs (German from the base list, the others
  // from blog_post_translations), so blog URLs are fetched per language rather
  // than assuming one shared slug across all of them.
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

// Re-exported so sitemap-route.js keeps importing both from here.
export { urlsetXml };
