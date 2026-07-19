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
import {
  listCities,
  listCountries,
  listAirlines,
  listRoutePages,
  listBlogPosts,
} from './content-api';
import { urlFor } from './languages';

// Airports have no dedicated list endpoint (GET /airports is empty — see
// content.routes.js). The old build derived the distinct airport set from the
// route_pages list, where every row carries both endpoints' IATA codes. Mirror
// that exactly so the airport URL count matches production.
function airportCodesFromRoutes(routes) {
  const set = new Set();
  for (const r of routes) {
    if (r.origin_iata) set.add(r.origin_iata);
    if (r.destination_iata) set.add(r.destination_iata);
  }
  return [...set];
}

// Build the full ordered list of absolute URLs for one language's sitemap.
// Order mirrors the old build's generation order (city, country, airport,
// airline, flights, blog) — sitemap ordering is not significant to crawlers,
// but keeping it identical makes diffs against the old files trivial.
export async function buildUrlsForLang(lang) {
  // [MULTILANG-BLOG] Every language now has a blog — listBlogPosts(lang) returns
  // that language's own slugs (German from the base list, others from
  // blog_post_translations). Was previously de/en-only.
  const [cities, countries, airlines, routes, blogPosts] = await Promise.all([
    listCities(),
    listCountries(),
    listAirlines(),
    listRoutePages(),
    listBlogPosts(lang),
  ]);

  const urls = [];
  for (const c of cities) urls.push(urlFor(lang, `city/${c.city_slug}`));
  for (const c of countries) urls.push(urlFor(lang, `country/${c.code}`));
  for (const code of airportCodesFromRoutes(routes)) urls.push(urlFor(lang, `airport/${code}`));
  for (const a of airlines) urls.push(urlFor(lang, `airline/${a.iata_code}`));
  for (const r of routes) urls.push(urlFor(lang, `flights/${r.slug}`));
  for (const p of blogPosts) urls.push(urlFor(lang, `blog/${p.slug}`));
  return urls;
}

// Serialize a list of absolute URLs into a <urlset> document, byte-identical
// to the old build's urlsetXml() (lastmod = today, changefreq weekly,
// priority 0.7 for every entity URL).
export function urlsetXml(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
