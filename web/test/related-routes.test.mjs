// P1-6 — related-routes selection quality. computeRelatedRoutes had no direct
// test; these pin the invariants that matter for SEO/internal-link quality:
// the current route and its reverse are excluded, NON-INDEXABLE (thin/broken)
// candidates are never suggested, and ranking is deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRelatedRoutes } from '../lib/related-routes.js';

const R = (over) => Object.assign({
  slug: 'ber-muc', origin_city: 'Berlin', destination_city: 'München',
  origin_country: 'DE', destination_country: 'DE',
  distance_km: 500, haul_type: 'short-haul', airline_count: 3, route_score: 60,
  indexable: true,
}, over);

const base = R({ slug: 'ber-muc' });

test('excludes the current route and its reverse-direction twin', () => {
  const list = [
    base,
    R({ slug: 'muc-ber', origin_city: 'München', destination_city: 'Berlin' }), // reverse
    R({ slug: 'ber-fra', destination_city: 'Frankfurt' }),
  ];
  const out = computeRelatedRoutes(base, list).map((r) => r.slug);
  assert.ok(!out.includes('ber-muc'), 'not the current route');
  assert.ok(!out.includes('muc-ber'), 'not the reverse twin');
  assert.ok(out.includes('ber-fra'));
});

test('never suggests a non-indexable (thin/broken) candidate', () => {
  const list = [
    base,
    R({ slug: 'ber-thin', destination_city: 'Nowhere', indexable: false }), // must be dropped
    R({ slug: 'ber-fra', destination_city: 'Frankfurt', indexable: true }),
  ];
  const out = computeRelatedRoutes(base, list).map((r) => r.slug);
  assert.ok(!out.includes('ber-thin'), 'non-indexable candidate excluded');
  assert.ok(out.includes('ber-fra'));
});

test('a missing indexable flag is treated as indexable (no accidental emptying)', () => {
  const noFlag = R({ slug: 'ber-ham', destination_city: 'Hamburg' });
  delete noFlag.indexable;
  const out = computeRelatedRoutes(base, [base, noFlag]).map((r) => r.slug);
  assert.deepEqual(out, ['ber-ham']);
});

test('ranking is deterministic regardless of input order', () => {
  const a = R({ slug: 'ber-a', destination_city: 'A', route_score: 10 });
  const b = R({ slug: 'ber-b', destination_city: 'B', route_score: 90 });
  const c = R({ slug: 'ber-c', destination_city: 'C', route_score: 90 });
  const one = computeRelatedRoutes(base, [base, a, b, c]).map((r) => r.slug);
  const two = computeRelatedRoutes(base, [base, c, b, a]).map((r) => r.slug);
  assert.deepEqual(one, two, 'stable ordering');
});
