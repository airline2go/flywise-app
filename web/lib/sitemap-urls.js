// [MULTI-LANG-SITEMAP] Runtime replacement for the old build-time sitemap
// writer in flywise-app/build/generate-pages.js. That script rendered every
// entity page at deploy time and collected each page's seo.canonicalUrl into
// per-language buckets (summary.urlsByLang), then wrote sitemap-{lang}.xml.
// Here there is no build-time render pass — the SEO pages are ISR route
// handlers generated on demand — so the sitemap URLs are constructed directly
// from the same content-api list endpoints + the same urlFor() rule that the
// pages themselves use for their canonical tags. The resulting URLs are
// byte-identical to the old canonicalUrls (verified: city/{slug},
// country/{code}, airport/{code}, airline/{code}, flights/{slug}, blog/{slug},
// German unprefixed at root, every other language under /xx/).
//
// [REAL-LASTMOD] Each entry now carries its own real <lastmod> (see
// sitemap-serialize.mjs for the pure, unit-tested logic) instead of a
// same-for-every-URL "today".
import {
  listCities,
  listCountries,
  listAirlines,
  listRoutePages,
  listBlogPosts,
} from './content-api';
import { urlFor } from './languages';
import {
  toLastmod,
  routeLastmod,
  airportEntriesFromRoutes,
  urlsetXml,
} from './sitemap-serialize.mjs';

// Build the full ordered list of sitemap entries ({ loc, lastmod }) for one
// language. Order mirrors the old build's generation order (city, country,
// airport, airline, flights, blog) — not significant to crawlers, but keeping
// it identical makes diffs against the old files trivial. cities/countries/
// airlines only carry created_at in the schema today, so `updated_at ||
// created_at` cleanly uses a real edit date if one is ever added and the
// creation date until then.
export async function buildUrlsForLang(lang) {
  // [MULTILANG-BLOG] Every language now has a blog — listBlogPosts(lang) returns
  // that language's own slugs (German from the base list, others from
  // blog_post_translations).
  const [cities, countries, airlines, routes, blogPosts] = await Promise.all([
    listCities(),
    listCountries(),
    listAirlines(),
    listRoutePages(),
    listBlogPosts(lang),
  ]);

  const urls = [];
  // The HTML sitemap hub + the "popular destinations" category page — both are
  // crawlable hub pages with no meaningful per-entry lastmod, so they carry none.
  urls.push({ loc: urlFor(lang, 'sitemap'), lastmod: null });
  urls.push({ loc: urlFor(lang, 'popular'), lastmod: null });
  for (const c of cities) urls.push({ loc: urlFor(lang, `city/${c.city_slug}`), lastmod: toLastmod(c.updated_at || c.created_at) });
  for (const c of countries) urls.push({ loc: urlFor(lang, `country/${c.code}`), lastmod: toLastmod(c.updated_at || c.created_at) });
  for (const [code, lastmod] of airportEntriesFromRoutes(routes)) urls.push({ loc: urlFor(lang, `airport/${code}`), lastmod });
  for (const a of airlines) urls.push({ loc: urlFor(lang, `airline/${a.iata_code}`), lastmod: toLastmod(a.updated_at || a.created_at) });
  for (const r of routes) urls.push({ loc: urlFor(lang, `flights/${r.slug}`), lastmod: routeLastmod(r) });
  for (const p of blogPosts) urls.push({ loc: urlFor(lang, `blog/${p.slug}`), lastmod: toLastmod(p.updated_at || p.published_at) });
  return urls;
}

// Re-exported so sitemap-route.js keeps importing both from here.
export { urlsetXml };
