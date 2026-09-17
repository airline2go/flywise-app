import { listCities, listCountries, listRoutePages } from '../content-api';
import { buildCanonicalSlugMap } from '../seo/route-canonical.mjs';
import { isRouteSitemapEligible } from './route-evidence';
import dataMod from './data.js';
import rendererMod from './render-route-sitemap.js';

const { setGeoData } = dataMod;
const { renderRouteSitemapPage, ROUTES_PER_PAGE } = rendererMod;

let geoPromise = null;
function ensureGeo() {
  if (!geoPromise) {
    geoPromise = Promise.all([listCities(), listCountries()])
      .then(([cities, countries]) => setGeoData(cities, countries))
      .catch((error) => {
        geoPromise = null;
        throw error;
      });
  }
  return geoPromise;
}

export async function getRouteSitemapPage(page) {
  const requestedPage = Number(page);
  if (!Number.isInteger(requestedPage) || requestedPage < 1) return null;

  const routes = await listRoutePages();
  const loserMap = buildCanonicalSlugMap(routes);
  const canonicalRoutes = routes
    .filter((route) => isRouteSitemapEligible(route) && !loserMap.has(route.slug))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));

  const totalPages = Math.max(1, Math.ceil(canonicalRoutes.length / ROUTES_PER_PAGE));
  if (requestedPage > totalPages) return null;

  await ensureGeo();
  const start = (requestedPage - 1) * ROUTES_PER_PAGE;
  return {
    routes: canonicalRoutes.slice(start, start + ROUTES_PER_PAGE),
    page: requestedPage,
    totalPages,
  };
}

export { isRouteSitemapEligible, ROUTES_PER_PAGE };
