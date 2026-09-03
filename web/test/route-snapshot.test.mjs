// [ROUTE-SNAPSHOT] Phases 9–14: the canonical route snapshot is the single
// object the whole page is built from. These tests pin its derivations and the
// invariant checks that stop a route with contradictory data from rendering
// numbers two different ways.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildRouteSnapshot, validateSnapshot, deriveStops, deriveAirlineCount } = require('../lib/legacy-render/route-snapshot.js');

const R = (over) => Object.assign(
  { slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom' },
  over || {},
);

// ─── Airline count (Phase 13) ──────────────────────────────────────────────
test('airlineCount is the unique airline-list length when a list exists', () => {
  const s = buildRouteSnapshot(R({ airline_count: 8, airlines: [{ iata_code: 'KL' }, { iata_code: 'AZ' }, { iata_code: 'FR' }] }));
  assert.equal(s.airlineCount, 3); // list wins over the stale scalar 8
});
test('airlineCount falls back to the scalar only when there is no list', () => {
  assert.equal(buildRouteSnapshot(R({ airline_count: 5 })).airlineCount, 5);
  assert.equal(buildRouteSnapshot(R({})).airlineCount, null);
});

// ─── Stop split (Phase 14) ─────────────────────────────────────────────────
test('stops derive nonstop/oneStop/twoPlus, total is their sum, share rounds', () => {
  const s = buildRouteSnapshot(R({ stop_distribution: { 0: 8, 1: 142, 2: 1, 3: 1 } }));
  assert.deepEqual(s.stops, { nonstop: 8, oneStop: 142, twoPlus: 2, total: 152, nonstopShare: 5 });
  // The total is DEFINED as the bucket sum — never a separate figure that could
  // read "150 offers" beside buckets that sum to 152.
  assert.equal(s.stops.nonstop + s.stops.oneStop + s.stops.twoPlus, s.stops.total);
});
test('stops is null when there is no positive total or no distribution', () => {
  assert.equal(buildRouteSnapshot(R({ stop_distribution: { 0: 0 } })).stops, null);
  assert.equal(buildRouteSnapshot(R({})).stops, null);
  assert.equal(deriveStops(R({ stop_distribution: 'nope' })), null);
});

// ─── Price (Phase 1/11) ────────────────────────────────────────────────────
test('price prefers the sample-backed aggregate min, else cached, else null', () => {
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 9, price_currency: 'EUR', cached_price: 83 })).price.amount, 60);
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 2, cached_price: 83 })).price.amount, 83);
  assert.equal(buildRouteSnapshot(R({})).price, null);
});

// ─── Freshness via central TTL (Phase 12) ──────────────────────────────────
test('priceIsFresh / routeDataIsFresh respect the central TTL windows', () => {
  const now = Date.parse('2026-09-03T00:00:00Z');
  const recent = '2026-09-01T00:00:00Z';      // 2 days → within PRICE_TTL (7d) and ROUTE_DATA_TTL (30d)
  const old = '2026-01-01T00:00:00Z';         // ~8 months → stale for both
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 9, price_updated_at: recent }), now).priceIsFresh, true);
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 9, price_updated_at: old }), now).priceIsFresh, false);
  assert.equal(buildRouteSnapshot(R({ insights_updated_at: recent }), now).routeDataIsFresh, true);
  assert.equal(buildRouteSnapshot(R({ insights_updated_at: old }), now).routeDataIsFresh, false);
});

// ─── Invariant validation (Phase 10/13) ────────────────────────────────────
test('validateSnapshot flags an airline-count vs unique-list mismatch', () => {
  const route = R({ airline_count: 19, airlines: [{ iata_code: 'KL' }, { iata_code: 'AZ' }] });
  const errs = validateSnapshot(route, buildRouteSnapshot(route));
  assert.ok(errs.some((e) => e.includes('airline-count-mismatch')));
});
test('validateSnapshot flags origin === destination and passes a clean route', () => {
  const bad = R({ origin_iata: 'AMS', destination_iata: 'AMS' });
  assert.ok(validateSnapshot(bad, buildRouteSnapshot(bad)).some((e) => e.includes('origin-equals-destination')));
  const good = R({ airlines: [{ iata_code: 'KL' }], airline_count: 1, stop_distribution: { 0: 3, 1: 2 }, price_min: 50, price_sample_count: 5 });
  assert.deepEqual(validateSnapshot(good, buildRouteSnapshot(good)), []);
});

// ─── deriveAirlineCount unit ───────────────────────────────────────────────
test('deriveAirlineCount counts a passed list, else the scalar, else null', () => {
  assert.equal(deriveAirlineCount({ airline_count: 9 }, [{ iata_code: 'A' }, { iata_code: 'B' }]), 2);
  assert.equal(deriveAirlineCount({ airline_count: 9 }, []), 9);
  assert.equal(deriveAirlineCount({}, []), null);
});
