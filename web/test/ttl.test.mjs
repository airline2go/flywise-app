// [TTL-POLICY] Phase 12: one freshness policy for the SEO render path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ttl = require('../lib/legacy-render/ttl.js');

test('exposes the documented windows', () => {
  assert.equal(ttl.LIVE_PRICE_TTL_MS, 24 * 60 * 60 * 1000);
  assert.equal(ttl.ROUTE_PAGE_REVALIDATE_S, 24 * 60 * 60);
  assert.ok(ttl.PRICE_TTL_MS > ttl.LIVE_PRICE_TTL_MS);
  assert.ok(ttl.ROUTE_DATA_TTL_MS > ttl.PRICE_TTL_MS);
});

test('isFresh: within window is fresh, older is not', () => {
  const now = Date.parse('2026-09-03T12:00:00Z');
  assert.equal(ttl.isFresh('2026-09-03T00:00:00Z', ttl.LIVE_PRICE_TTL_MS, now), true);  // 12h old
  assert.equal(ttl.isFresh('2026-09-01T00:00:00Z', ttl.LIVE_PRICE_TTL_MS, now), false); // >2d old
});

test('isFresh: missing, malformed and future timestamps are never fresh', () => {
  const now = Date.parse('2026-09-03T12:00:00Z');
  assert.equal(ttl.isFresh(null, ttl.LIVE_PRICE_TTL_MS, now), false);
  assert.equal(ttl.isFresh('not-a-date', ttl.LIVE_PRICE_TTL_MS, now), false);
  assert.equal(ttl.isFresh('2026-09-04T00:00:00Z', ttl.LIVE_PRICE_TTL_MS, now), false); // future
});
