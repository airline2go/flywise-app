const API_BASE = (process.env.API_BASE || 'https://api.airpiv.com').replace(/\/$/, '');
const PAGE_SIZE = 1000;
const MAX_PAGES = 10000;
const DETAIL_CONCURRENCY = 4;
const DETAIL_BATCH_DELAY_MS = 250;
const MAX_429_RETRIES = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function checkRoute(route) {
  const slug = encodeURIComponent(route.slug);
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt += 1) {
    const res = await fetch(`${API_BASE}/route-pages/${slug}`);
    if (res.status !== 429 || attempt === MAX_429_RETRIES) {
      return { slug: route.slug, status: res.status };
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1000 * (attempt + 1);
    await sleep(backoff);
  }
  return { slug: route.slug, status: 429 };
}

const routes = await listRoutes();
if (!routes.length) throw new Error('Route integrity gate found zero routes; refusing to pass.');

const failures = [];
for (let i = 0; i < routes.length; i += DETAIL_CONCURRENCY) {
  const batch = routes.slice(i, i + DETAIL_CONCURRENCY);
  const results = await Promise.all(batch.map(checkRoute));
  failures.push(...results.filter((r) => r.status !== 200));
  if (i + DETAIL_CONCURRENCY < routes.length) await sleep(DETAIL_BATCH_DELAY_MS);
}

const duplicateSlugs = [...new Set(
  routes.map((r) => r.slug).filter((slug, index, all) => all.indexOf(slug) !== index)
)];

const missingIata = routes.filter((r) => !/^[A-Z]{3}$/i.test(String(r.origin_iata || '')) || !/^[A-Z]{3}$/i.test(String(r.destination_iata || '')));

console.log(JSON.stringify({
  apiBase: API_BASE,
  routes: routes.length,
  detailChecked: routes.length,
  detailFailures: failures.length,
  duplicateSlugs: duplicateSlugs.length,
  missingIata: missingIata.length,
  detailConcurrency: DETAIL_CONCURRENCY,
  detailBatchDelayMs: DETAIL_BATCH_DELAY_MS,
  sampleFailures: failures.slice(0, 25),
}, null, 2));

if (failures.length || duplicateSlugs.length || missingIata.length) {
  process.exitCode = 1;
}
