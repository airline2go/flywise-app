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
import { listCities, listCountries, getCity, getCountry, getAirport, getAirline, getRoutePage, listRoutePages, getBlogPost, listBlogPosts } from '../content-api';
import { computeRelatedRoutes } from '../related-routes';
import cityMod from './render-city.js';
import cityFactsMod from './city-facts.js';
import countryMod from './render-country.js';
import airportMod from './render-airport.js';
import airlineMod from './render-airline.js';
import flightRouteMod from './render-flight-route.js';
import blogPostMod from './render-blog-post.js';
import dataMod from './data.js';

const { renderCityPage } = cityMod;
const { buildRouteMetaMap } = cityFactsMod;
const { renderCountryPage } = countryMod;
const { renderAirportPage } = airportMod;
const { renderAirlinePage } = airlineMod;
const { renderFlightRoutePage } = flightRouteMod;
const { renderBlogPostPage } = blogPostMod;
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
  return renderCountryPage(data.country, data.routes, lang).html;
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
  return renderAirlinePage(data.airline, data.routes, lang, data.mostUsedRoutes || []).html;
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
  return renderFlightRoutePage(routeRaw, lang, related).html;
}

export async function renderBlogPostHtml(slug, lang) {
  // Blog content is DE/EN-only (independently authored per language); the
  // other five prefixed languages 404 here even though they're valid site
  // languages elsewhere — matches the original build, which only rendered
  // blog posts for 'de' and 'en'.
  if (lang !== 'de' && lang !== 'en') return null;
  const post = await getBlogPost(slug, lang);
  if (!post) return null;
  await ensureGeo();
  const [allRoutes, allPosts] = await Promise.all([listRoutePages(), listBlogPosts(lang)]);
  return renderBlogPostPage(post, allRoutes, allPosts, lang).html;
}
