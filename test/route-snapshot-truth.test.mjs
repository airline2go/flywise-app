import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildRouteSnapshot, resolveCanonicalPrice, deriveStops } = require('../web/lib/legacy-render/route-snapshot.js');

test('canonical price never invents EUR when currency is missing', () => {
  assert.equal(resolveCanonicalPrice({ price_min: 99, price_sample_count: 3, price_currency: null }), null);
});

test('canonical price accepts a real currency and preserves it', () => {
  const price = resolveCanonicalPrice({ price_min: 99, price_sample_count: 3, price_currency: 'usd', price_updated_at: '2026-09-15T12:00:00Z' });
  assert.deepEqual(price, {
    amount: 99,
    currency: 'USD',
    checkedAt: '2026-09-15T12:00:00Z',
    source: 'aggregate-min',
  });
});

test('malformed stop distributions are omitted instead of becoming plausible facts', () => {
  assert.equal(deriveStops({ stop_distribution: { '0': 4, '1': -1 } }), null);
  assert.equal(deriveStops({ stop_distribution: { '0': 4, bogus: 2 } }), null);
});

test('invalid persisted route numbers are not exposed by the snapshot', () => {
  const snapshot = buildRouteSnapshot({
    slug: 'test-route',
    origin_iata: 'AAA',
    destination_iata: 'BBB',
    distance_km: 1000,
    avg_duration_min: 120,
    min_duration_min: 90,
    airline_count: 1.5,
    stop_distribution: { '0': 2 },
  });
  assert.equal(snapshot.airlineCount, null);
  assert.equal(snapshot.distanceKm, 1000);
  assert.equal(snapshot.avgDurationMin, 120);
});
