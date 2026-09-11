// Tests for the central /reviews hub renderer (render-reviews.js). Exercises
// the real render path with a fixed aggregate + published-review fixture; no
// network. Guards the P1 SEO contract: canonical, hreflang, index-only-when-
// non-empty, verified badge, and HTML-escaping of user content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderReviewsPage } = require('../lib/legacy-render/render-reviews.js');

const fixture = () => ({
  reviews: [
    { id: '1', rating: 5, comment: 'Easy to compare the available flights.', author_name: 'Maria', country: 'Germany', verified: true, liked_tags: ['easy_search', 'clear_prices'], created_at: '2026-08-01T00:00:00Z' },
    { id: '2', rating: 4, comment: 'Prices were transparent.', author_name: null, country: 'España', verified: false, liked_tags: [], created_at: '2026-07-15T00:00:00Z' },
  ],
  total: 2,
  aggregate: { average: 4.7, count: 183, distribution: { 1: 2, 2: 3, 3: 8, 4: 20, 5: 150 } },
});

test('renders a complete, indexable document with canonical + hreflang', () => {
  const { html } = renderReviewsPage(fixture(), 'de');
  assert.match(html, /<html lang="de"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/airpiv\.com\/reviews">/);
  assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/airpiv\.com\/en\/reviews">/);
  assert.match(html, /<link rel="alternate" hreflang="tr" href="https:\/\/airpiv\.com\/tr\/reviews">/);
  assert.match(html, /<link rel="alternate" hreflang="x-default"/);
  assert.match(html, /<meta name="robots" content="index, follow">/);
});

test('shows the real aggregate: average, count and distribution', () => {
  const { html } = renderReviewsPage(fixture(), 'en');
  assert.match(html, /4\.7/);
  assert.match(html, /Based on 183 reviews/);
  assert.match(html, /150/); // the 5-star bucket count
  assert.match(html, /What travelers say about Airpiv/);
});

test('verified reviews get a badge; unverified do not', () => {
  const { html } = renderReviewsPage(fixture(), 'en');
  const badges = html.match(/Verified booking/g) || [];
  assert.equal(badges.length, 1); // only Maria's review is verified
});

test('an empty aggregate renders noindex (thin) with the empty message', () => {
  const { html } = renderReviewsPage(
    { reviews: [], total: 0, aggregate: { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } },
    'en',
  );
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.match(html, /rv-empty/);
  // Still a valid canonical + hreflang set even when empty.
  assert.match(html, /<link rel="canonical" href="https:\/\/airpiv\.com\/en\/reviews">/);
});

test('user comment/author content is HTML-escaped (no injection)', () => {
  const { html } = renderReviewsPage(
    {
      reviews: [{ id: 'x', rating: 5, comment: '<script>alert(1)</script>', author_name: '<b>Eve</b>', country: null, verified: false, liked_tags: [], created_at: null }],
      total: 1,
      aggregate: { average: 5, count: 1, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    },
    'en',
  );
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<b>Eve<\/b>/);
});

test('non-default language prefixes the canonical URL', () => {
  const { html } = renderReviewsPage(fixture(), 'fr');
  assert.match(html, /<link rel="canonical" href="https:\/\/airpiv\.com\/fr\/reviews">/);
  assert.match(html, /<html lang="fr"/);
});
