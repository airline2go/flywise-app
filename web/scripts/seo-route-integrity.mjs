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

async function checkRoute(route) {
  const slug = encodeURIComponent(route.slug);
  const res = await fetch(`${API_BASE}/route-pages/${slug}`);
  return { slug: route.slug, status: res.status };
}

const routes = await listRoutes();
if (!routes.length) throw new Error('Route integrity gate found zero routes; refusing to pass.');

const failures = [];
const concurrency = 20;
for (let i = 0; i < routes.length; i += concurrency) {
  const batch = routes.slice(i, i + concurrency);
  const results = await Promise.all(batch.map(checkRoute));
  failures.push(...results.filter((r) => r.status !== 200));
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
  sampleFailures: failures.slice(0, 25),
}, null, 2));

if (failures.length || duplicateSlugs.length || missingIata.length) {
  process.exitCode = 1;
}
