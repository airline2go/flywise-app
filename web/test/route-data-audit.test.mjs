// [ROUTE-DATA-AUDIT] Phase 28/29: pins the data-quality checks on fixtures so a
// regression in the auditor is caught, and a clean row stays clean.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRoute, auditRoutes } from '../lib/seo/route-data-audit.mjs';

const CLEAN = {
  slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO',
  distance_km: 1297, price_min: 49, price_avg: 90, price_max: 140, price_currency: 'EUR',
  avg_duration_min: 150, min_duration_min: 130, airline_count: 6, haul_type: 'medium-haul',
  all_direct: false, stop_distribution: { 0: 5, 1: 3 },
};
const codes = (row) => auditRoute(row).map((i) => i.code);

test('a clean row yields no issues', () => {
  assert.deepEqual(auditRoute(CLEAN), []);
});

test('flags origin=destination, missing iata and missing slug', () => {
  assert.ok(codes({ ...CLEAN, destination_iata: 'AMS' }).includes('origin-equals-destination'));
  assert.ok(codes({ ...CLEAN, origin_iata: null }).includes('missing-iata'));
  assert.ok(codes({ ...CLEAN, slug: '' }).includes('missing-slug'));
});

test('flags price ordering and negative prices', () => {
  assert.ok(codes({ ...CLEAN, price_min: 200 }).includes('price-order')); // min>max
  assert.ok(codes({ ...CLEAN, price_avg: 10 }).includes('price-order'));  // avg<min
  assert.ok(codes({ ...CLEAN, price_min: -1 }).includes('negative-price'));
});

test('flags duration and distance problems', () => {
  assert.ok(codes({ ...CLEAN, avg_duration_min: 0 }).includes('bad-avg-duration'));
  assert.ok(codes({ ...CLEAN, min_duration_min: 300 }).includes('min-gt-avg-duration'));
  assert.ok(codes({ ...CLEAN, distance_km: 0 }).includes('bad-distance'));
});

test('flags stop-distribution contradictions', () => {
  assert.ok(codes({ ...CLEAN, stop_distribution: { 0: -1, 1: 2 } }).includes('stop-distribution-negative'));
  assert.ok(codes({ ...CLEAN, all_direct: true, stop_distribution: { 0: 5, 1: 2 } }).includes('all-direct-but-has-stops'));
});

test('flags a future timestamp as a warning, bad haul as a warning', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const issues = auditRoute({ ...CLEAN, price_updated_at: future, haul_type: 'ultra' });
  assert.ok(issues.some((i) => i.code === 'future-price-timestamp' && i.severity === 'warning'));
  assert.ok(issues.some((i) => i.code === 'bad-haul-type' && i.severity === 'warning'));
});

test('auditRoutes summarizes and applies the airline-count-vs-join check when given the map', () => {
  const rows = [CLEAN, { ...CLEAN, slug: 'lhr-ath', airline_count: 8 }];
  const report = auditRoutes(rows, { uniqueAirlinesBySlug: new Map([['lhr-ath', 24]]) });
  assert.equal(report.total, 2);
  assert.equal(report.byCode['airline-count-vs-join'], 1);
  assert.equal(report.bySeverity.warning, 1);
  assert.equal(report.bySeverity.critical, 0);
});
