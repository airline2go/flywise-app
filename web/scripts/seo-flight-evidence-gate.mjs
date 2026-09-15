const API_BASE = (process.env.API_BASE || 'https://api.airpiv.com').replace(/\/$/, '');
const PAGE_SIZE = 1000;
const MAX_PAGES = 10000;

async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return res.json();
}

async function listRoutes() {
  const routes = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await getJSON(`/route-pages?page=${page}`);
    const rows = Array.isArray(data?.routes) ? data.routes : [];
    routes.push(...rows.filter((r) => r?.slug));
    if (!data?.hasMore || rows.length === 0) break;
  }
  return routes;
}

const routes = await listRoutes();
if (!routes.length) throw new Error('Flight evidence gate found zero published routes.');

const failures = [];
for (const route of routes) {
  const origin = String(route.origin_iata || '').toUpperCase();
  const destination = String(route.destination_iata || '').toUpperCase();
  const itineraries = Number(route.itinerary_count || 0);
  const airlines = Number(route.airline_count || 0);

  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    failures.push({ slug: route.slug, code: 'INVALID_IATA', origin, destination });
    continue;
  }

  // A published SEO route must be backed by current itinerary evidence.
  // Direct-flight pages additionally need direct_flight_available=true.
  if (itineraries <= 0) {
    failures.push({ slug: route.slug, code: 'NO_ITINERARIES', itineraries });
  }
  if (route.direct_flight_available === true && airlines <= 0) {
    failures.push({ slug: route.slug, code: 'DIRECT_WITHOUT_AIRLINES', airlines });
  }
}

console.log(JSON.stringify({
  apiBase: API_BASE,
  routes: routes.length,
  failures: failures.length,
  sampleFailures: failures.slice(0, 50),
}, null, 2));

if (failures.length) process.exitCode = 1;
