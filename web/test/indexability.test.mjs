// Truth-table tests for the centralized indexability policy (P0-5,
// lib/legacy-render/indexability.js). These pin the exact per-type rule each
// renderer previously computed inline, so the policy can never silently drift
// from what shipped. The renderer-level outcomes remain guarded by
// render-seo-guards.test.mjs (behaviour-preservation of the refactor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isIndexable, robotsMeta, INDEX, NOINDEX } = require('../lib/legacy-render/indexability.js');

test('robotsMeta maps the boolean to the right meta string', () => {
  assert.equal(robotsMeta({ type: 'city', destinationCount: 5, hasAdminContent: false }), INDEX);
  assert.equal(robotsMeta({ type: 'city', destinationCount: 1, hasAdminContent: false }), NOINDEX);
});

test('flight-route: thin (no data, no admin) is noindex; real data OR admin content indexes', () => {
  assert.equal(isIndexable({ type: 'flight-route', hasRealRouteData: false, hasAdminContent: false, hasCriticalError: false }), false);
  assert.equal(isIndexable({ type: 'flight-route', hasRealRouteData: true, hasAdminContent: false, hasCriticalError: false }), true);
  assert.equal(isIndexable({ type: 'flight-route', hasRealRouteData: false, hasAdminContent: true, hasCriticalError: false }), true);
});

test('flight-route: a critical data error is noindex even when NOT thin', () => {
  assert.equal(isIndexable({ type: 'flight-route', hasRealRouteData: true, hasAdminContent: true, hasCriticalError: true }), false);
});

test('airport/city: single destination + no admin content is noindex; boundary at 2', () => {
  for (const type of ['airport', 'city']) {
    assert.equal(isIndexable({ type, destinationCount: 1, hasAdminContent: false }), false, type);
    assert.equal(isIndexable({ type, destinationCount: 2, hasAdminContent: false }), true, type);
    assert.equal(isIndexable({ type, destinationCount: 1, hasAdminContent: true }), true, type);
    assert.equal(isIndexable({ type, destinationCount: 0, hasAdminContent: false }), false, type);
  }
});

test('country: destinationCount + domesticCount decide, boundary at 2 total', () => {
  assert.equal(isIndexable({ type: 'country', destinationCount: 1, domesticCount: 0, hasAdminContent: false }), false);
  assert.equal(isIndexable({ type: 'country', destinationCount: 1, domesticCount: 1, hasAdminContent: false }), true);
  assert.equal(isIndexable({ type: 'country', destinationCount: 0, domesticCount: 2, hasAdminContent: false }), true);
  assert.equal(isIndexable({ type: 'country', destinationCount: 1, domesticCount: 0, hasAdminContent: true }), true);
});

test('airline: <=1 route + no admin content is noindex; boundary at 2', () => {
  assert.equal(isIndexable({ type: 'airline', routeCount: 1, hasAdminContent: false }), false);
  assert.equal(isIndexable({ type: 'airline', routeCount: 2, hasAdminContent: false }), true);
  assert.equal(isIndexable({ type: 'airline', routeCount: 1, hasAdminContent: true }), true);
});

test('unknown/absent page type defaults to indexable', () => {
  assert.equal(isIndexable({ type: 'sitemap-hub' }), true);
  assert.equal(isIndexable({}), true);
  assert.equal(isIndexable(null), true);
});
