// [VERBATIM-SEO-RENDER] Renders the SEO entity pages by calling the ORIGINAL
// build/render-*.js generators (copied verbatim into this folder) instead of
// the React reimplementations, so the HTML is byte-for-byte what production's
// SSG produced — chrome (shell.js header/footer/nav), body, meta, and JSON-LD
// all identical. Proven 1:1 by visual-parity/structure-check.mjs.
//
// The generators are CommonJS and use module-global geo lookup tables set once
// via data.setGeoData(); we populate them per-process from the same /cities +
// /countries lists the build script used. content-api's fetch cache handles
// revalidation of the underlying data.
import { listCities, listCountries, listAirports, listAirlines, getCity, getCountry, getAirport, getAirline, getRoutePage, listRoutePages, getBlogPost, listBlogPosts } from '../content-api';
import { computeRelatedRoutes } from '../related-routes';
import { airportEntriesFromRoutes } from '../sitemap-serialize.mjs';
import { localizeLinks } from '../link-localize.mjs';
import cityMod from './render-city.js';
import cityFactsMod from './city-facts.js';
import countryMod from './render-country.js';
import airportMod from './render-airport.js';
import airlineMod from './render-airline.js';
import flightRouteMod from './render-flight-route.js';
import blogPostMod from './render-blog-post.js';
import sitemapMod from './render-sitemap.js';
import popularMod from './render-popular.js';
import dataMod from './data.js';

const { renderCityPage } = cityMod;
const { buildRouteMetaMap } = cityFactsMod;
const { renderCountryPage } = countryMod;
const { renderAirportPage } = airportMod;
const { renderAirlinePage } = airlineMod;
const { renderFlightRoutePage } = flightRouteMod;
const { renderBlogPostPage } = blogPostMod;
const { renderSitemapPage } = sitemapMod;
const { renderPopularPage } = popularMod;
const { setGeoData, detectCitiesInText, localizeCity } = dataMod;

// [ROUTE-RELATED-ARTICLES] Blog posts whose text genuinely mentions this
// route's origin or destination city — the inverse of the blog page's
// "matching flight routes" block. The blog is German-source with optional
// English translations (the other 5 languages currently have none), so
// listBlogPosts(lang) returns [] there and the section is simply omitted:
// links are only ever emitted to a post that really exists in that language.
// City matching is done in the page's own language (post text + route city
// name both localized to `lang`), so an English page matches "Munich" and a
// German page matches "München". Nothing is fabricated.
const ROUTE_RELATED_ARTICLE_LIMIT = 4;
function computeRelatedArticles(route, posts, lang) {
  if (!posts || !posts.length) return [];
  const origin = String(localizeCity(route.origin_city, route.origin_iata, lang) || '').toLowerCase();
  const dest = String(localizeCity(route.destination_city, route.destination_iata, lang) || '').toLowerCase();
  return posts
    .map((p) => {
      const cities = detectCitiesInText(`${p.title || ''} ${(p.content || '').replace(/<[^>]+>/g, ' ')}`).map((c) => c.toLowerCase());
      const score = (cities.includes(origin) ? 1 : 0) + (cities.includes(dest) ? 1 : 0);
      return { post: p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, ROUTE_RELATED_ARTICLE_LIMIT)
    .map((s) => s.post);
}

// Populate the generators' geo lookup tables exactly once per process. The
// tables are idempotent (same lists → same tables), so this is safe under
// concurrency; awaited before any render so localizeCity() always has data.
let geoPromise = null;
function ensureGeo() {
  if (!geoPromise) {
    geoPromise = (async () => {
      const [cities, countries] = await Promise.all([listCities(), listCountries()]);
      setGeoData(cities, countries);
    })().catch((e) => {
      geoPromise = null; // let a later request retry rather than caching the failure
      throw e;
    });
  }
  return geoPromise;
}

// Each returns the full HTML document string, or null if the entity doesn't
// exist. All go through the original generator, so output is byte-identical to
// production's SSG.
export async function renderCityHtml(slug, lang) {
  const data = await getCity(slug);
  if (!data) return null;
  await ensureGeo();
  // Enrich the city's (metadata-light) routes with the full route-pages list
  // so the page's stats/FAQ can cite real distances, popularity, and airline
  // counts. Same cached list the sitemap/related-routes already fetch.
  const routeMetaBySlug = buildRouteMetaMap(await listRoutePages());
  return renderCityPage(data.city, data.routes, lang, routeMetaBySlug).html;
}

export async function renderCountryHtml(code, lang) {
  const data = await getCountry(code);
  if (!data) return null;
  await ensureGeo();
  const routeMetaBySlug = buildRouteMetaMap(await listRoutePages());
  return renderCountryPage(data.country, data.routes, lang, routeMetaBySlug).html;
}

export async function renderAirportHtml(code, lang) {
  const data = await getAirport(code);
  if (!data) return null;
  await ensureGeo();
  // Enrich the airport's (metadata-light) routes with the full route-pages
  // list so its stats/FAQ can cite real distances, popularity, and haul type.
  const routeMetaBySlug = buildRouteMetaMap(await listRoutePages());
  return renderAirportPage(data.airport, data.routes, lang, routeMetaBySlug).html;
}

export async function renderAirlineHtml(code, lang) {
  const data = await getAirline(code);
  if (!data) return null;
  await ensureGeo();
  const routeMetaBySlug = buildRouteMetaMap(await listRoutePages());
  return renderAirlinePage(data.airline, data.routes, lang, data.mostUsedRoutes || [], routeMetaBySlug).html;
}

// [INTERNAL-LINKING] "More flights from this origin / to this destination"
// link sets — distinct from the scored `related` list. Excludes the current
// route and its exact reverse, and dedupes against the related slugs already
// shown so no card appears twice. Mirrors build/generate-pages.js.
const CITY_ROUTE_LINK_LIMIT = 10;
function computeCityRouteLinks(route, routeList, relatedSlugs) {
  const isReverse = (r) => r.origin_city === route.destination_city && r.destination_city === route.origin_city;
  const pick = (predicate) => routeList
    .filter((r) => r.slug !== route.slug && !isReverse(r) && !relatedSlugs.has(r.slug) && predicate(r))
    .slice(0, CITY_ROUTE_LINK_LIMIT);
  return {
    fromOrigin: pick((r) => r.origin_city === route.origin_city),
    toDestination: pick((r) => r.destination_city === route.destination_city),
  };
}

export async function renderFlightRouteHtml(slug, lang) {
  const routeRaw = await getRoutePage(slug);
  if (!routeRaw) return null;
  await ensureGeo();
  // Related routes are computed from the full route list exactly as the build
  // script did (related-routes.js is its verbatim port) — not the server's
  // /related endpoint — so the "Similar flight routes" section matches 1:1.
  const [routeList, posts] = await Promise.all([listRoutePages(), listBlogPosts(lang)]);
  const related = computeRelatedRoutes(routeRaw, routeList);
  const cityLinks = computeCityRouteLinks(routeRaw, routeList, new Set(related.map((x) => x.slug)));
  const relatedArticles = computeRelatedArticles(routeRaw, posts, lang);
  return renderFlightRoutePage(routeRaw, lang, related, cityLinks, relatedArticles).html;
}

export async function renderBlogPostHtml(slug, lang) {
  // [MULTILANG-BLOG] Every site language now has a blog: German is the source
  // (blog_posts), the rest come from blog_post_translations via getBlogPost()'s
  // ?lang fetch. A language with no translation for this slug simply 404s.
  const post = await getBlogPost(slug, lang);
  if (!post) return null;
  await ensureGeo();
  const [allRoutes, allPosts] = await Promise.all([listRoutePages(), listBlogPosts(lang)]);
  // [MULTILANG-LINKS] Localize internal entity links in the article body to the
  // current language prefix (one canonical set of links serves every language).
  const localized = Object.assign({}, post, { content: localizeLinks(post.content, lang) });
  return renderBlogPostPage(localized, allRoutes, allPosts, lang).html;
}

// [HTML-SITEMAP] The crawlable sitemap hub (/sitemap, /en/sitemap, …). Pulls
// the same list endpoints the XML sitemap + entity pages already use (so it's
// always in sync with what actually exists) and derives the airport set from
// the route list exactly as sitemap-urls.js does — never linking an airport
// with no route pages behind it. Popular routes are the top slice by
// route_score; the full country/city/airport/airline lists are all included.
const SITEMAP_POPULAR_ROUTE_LIMIT = 100;
export async function renderSitemapHtml(lang) {
  const [cities, countries, airlines, airports, routes] = await Promise.all([
    listCities(),
    listCountries(),
    listAirlines(),
    listAirports(),
    listRoutePages(),
  ]);
  await ensureGeo();

  // Airport code set derived from the routes (the pages that actually exist),
  // paired with each code's richer list row for its display name.
  const airportRowByCode = new Map();
  for (const a of airports) {
    const code = a && (a.code || a.iata_code);
    if (code && !airportRowByCode.has(code)) airportRowByCode.set(code, a);
  }
  const airportList = [...airportEntriesFromRoutes(routes).keys()]
    .map((code) => ({ code, airport: airportRowByCode.get(code) || null }));

  // Top routes by real popularity signal; routes with no score sort last.
  const popularRoutes = [...routes]
    .sort((a, b) => (Number(b.route_score) || 0) - (Number(a.route_score) || 0))
    .slice(0, SITEMAP_POPULAR_ROUTE_LIMIT);

  return renderSitemapPage({ countries, cities, airports: airportList, airlines, popularRoutes }, lang).html;
}

// [POPULAR-DESTINATIONS] The /popular category hub. Rankings are computed from
// the same cached route/city lists the rest of the site uses, from real
// persisted signals only: destinations by the count of tracked routes arriving
// at the city, and "most-served routes" by observed airline_count (route_score
// is not populated yet, so it is deliberately not used here).
const POPULAR_DESTINATION_LIMIT = 30;
const POPULAR_ROUTE_LIMIT = 30;
const POPULAR_AIRLINE_LIMIT = 24;

// Run an async fn over items with a bounded concurrency — keeps the popular
// hub's per-airline detail fetches (one per airline, ~70) comfortably under
// the backend's shared rate limit instead of firing all of them at once.
async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// [POPULAR-AIRLINES] Real airline popularity by the number of routes each
// airline is observed operating. The /airlines LIST carries no usage signal, so
// the count comes from each airline's own detail endpoint (the route_airlines
// join) — one cached fetch per airline, concurrency-bounded. Airlines whose
// detail fetch fails are dropped rather than ranked at 0, and airlines with no
// observed routes are excluded. Nothing is fabricated.
async function computePopularAirlines() {
  const airlines = await listAirlines();
  const counted = await mapWithConcurrency(airlines, 6, async (a) => {
    try {
      const data = await getAirline(a.iata_code);
      const routeCount = data && Array.isArray(data.routes) ? data.routes.length : null;
      return routeCount != null ? { iata_code: a.iata_code, name: a.name, routeCount } : null;
    } catch {
      return null; // transient failure — omit rather than rank an unknown count
    }
  });
  return counted
    .filter((x) => x && x.routeCount > 0)
    .sort((a, b) => b.routeCount - a.routeCount || String(a.name).localeCompare(String(b.name)))
    .slice(0, POPULAR_AIRLINE_LIMIT);
}

export async function renderPopularHtml(lang) {
  const [routes, cities, popularAirlines] = await Promise.all([listRoutePages(), listCities(), computePopularAirlines()]);
  await ensureGeo();

  const cityBySlug = new Map();
  const iataToSlug = new Map();
  for (const c of cities) {
    cityBySlug.set(c.city_slug, c);
    for (const code of c.airport_codes || []) iataToSlug.set(code, c.city_slug);
  }

  // Arriving-route count per destination city (only cities that have a real
  // page, i.e. resolve through the geo index) — the connectivity signal.
  const arriving = new Map(); // slug -> count
  for (const r of routes) {
    const slug = iataToSlug.get(r.destination_iata);
    if (!slug) continue;
    arriving.set(slug, (arriving.get(slug) || 0) + 1);
  }
  const destinations = [...arriving.entries()]
    .map(([slug, routeCount]) => {
      const c = cityBySlug.get(slug);
      return { slug, iata: (c && c.airport_codes && c.airport_codes[0]) || null, rawName: (c && c.name) || slug, routeCount };
    })
    .sort((a, b) => b.routeCount - a.routeCount || String(a.rawName).localeCompare(String(b.rawName)))
    .slice(0, POPULAR_DESTINATION_LIMIT);

  const topRoutes = routes
    .filter((r) => r.airline_count != null && Number(r.airline_count) > 0)
    .sort((a, b) => (Number(b.airline_count) || 0) - (Number(a.airline_count) || 0))
    .slice(0, POPULAR_ROUTE_LIMIT);

  return renderPopularPage({ destinations, topRoutes, popularAirlines }, lang).html;
}
