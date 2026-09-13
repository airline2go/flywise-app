// [REDIRECT-INTEGRITY] Production/staging guard for the ONE invariant:
//
//     NO CANONICAL REDIRECT MAY EVER TARGET A NON-RENDERABLE ROUTE.
//
// A ranking flight-route page (GSC position 3) was 301-redirecting to a URL that
// then 404'd — Google follows the 301, hits the 404, and drops both. This script
// proves that can't happen against a real deployment by exercising BOTH redirect
// sources the route handlers apply (see lib/legacy-render/render.js →
// resolveFlightRedirect):
//
//   1. Persistent redirects  (backend `/route-redirects` table)
//   2. Canonical consolidation (2+ slugs on one airport pair → a winner slug)
//
// For every redirect it can generate, it asserts the target's DETAIL endpoint
// serves a route (getRoutePage-equivalent) AND — for persistent redirects — that
// the live URL chain ends in HTTP 200, never 301 → 404. Exits non-zero on any
// violation so it can gate a production-verification CI job.
//
// Usage:
//   API_BASE=https://api.airpiv.com SITE_BASE=https://airpiv.com \
//     node scripts/verify-redirect-integrity.mjs
//
// Env: API_BASE (default https://api.airpiv.com), SITE_BASE (default
// https://airpiv.com), CHECK_LIVE=0 to skip the live-URL hop (detail-only).

const API_BASE = process.env.API_BASE || 'https://api.airpiv.com';
const SITE_BASE = process.env.SITE_BASE || 'https://airpiv.com';
const CHECK_LIVE = process.env.CHECK_LIVE !== '0';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const IATA_PAIR = /^[a-z]{3}-[a-z]{3}$/;

const failures = [];
const fail = (m) => { failures.push(m); console.error('  ✗', m); };
const ok = (m) => console.log('  ✓', m);

async function getJSON(url) {
  const res = await fetch(url, { headers: { 'user-agent': GOOGLEBOT } });
  if (!res.ok) return null;
  return res.json();
}

// Does the DETAIL endpoint serve a route for this slug? (the app's routeRenders)
async function routeRenders(slug) {
  const data = await getJSON(`${API_BASE}/route-pages/${encodeURIComponent(slug)}`);
  return !!(data && data.route);
}

// Follow the live URL and report the final status after redirects.
async function liveFinalStatus(path) {
  const res = await fetch(`${SITE_BASE}${path}`, { headers: { 'user-agent': GOOGLEBOT }, redirect: 'follow' });
  return res.status;
}

async function fetchAllRoutes() {
  const rows = [];
  for (let page = 0; ; page++) {
    const data = await getJSON(`${API_BASE}/route-pages?page=${page}`);
    const r = (data && data.routes) || [];
    rows.push(...r);
    if (!data || !data.hasMore || r.length === 0) break;
  }
  return rows;
}

function pickCanonicalSlug(slugs) {
  const sorted = [...new Set(slugs)].sort();
  const city = sorted.filter((s) => !IATA_PAIR.test(s));
  return (city.length ? city : sorted)[0];
}

async function main() {
  console.log(`[redirect-integrity] API=${API_BASE} SITE=${SITE_BASE} live=${CHECK_LIVE}`);

  // ── 1. Persistent redirects ────────────────────────────────────────────────
  console.log('\n[1] Persistent redirects (/route-redirects):');
  const rr = await getJSON(`${API_BASE}/route-redirects`);
  const redirects = (rr && rr.redirects) || [];
  console.log(`  ${redirects.length} redirect(s)`);
  for (const r of redirects) {
    const target = r.target_slug;
    if (!(await routeRenders(target))) {
      fail(`persistent ${r.source_slug} → ${target}: TARGET DOES NOT RENDER (301 → 404)`);
      continue;
    }
    if (CHECK_LIVE) {
      const status = await liveFinalStatus(`/flights/${encodeURIComponent(r.source_slug)}`);
      if (status !== 200) fail(`persistent ${r.source_slug} → ${target}: live chain ends HTTP ${status} (expected 200)`);
      else ok(`${r.source_slug} → ${target} (live 200)`);
    } else {
      ok(`${r.source_slug} → ${target} (detail renders)`);
    }
  }

  // ── 2. Canonical consolidation winners ──────────────────────────────────────
  console.log('\n[2] Canonical consolidation winners (multi-slug pairs):');
  const rows = await fetchAllRoutes();
  const byPair = new Map();
  for (const r of rows) {
    const s = r.slug, o = r.origin_iata, d = r.destination_iata;
    if (!s || !o || !d) continue;
    const k = `${o}-${d}`;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(s);
  }
  const multi = [...byPair.entries()].filter(([, v]) => new Set(v).size > 1);
  console.log(`  ${rows.length} routes, ${multi.length} multi-slug pair(s)`);
  for (const [pair, slugs] of multi) {
    const winner = pickCanonicalSlug(slugs);
    if (!(await routeRenders(winner))) {
      const alt = [];
      for (const s of new Set(slugs)) if (await routeRenders(s)) alt.push(s);
      fail(`pair ${pair}: winner ${winner} DOES NOT RENDER (losers would 301 → 404). renderable=${JSON.stringify(alt)}`);
    } else {
      ok(`pair ${pair}: winner ${winner} renders`);
    }
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  console.log('');
  if (failures.length) {
    console.error(`[redirect-integrity] FAILED: ${failures.length} violation(s) — a redirect targets a non-renderable route.`);
    process.exit(1);
  }
  console.log('[redirect-integrity] PASS: every generated redirect targets a renderable route.');
}

main().catch((e) => { console.error('[redirect-integrity] ERROR', e); process.exit(2); });
