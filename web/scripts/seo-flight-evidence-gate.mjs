import { pathToFileURL } from 'node:url';

const API_BASE = (process.env.API_BASE || 'https://api.airpiv.com').replace(/\/$/, '');
const PAGE_SIZE = 1000;
const MAX_PAGES = 10000;
const DETAIL_SAMPLE_SIZE = 40;

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

// Public list responses intentionally strip heavy evidence columns after the
// backend has computed the authoritative `indexable` flag. Therefore this gate
// validates that flag across the full list and validates the underlying evidence
// against detail responses for a deterministic spread of indexable routes.
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

function sampleRoutes(routes) {
  if (routes.length <= DETAIL_SAMPLE_SIZE) return routes;
  const out = [];
  for (let i = 0; i < DETAIL_SAMPLE_SIZE; i += 1) {
    out.push(routes[Math.floor((i * (routes.length - 1)) / (DETAIL_SAMPLE_SIZE - 1))]);
  }
  return [...new Map(out.map((r) => [r.slug, r])).values()];
}

export async function runGate() {
  const routes = await listRoutes();
  if (!routes.length) throw new Error('Flight evidence gate found zero published routes.');

  const failures = [];
  const indexableRoutes = routes.filter((r) => r.indexable === true);
  const sampled = sampleRoutes(indexableRoutes);
  let sampledEvidence = 0;

  for (const route of routes) {
    const origin = String(route.origin_iata || '').toUpperCase();
    const destination = String(route.destination_iata || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      failures.push({ slug: route.slug, code: 'INVALID_IATA', origin, destination });
    }
  }

  for (const route of sampled) {
    const detail = await getJSON(`/route-pages/${encodeURIComponent(route.slug)}`);
    const row = detail?.route || detail;
    if (!row || row.indexable !== true || (!hasPersistedFlightEvidence(row) && !hasManualEditorialContent(row))) {
      failures.push({ slug: route.slug, code: 'INDEXABLE_WITHOUT_DETAIL_EVIDENCE' });
    } else {
      sampledEvidence += 1;
    }
  }

  const result = {
    apiBase: API_BASE,
    routes: routes.length,
    indexableRoutes: indexableRoutes.length,
    sampledIndexableRoutes: sampled.length,
    sampledEvidence,
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
