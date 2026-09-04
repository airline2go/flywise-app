// P2-24/25/26 — unit tests for the pure route-metadata auditor
// (lib/seo/metadata-audit.mjs). Report-only logic, so the tests pin what it
// detects: duplicate titles (same city pair, multiple slugs), reversible pairs,
// backend-thin flags, and no-data-signal rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRouteMetadata } from '../lib/seo/metadata-audit.mjs';

const R = (over) => Object.assign({
  slug: 'a-b', origin_city: 'A', destination_city: 'B',
  distance_km: 500, airline_count: 3, indexable: true,
}, over);

test('detects duplicate titles: one city pair served by multiple slugs', () => {
  const rep = auditRouteMetadata([
    R({ slug: 'ams-vie', origin_city: 'Amsterdam', destination_city: 'Vienna' }),
    R({ slug: 'amsterdam-vienna', origin_city: 'Amsterdam', destination_city: 'Vienna' }),
    R({ slug: 'ber-muc', origin_city: 'Berlin', destination_city: 'München' }),
  ]);
  assert.equal(rep.duplicateTitle.pairs, 1);
  assert.equal(rep.duplicateTitle.routes, 2);
  assert.deepEqual(rep.duplicateTitle.groups[0].slugs, ['ams-vie', 'amsterdam-vienna']);
});

test('counts a 3-slug city pair as one group of three routes', () => {
  const rep = auditRouteMetadata([
    R({ slug: 'frankfurt-hamburg', origin_city: 'Frankfurt', destination_city: 'Hamburg' }),
    R({ slug: 'frankfurt-hamburg-2', origin_city: 'Frankfurt', destination_city: 'Hamburg' }),
    R({ slug: 'frankfurt-hamburg-3', origin_city: 'Frankfurt', destination_city: 'Hamburg' }),
  ]);
  assert.equal(rep.duplicateTitle.pairs, 1);
  assert.equal(rep.duplicateTitle.groups[0].count, 3);
});

test('a unique city pair is not flagged', () => {
  const rep = auditRouteMetadata([R({ slug: 'ber-muc', origin_city: 'Berlin', destination_city: 'München' })]);
  assert.equal(rep.duplicateTitle.pairs, 0);
  assert.equal(rep.total, 1);
});

test('detects reversible pairs where both directions exist', () => {
  const rep = auditRouteMetadata([
    R({ slug: 'ber-muc', origin_city: 'Berlin', destination_city: 'München' }),
    R({ slug: 'muc-ber', origin_city: 'München', destination_city: 'Berlin' }),
  ]);
  assert.equal(rep.reversiblePairs, 1);
});

test('surfaces backend-thin (indexable=false) and no-data-signal rows', () => {
  const rep = auditRouteMetadata([
    R({ slug: 'thin', origin_city: 'X', destination_city: 'Y', indexable: false }),
    R({ slug: 'empty', origin_city: 'P', destination_city: 'Q', distance_km: null, airline_count: 0 }),
    R({ slug: 'good', origin_city: 'G', destination_city: 'H' }),
  ]);
  assert.deepEqual(rep.nonIndexable.slugs, ['thin']);
  assert.deepEqual(rep.noDataSignal.slugs, ['empty']);
});
