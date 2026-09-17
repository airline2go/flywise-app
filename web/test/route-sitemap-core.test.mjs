import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  isRouteSitemapEligible,
  SEO_ROUTE_SITEMAP_PAGE_SIZE,
} = require('../lib/legacy-render/route-evidence.js');

test('route sitemap page size matches the active 50-route recovery core', () => {
  assert.equal(SEO_ROUTE_SITEMAP_PAGE_SIZE, 50);
});

test('route sitemap includes only routes inside the active SEO core', () => {
  assert.equal(isRouteSitemapEligible({ slug: 'lgw-pmi', indexable: true }), true);
  assert.equal(isRouteSitemapEligible({ slug: 'london-amsterdam', indexable: true }), true);
  assert.equal(isRouteSitemapEligible({ slug: 'lgw-ams', indexable: true }), false);
});

test('explicit backend noindex remains excluded even for a core route', () => {
  assert.equal(isRouteSitemapEligible({ slug: 'lgw-pmi', indexable: false }), false);
});
