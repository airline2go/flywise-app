import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  SEO_CORE_ROUTES,
  seoCoreOnlyEnabled,
  isSeoCoreRoute,
  getRouteIndexabilityDecision,
} = require('../lib/legacy-render/route-evidence.js');

test('frontend recovery core contains exactly 70 routes', () => {
  assert.equal(SEO_CORE_ROUTES.size, 70);
});

test('recovery core is enabled by default and can be rolled back', () => {
  const previous = process.env.SEO_ROUTE_CORE_ONLY;
  delete process.env.SEO_ROUTE_CORE_ONLY;
  assert.equal(seoCoreOnlyEnabled(), true);
  process.env.SEO_ROUTE_CORE_ONLY = '0';
  assert.equal(seoCoreOnlyEnabled(), false);
  if (previous == null) delete process.env.SEO_ROUTE_CORE_ONLY;
  else process.env.SEO_ROUTE_CORE_ONLY = previous;
});

test('known core route is allowed and unknown route is not', () => {
  assert.equal(isSeoCoreRoute('lgw-pmi'), true);
  assert.equal(isSeoCoreRoute('zrh-jfk'), true);
  assert.equal(isSeoCoreRoute('palma-de-mallorca-duesseldorf'), true);
  assert.equal(isSeoCoreRoute('alicante-barcelona'), true);
  assert.equal(isSeoCoreRoute('ibiza-duesseldorf'), true);
  assert.equal(isSeoCoreRoute('outside-core'), false);
});

test('backend explicit noindex cannot be resurrected by frontend content', () => {
  const decision = getRouteIndexabilityDecision({
    slug: 'lgw-pmi',
    indexable: false,
    intro_text: 'editorial content',
    itinerary_count: 100,
  }, { coreOnly: true });
  assert.equal(decision.indexable, false);
  assert.equal(decision.reason, 'EXPLICIT BACKEND NOINDEX VERDICT');
});

test('route outside core is pruned even when it has strong evidence', () => {
  const decision = getRouteIndexabilityDecision({
    slug: 'outside-core',
    indexable: true,
    avg_duration_min: 120,
    insights_updated_at: new Date().toISOString(),
  }, { coreOnly: true });
  assert.equal(decision.indexable, false);
  assert.equal(decision.reason, 'OUTSIDE SEO CORE (pruned)');
});
