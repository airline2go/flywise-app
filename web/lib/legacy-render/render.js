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
import { listCities, listCountries, getCity, getCountry, getAirport, getAirline, getRoutePage, listRoutePages } from '../content-api';
import { computeRelatedRoutes } from '../related-routes';
import cityMod from './render-city.js';
import countryMod from './render-country.js';
import airportMod from './render-airport.js';
import airlineMod from './render-airline.js';
import flightRouteMod from './render-flight-route.js';
import dataMod from './data.js';

const { renderCityPage } = cityMod;
const { renderCountryPage } = countryMod;
const { renderAirportPage } = airportMod;
const { renderAirlinePage } = airlineMod;
const { renderFlightRoutePage } = flightRouteMod;
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
  return renderCityPage(data.city, data.routes, lang).html;
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
  return renderAirportPage(data.airport, data.routes, lang).html;
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
