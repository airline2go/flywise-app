import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRouteSitemapEligible, ROUTES_PER_PAGE } from '../lib/legacy-render/route-sitemap.js';

test('route sitemap page size matches the active 50-route recovery core', () => {
  assert.equal(ROUTES_PER_PAGE, 50);
});

test('route sitemap includes only routes inside the active SEO core', () => {
  assert.equal(isRouteSitemapEligible({ slug: 'lgw-pmi', indexable: true }), true);
  assert.equal(isRouteSitemapEligible({ slug: 'london-amsterdam', indexable: true }), true);
  assert.equal(isRouteSitemapEligible({ slug: 'lgw-ams', indexable: true }), false);
});

test('explicit backend noindex remains excluded even for a core route', () => {
  assert.equal(isRouteSitemapEligible({ slug: 'lgw-pmi', indexable: false }), false);
});
