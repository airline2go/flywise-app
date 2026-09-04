// P0-4 — Explicit rendering / response-contract regression tests.
//
// The contract (documented in docs/seo/RESPONSE-CONTRACT.md) is:
//   VALID_PAGE      → 200, indexable (index,follow)
//   DATA_NOT_FOUND  → 404 (never an empty 200)
//   UPSTREAM_ERROR  → the fetch THROWS → the route 5xx's and ISR keeps serving
//                     the last good page; it is NEVER swallowed into a 200 or a
//                     cached noindex placeholder
//   INVALID_DATA    → 200 but noindex,follow (broken/contradictory data must
//                     not be pushed to the index)
//   THIN_CONTENT    → 200 but noindex,follow (covered by render-seo-guards)
//
// These tests pin the two halves NOT already covered by render-seo-guards:
//   (a) the transport layer (content-api.js) — 404→null vs error→throw, and
//   (b) INVALID_DATA classification + the renderer's noindex on a critical
//       (non-thin) data contradiction.
//
// content-api.js uses the repo's extensionless relative-import convention
// (`import … from './geo'`), which Next resolves but plain node ESM does not.
// Rather than change that production convention just to test it, we register a
// TEST-SCOPED resolver hook that appends `.js` to extensionless relative
// specifiers. node runs each test file in its own process, so this hook is
// isolated to this file and touches nothing shipped.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { createRequire } from 'node:module';

const EXT_HOOK = `
export async function resolve(specifier, context, next) {
  if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/i.test(specifier)) {
    try { return await next(specifier + '.js', context); } catch { /* fall through */ }
  }
  return next(specifier, context);
}`;
register(`data:text/javascript,${encodeURIComponent(EXT_HOOK)}`);

let api;
let serve;
before(async () => {
  api = await import('../lib/content-api.js');
  serve = await import('../lib/legacy-render/serve.js');
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function mockFetch(sequence) {
  // sequence: an array of responses to return in order (last repeats).
  let i = 0;
  globalThis.fetch = async () => {
    const r = sequence[Math.min(i, sequence.length - 1)];
    i += 1;
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body ?? {} };
  };
}

// ─── DATA_NOT_FOUND: a real backend 404 becomes null → the route answers 404 ──
test('content-api: a 404 detail fetch returns null (DATA_NOT_FOUND, not an error)', async () => {
  mockFetch([{ status: 404 }]);
  assert.equal(await api.getRoutePage('nowhere-city'), null);
  mockFetch([{ status: 404 }]);
  assert.equal(await api.getCity('ghost'), null);
  mockFetch([{ status: 404 }]);
  assert.equal(await api.getAirport('ZZZ'), null);
});

// ─── UPSTREAM_ERROR: a 5xx or network error THROWS (never a 200/empty) ────────
test('content-api: a persistent 5xx throws (UPSTREAM_ERROR → 5xx, ISR keeps stale)', async () => {
  mockFetch([{ status: 500 }]);
  await assert.rejects(() => api.getRoutePage('berlin-munich'), /HTTP 500/);
});

test('content-api: a network error throws rather than resolving to empty data', async () => {
  mockFetch([new Error('ECONNRESET')]);
  await assert.rejects(() => api.listRoutePages(), /ECONNRESET/);
});

test('content-api: a transient 5xx then 200 recovers (bounded retry)', async () => {
  mockFetch([{ status: 503 }, { status: 200, body: { routes: [{ slug: 'a-b' }] } }]);
  const routes = await api.listRoutePages();
  assert.equal(routes.length, 1);
  assert.equal(routes[0].slug, 'a-b');
});

test('content-api: a non-404 4xx (e.g. 400) fails fast and throws', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return { ok: false, status: 400, json: async () => ({}) }; };
  await assert.rejects(() => api.getCountry('??'), /HTTP 400/);
  assert.equal(calls, 1, 'must not retry a non-429 4xx');
});

// ─── Transport wrapper: null → 404, html → 200 text/html ──────────────────────
test('serve.htmlResponse: null → 404, html → 200 text/html', async () => {
  const notFound = serve.htmlResponse(null);
  assert.equal(notFound.status, 404);

  const ok = serve.htmlResponse('<html><body>hi</body></html>');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'text/html; charset=utf-8');
});

// ─── INVALID_DATA classification (route-snapshot pure functions) ──────────────
const require = createRequire(import.meta.url);
const { buildRouteSnapshot, validateSnapshot, criticalSnapshotErrors } = require('../lib/legacy-render/route-snapshot.js');

test('validateSnapshot: a clean route has no violations', () => {
  const route = { slug: 'ber-muc', origin_iata: 'BER', destination_iata: 'MUC', distance_km: 500 };
  assert.deepEqual(validateSnapshot(route, buildRouteSnapshot(route)), []);
});

test('criticalSnapshotErrors: origin === destination is CRITICAL (INVALID_DATA)', () => {
  const route = { slug: 'ber-ber', origin_iata: 'BER', destination_iata: 'BER', distance_km: 500 };
  const errs = criticalSnapshotErrors(route, buildRouteSnapshot(route));
  assert.ok(errs.some((e) => e.startsWith('origin-equals-destination')), errs.join(','));
});

test('criticalSnapshotErrors: a non-positive price is CRITICAL', () => {
  const route = { slug: 'a-b', origin_iata: 'A', destination_iata: 'B' };
  const snapshot = { ...buildRouteSnapshot(route), price: { amount: 0, currency: 'EUR' } };
  const errs = criticalSnapshotErrors(route, snapshot);
  assert.ok(errs.some((e) => e.startsWith('invalid-price')), errs.join(','));
});

test('criticalSnapshotErrors: a stop-bucket total mismatch is CRITICAL', () => {
  const route = { slug: 'a-b', origin_iata: 'A', destination_iata: 'B' };
  const snapshot = { ...buildRouteSnapshot(route), stops: { nonstop: 1, oneStop: 1, twoPlus: 0, total: 5 } };
  const errs = criticalSnapshotErrors(route, snapshot);
  assert.ok(errs.some((e) => e.startsWith('stop-total-mismatch')), errs.join(','));
});

test('criticalSnapshotErrors: a stale airline-count scalar is a WARNING, not critical (no mass-noindex)', () => {
  const route = { slug: 'a-b', origin_iata: 'A', destination_iata: 'B', airline_count: 9, airlines: [{ iata_code: 'LH' }, { iata_code: 'AF' }] };
  const snapshot = buildRouteSnapshot(route);
  const all = validateSnapshot(route, snapshot);
  const critical = criticalSnapshotErrors(route, snapshot);
  assert.ok(all.some((e) => e.startsWith('airline-count-mismatch')), 'should be flagged as a warning');
  assert.equal(critical.length, 0, 'but must NOT be critical → page stays indexable');
});

// ─── INVALID_DATA end-to-end: a NON-thin route with a critical error is noindex ─
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
setGeoData(
  [{ city_slug: 'berlin', airport_codes: ['BER'], translations: { de: 'Berlin', en: 'Berlin' } }],
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }],
);
const robotsFrom = (html) => {
  const m = html.match(/<meta name="robots" content="([^"]+)">/);
  return m ? m[1] : null;
};

test('renderer: a route with real data but origin === destination is noindex (INVALID_DATA isolated from THIN)', () => {
  // distance_km present ⇒ NOT thin (render-seo-guards proves a real distance
  // indexes), so noindex here can only come from the INVALID_DATA gate.
  const route = {
    slug: 'ber-ber', origin_iata: 'BER', destination_iata: 'BER',
    origin_city: 'Berlin', destination_city: 'Berlin',
    origin_city_slug: 'berlin', destination_city_slug: 'berlin',
    origin_country: 'DE', destination_country: 'DE', distance_km: 500,
  };
  const { html } = renderFlightRoutePage(route, 'en', [], [], []);
  assert.equal(robotsFrom(html), 'noindex, follow');
});
