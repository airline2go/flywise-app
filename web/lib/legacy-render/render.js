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
import dataMod from './data.js';

const { renderCityPage } = cityMod;
const { buildRouteMetaMap } = cityFactsMod;
const { renderCountryPage } = countryMod;
const { renderAirportPage } = airportMod;
const { renderAirlinePage } = airlineMod;
const { renderFlightRoutePage } = flightRouteMod;
const { renderBlogPostPage } = blogPostMod;
const { renderSitemapPage } = sitemapMod;
const { setGeoData } = dataMod;

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
  const routeList = await listRoutePages();
  const related = computeRelatedRoutes(routeRaw, routeList);
  const cityLinks = computeCityRouteLinks(routeRaw, routeList, new Set(related.map((x) => x.slug)));
  return renderFlightRoutePage(routeRaw, lang, related, cityLinks).html;
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
