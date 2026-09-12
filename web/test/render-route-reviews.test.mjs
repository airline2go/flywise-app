// Tests for the route-page "Traveler reviews" section (renderRouteReviewsSection
// in render-reviews.js). Guards the §14 SEO thresholds (nothing below 3, cards
// at 3, summary at 5, distribution at 10), the "see all" link, HTML-escaping,
// and the verified badge. The empty-case parity of the flight-route page itself
// (reviewsHtml === '' → byte-identical render) is covered by the existing
// route-snapshot / template-jsonld suites, which call renderFlightRoutePage
// without the new arg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderRouteReviewsSection } = require('../lib/legacy-render/render-reviews.js');

const mk = (count, total = count) => ({
  reviews: Array.from({ length: Math.min(count, 6) }, (_, i) => ({
    id: String(i), rating: 5, comment: 'Easy to compare flights on this route.', author_name: 'Maria', country: 'Germany', verified: i === 0, created_at: '2026-08-01T00:00:00Z',
  })),
  total,
  aggregate: { average: 4.6, count, distribution: { 1: 1, 2: 1, 3: 2, 4: 6, 5: Math.max(0, count - 10) } },
});

test('renders nothing below the 3-review minimum (§14)', () => {
  assert.equal(renderRouteReviewsSection(mk(0), 'de', '/reviews'), '');
  assert.equal(renderRouteReviewsSection(mk(2), 'de', '/reviews'), '');
});

test('3 reviews → cards only, no rating summary yet', () => {
  const h = renderRouteReviewsSection(mk(3), 'de', '/reviews');
  assert.match(h, /route-reviews-section/);
  assert.equal((h.match(/class="route-rv-card"/g) || []).length, 3);
  assert.doesNotMatch(h, /<div class="route-rv-summary">/);
});

test('5 reviews → summary appears, distribution does not', () => {
  const h = renderRouteReviewsSection(mk(5), 'en', '/en/reviews');
  assert.match(h, /<div class="route-rv-summary">/);
  assert.match(h, /Based on 5 reviews/);
  assert.doesNotMatch(h, /<div class="route-rv-dist-row">/);
});

test('10+ reviews → summary + distribution + capped cards + see-all link', () => {
  const h = renderRouteReviewsSection(mk(25), 'de', '/reviews');
  assert.match(h, /<div class="route-rv-summary">/);
  assert.match(h, /route-rv-dist-row/);
  assert.equal((h.match(/class="route-rv-card"/g) || []).length, 6); // capped at 6
  assert.match(h, /<p class="route-rv-more"><a href="\/reviews">/); // 25 > 6 shown
});

test('verified reviews get a badge; user content is escaped', () => {
  const h = renderRouteReviewsSection({
    reviews: [
      { id: 'a', rating: 5, comment: '<script>x</script>', author_name: '<b>Eve</b>', country: null, verified: true, created_at: null },
      { id: 'b', rating: 4, comment: 'ok', author_name: 'Jonas', country: 'Germany', verified: false, created_at: null },
      { id: 'c', rating: 5, comment: 'nice', author_name: 'Ana', country: 'Spain', verified: false, created_at: null },
    ],
    total: 3,
    aggregate: { average: 4.7, count: 3, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 } },
  }, 'en', '/en/reviews');
  assert.equal((h.match(/Verified booking/g) || []).length, 1);
  assert.doesNotMatch(h, /<script>x<\/script>/);
  assert.match(h, /&lt;script&gt;/);
});
