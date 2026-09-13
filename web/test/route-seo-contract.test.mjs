// [SEO-REGRESSION-GATE] Blocking, offline, per-route SEO contract test.
//
// The existing smoke-contract.test.mjs pins the evaluatePage() JUDGEMENT against
// hand-built HTML, and scripts/smoke-test.mjs runs the contract against a LIVE
// deploy (non-blocking, post-deploy). Neither renders a REAL route page through
// the production renderer and asserts the contract in the blocking `web` CI job
// — so a renderer regression that dropped the canonical, emitted noindex on a
// good route, or broke a JSON-LD block would only surface live, after deploy.
//
// This test closes that gap: it renders representative routes through the actual
// renderFlightRoutePage() path (the same one app/[lang]/flights/[slug] serves)
// and runs the FULL smoke contract (evaluatePage, 'sitemap' profile) on the real
// output, plus the route-specific invariants the plan requires (breadcrumb,
// origin/destination names, robots ⇄ indexability). Any ERROR-level contract
// failure fails `npm test`, so a SEO regression can never merge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { evaluatePage, formatResults } from '../lib/seo/smoke-contract.mjs';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');

setGeoData(
  [
    { city_slug: 'frankfurt', airport_codes: ['FRA'], translations: { de: 'Frankfurt', en: 'Frankfurt' } },
    { city_slug: 'ibiza', airport_codes: ['IBZ'], translations: { de: 'Ibiza', en: 'Ibiza' } },
  ],
  [
    { code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } },
    { code: 'ES', translations: { de: 'Spanien', en: 'Spain' } },
  ],
);

// A route with real intelligence data — the indexable, sitemap-eligible case.
const richRoute = (over) => Object.assign({
  slug: 'ibiza-frankfurt',
  origin_iata: 'IBZ', destination_iata: 'FRA',
  origin_city: 'Ibiza', destination_city: 'Frankfurt',
  origin_city_slug: 'ibiza', destination_city_slug: 'frankfurt',
  origin_country: 'ES', destination_country: 'DE',
  distance_km: 1365, avg_duration_min: 150, airline_count: 8,
  indexable: true, // honored verbatim by the renderer's API-verdict path
}, over || {});

// Self-canonical URL for a slug in a given language (de = unprefixed root).
const selfUrl = (slug, lang) => (lang === 'de'
  ? `https://airpiv.com/flights/${slug}`
  : `https://airpiv.com/${lang}/flights/${slug}`);

function evalRoute(routeOver, lang) {
  const route = richRoute(routeOver);
  const { html } = renderFlightRoutePage(route, lang, [], {}, [], '', null);
  const url = selfUrl(route.slug, lang);
  // 'sitemap' profile = full SSR contract PLUS the sitemap invariant (a listed,
  // indexable URL must be 200, self-canonical and NOT noindex) — the strictest.
  return { route, html, url, result: evaluatePage({ url, status: 200, contentType: 'text/html; charset=utf-8', html, profile: 'sitemap' }) };
}

for (const lang of ['de', 'en']) {
  test(`indexable route passes the full SEO contract (${lang})`, () => {
    const { result } = evalRoute({}, lang);
    assert.equal(result.ok, true, `contract failures:\n${formatResults([result])}`);
  });

  test(`indexable route: canonical is self, robots index, breadcrumb + both city names present (${lang})`, () => {
    const { html, url } = evalRoute({}, lang);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), 'canonical must be self');
    assert.ok(/<meta name="robots" content="index, follow">/.test(html), 'indexable route must be index,follow');
    assert.ok(/class="breadcrumb"/.test(html), 'breadcrumb nav present');
    assert.ok(html.includes('Ibiza') && html.includes('Frankfurt'), 'both endpoint city names present');
    assert.ok(/<h1>[^<]*Frankfurt[^<]*<\/h1>/.test(html), 'destination appears in H1');
  });
}

test('a thin route (no data, no admin content) is noindex — so it is NEVER sitemap-eligible', () => {
  // indexable:false is the backend verdict for a genuinely thin route.
  const { html } = (() => {
    const route = richRoute({ slug: 'ibiza-frankfurt', indexable: false, distance_km: null, avg_duration_min: null, airline_count: null });
    return { html: renderFlightRoutePage(route, 'de', [], {}, [], '', null).html };
  })();
  assert.ok(/<meta name="robots" content="noindex, follow">/.test(html), 'thin route must be noindex,follow');
  // Guard the invariant directly: a noindex page fails the sitemap profile, which
  // is exactly why the sitemap builder must exclude it (no sitemap↔robots drift).
  const res = evaluatePage({ url: selfUrl('ibiza-frankfurt', 'de'), status: 200, contentType: 'text/html', html, profile: 'sitemap' });
  assert.equal(res.ok, false, 'a noindex page must not pass the sitemap contract');
});

test('JSON-LD emitted by the real renderer is all valid (breadcrumb + Flight + WebPage/FAQ)', () => {
  const { result } = evalRoute({}, 'de');
  const jsonldValid = result.checks.find((c) => c.name === 'jsonld-valid');
  const jsonldPresent = result.checks.find((c) => c.name === 'jsonld-present');
  assert.equal(jsonldValid.ok, true, jsonldValid.detail);
  assert.equal(jsonldPresent.ok, true, jsonldPresent.detail);
});
