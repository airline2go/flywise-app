// [ROUTE-SNAPSHOT] Phases 9–14: the canonical route snapshot is the single
// object the whole page is built from. These tests pin its derivations and the
// invariant checks that stop a route with contradictory data from rendering
// numbers two different ways.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildRouteSnapshot, validateSnapshot, criticalSnapshotErrors, deriveStops, deriveAirlineCount } = require('../lib/legacy-render/route-snapshot.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const R = (over) => Object.assign(
  { slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom' },
  over || {},
);

test('airlineCount is the unique airline-list length when a list exists', () => {
  const s = buildRouteSnapshot(R({ airline_count: 8, airlines: [{ iata_code: 'KL' }, { iata_code: 'AZ' }, { iata_code: 'FR' }] }));
  assert.equal(s.airlineCount, 3);
});
test('airlineCount falls back to the scalar only when there is no list', () => {
  assert.equal(buildRouteSnapshot(R({ airline_count: 5 })).airlineCount, 5);
  assert.equal(buildRouteSnapshot(R({})).airlineCount, null);
});

test('stops derive nonstop/oneStop/twoPlus, total is their sum, share rounds', () => {
  const s = buildRouteSnapshot(R({ stop_distribution: { 0: 8, 1: 142, 2: 1, 3: 1 } }));
  assert.deepEqual(s.stops, { nonstop: 8, oneStop: 142, twoPlus: 2, total: 152, nonstopShare: 5 });
  assert.equal(s.stops.nonstop + s.stops.oneStop + s.stops.twoPlus, s.stops.total);
});
test('stops is null when there is no positive total or no distribution', () => {
  assert.equal(buildRouteSnapshot(R({ stop_distribution: { 0: 0 } })).stops, null);
  assert.equal(buildRouteSnapshot(R({})).stops, null);
  assert.equal(deriveStops(R({ stop_distribution: 'nope' })), null);
});

test('price prefers the observed aggregate min, then observed average, then cached, else null', () => {
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 9, price_currency: 'EUR', cached_price: 83 })).price.amount, 60);
  assert.equal(buildRouteSnapshot(R({ price_avg: 70, price_sample_count: 1, price_currency: 'EUR', cached_price: 83 })).price.amount, 70);
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 1, price_currency: 'EUR', cached_price: 83 })).price.amount, 60);
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 0, cached_price: 83 })).price.amount, 83);
  assert.equal(buildRouteSnapshot(R({})).price, null);
});

test('priceIsFresh / routeDataIsFresh respect the central TTL windows', () => {
  const now = Date.parse('2026-09-03T00:00:00Z');
  const recent = '2026-09-01T00:00:00Z';
  const old = '2026-01-01T00:00:00Z';
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 9, price_currency: 'EUR', price_updated_at: recent }), now).priceIsFresh, true);
  assert.equal(buildRouteSnapshot(R({ price_min: 60, price_sample_count: 9, price_currency: 'EUR', price_updated_at: old }), now).priceIsFresh, false);
  assert.equal(buildRouteSnapshot(R({ insights_updated_at: recent }), now).routeDataIsFresh, true);
  assert.equal(buildRouteSnapshot(R({ insights_updated_at: old }), now).routeDataIsFresh, false);
});

test('validateSnapshot flags an airline-count vs unique-list mismatch', () => {
  const route = R({ airline_count: 19, airlines: [{ iata_code: 'KL' }, { iata_code: 'AZ' }] });
  const errs = validateSnapshot(route, buildRouteSnapshot(route));
  assert.ok(errs.some((e) => e.includes('airline-count-mismatch')));
});
test('validateSnapshot flags origin === destination and passes a clean route', () => {
  const bad = R({ origin_iata: 'AMS', destination_iata: 'AMS' });
  assert.ok(validateSnapshot(bad, buildRouteSnapshot(bad)).some((e) => e.includes('origin-equals-destination')));
  const good = R({ airlines: [{ iata_code: 'KL' }], airline_count: 1, stop_distribution: { 0: 3, 1: 2 }, price_min: 50, price_sample_count: 5, price_currency: 'EUR' });
  assert.deepEqual(validateSnapshot(good, buildRouteSnapshot(good)), []);
});

test('criticalSnapshotErrors gates only genuinely broken routes, not a stale scalar', () => {
  const stale = R({ airline_count: 19, airlines: [{ iata_code: 'KL' }, { iata_code: 'AZ' }], distance_km: 1000 });
  assert.deepEqual(criticalSnapshotErrors(stale, buildRouteSnapshot(stale)), []);
  const broken = R({ origin_iata: 'AMS', destination_iata: 'AMS', distance_km: 1000 });
  assert.ok(criticalSnapshotErrors(broken, buildRouteSnapshot(broken)).length > 0);
});

test('renderer sets noindex on a broken route, indexes a healthy evidence-backed one', () => {
  const links = { fromOrigin: [], toDestination: [] };
  const broken = renderFlightRoutePage(R({ origin_iata: 'AMS', destination_iata: 'AMS', distance_km: 1000 }), 'de', [], links, []);
  assert.match(broken.html, /<meta name="robots" content="noindex, follow">/);
  const healthy = renderFlightRoutePage(R({ distance_km: 1297, avg_duration_min: 170 }), 'de', [], links, []);
  assert.match(healthy.html, /<meta name="robots" content="index, follow">/);
});

test('deriveAirlineCount counts a passed list, else the scalar, else null', () => {
  assert.equal(deriveAirlineCount({ airline_count: 9 }, [{ iata_code: 'A' }, { iata_code: 'B' }]), 2);
  assert.equal(deriveAirlineCount({ airline_count: 9 }, []), 9);
  assert.equal(deriveAirlineCount({}, []), null);
});

test('invalid currency is rejected before it can reach the public price snapshot', () => {
  const r = R({ price_min: 60, price_sample_count: 5, price_currency: 'euro', price_updated_at: '2026-09-01T00:00:00Z' });
  const s = buildRouteSnapshot(r);
  assert.equal(s.price, null);
  assert.equal(s.priceIsFresh, false);
  assert.ok(!validateSnapshot(r, s).some((e) => e.startsWith('invalid-currency')));
  assert.equal(criticalSnapshotErrors(r, s).length, 0);
});
test('a valid 3-letter currency raises no currency error', () => {
  const r = R({ price_min: 60, price_sample_count: 5, price_currency: 'EUR', price_updated_at: '2026-09-01T00:00:00Z' });
  const errs = validateSnapshot(r, buildRouteSnapshot(r));
  assert.ok(!errs.some((e) => e.startsWith('invalid-currency')), errs.join(','));
});
test('priceIsFresh always carries a checkedAt (no stale-as-live)', () => {
  const fresh = R({ price_min: 60, price_sample_count: 5, price_currency: 'EUR', price_updated_at: new Date().toISOString() });
  const s = buildRouteSnapshot(fresh);
  assert.equal(s.priceIsFresh, true);
  assert.ok(!validateSnapshot(fresh, s).some((e) => e.startsWith('stale-as-live')));
});
