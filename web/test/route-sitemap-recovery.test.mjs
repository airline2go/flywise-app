import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { selectRecoveryRouteSitemapRoutes } = require('../lib/seo/route-sitemap-recovery.js');

const freshCore = (slug) => ({
  slug,
  avg_duration_min: 90,
  price_sample_count: 5,
  itinerary_count: 12,
  insights_updated_at: new Date().toISOString(),
});

test('empty primary sitemap feed falls back only to the recovery core', () => {
  const selected = selectRecoveryRouteSitemapRoutes([], [
    freshCore('lgw-pmi'),
    freshCore('alicante-barcelona'),
    freshCore('outside-core'),
  ]);

  assert.deepEqual(selected.map((r) => r.slug), ['lgw-pmi', 'alicante-barcelona']);
});

test('explicit noindex core route cannot enter the fallback sitemap', () => {
  const selected = selectRecoveryRouteSitemapRoutes([], [
    { ...freshCore('lgw-pmi'), indexable: false },
    freshCore('alicante-barcelona'),
  ]);

  assert.deepEqual(selected.map((r) => r.slug), ['alicante-barcelona']);
});

test('healthy primary feed remains authoritative', () => {
  const primary = Array.from({ length: 70 }, (_, i) => ({ id: `primary-${i}` }));
  const selected = selectRecoveryRouteSitemapRoutes(primary, [freshCore('lgw-pmi')]);

  assert.equal(selected.length, 70);
  assert.equal(selected[0].id, 'primary-0');
});
