import { pathToFileURL } from 'node:url';

const API_BASE = (process.env.API_BASE || 'https://api.airpiv.com').replace(/\/$/, '');
const PAGE_SIZE = 1000;
const MAX_PAGES = 10000;

function validPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function validPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function hasRealStopDistribution(sd) {
  if (!sd || typeof sd !== 'object' || Array.isArray(sd)) return false;
  const entries = Object.entries(sd);
  if (!entries.length) return false;
  return entries.every(([key, value]) => /^\d+$/.test(String(key)) && Number.isInteger(Number(value)) && Number(value) >= 0)
    && entries.some(([, value]) => Number(value) > 0);
}

// This gate validates the persisted route snapshot served by /route-pages.
// It must NOT require a fresh Duffel itinerary count: Google/SSR traffic must
// never turn a deployment verification command into a live supplier search.
// Keep this evidence contract aligned with backend hasVerifiedFlightEvidence().
export function hasPersistedFlightEvidence(route) {
  if (!route) return false;
  if (validPositiveNumber(route.avg_duration_min)) return true;
  if (validPositiveNumber(route.min_duration_min)) return true;
  if (hasRealStopDistribution(route.stop_distribution)) return true;
  if (validPositiveInteger(route.price_sample_count)) return true;
  if (validPositiveInteger(route.itinerary_count)) return true;
  return false;
}

export function hasManualEditorialContent(route) {
  return !!(route && (route.intro_text || (route.custom_faq && route.custom_faq.length)));
}

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

export async function runGate() {
  const routes = await listRoutes();
  if (!routes.length) throw new Error('Flight evidence gate found zero published routes.');

  const failures = [];
  for (const route of routes) {
    const origin = String(route.origin_iata || '').toUpperCase();
    const destination = String(route.destination_iata || '').toUpperCase();
    const airlines = Number(route.airline_count || 0);

    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      failures.push({ slug: route.slug, code: 'INVALID_IATA', origin, destination });
      continue;
    }

    if (!hasPersistedFlightEvidence(route) && !hasManualEditorialContent(route)) {
      failures.push({ slug: route.slug, code: 'NO_PERSISTED_EVIDENCE' });
    }
    if (route.direct_flight_available === true && airlines <= 0) {
      failures.push({ slug: route.slug, code: 'DIRECT_WITHOUT_AIRLINES', airlines });
    }
  }

  const result = {
    apiBase: API_BASE,
    routes: routes.length,
    failures: failures.length,
    sampleFailures: failures.slice(0, 50),
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exitCode = 1;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runGate();
}
