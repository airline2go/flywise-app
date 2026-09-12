// Contract for the /reviews sitemap entry (buildReviewsUrls in sitemap-urls.js).
// buildReviewsUrls itself can't be imported here — sitemap-urls pulls in
// content-api's react/network chain, which only resolves under the Next
// bundler (the other sitemap tests avoid it the same way). So this pins the
// pure, observable contract the builder must satisfy when the page is
// indexable: the central hub in all 8 languages, German unprefixed, every loc
// a clean canonical-host /reviews URL with no query/asset shape. The
// "omit when zero published reviews" gate (return [] → not listed, §27) is a
// three-line guard over the same aggregate the /reviews page's
// noindex-when-empty behavior is already tested on (render-reviews.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGE_CODES, urlFor } from '../lib/languages.js';

test('indexable /reviews contract: 8 language URLs, root + /xx/reviews, clean shape', () => {
  const expected = LANGUAGE_CODES.map((l) => urlFor(l, 'reviews'));
  assert.equal(expected.length, 8);
  assert.ok(expected.includes('https://airpiv.com/reviews')); // German root, unprefixed
  assert.ok(expected.includes('https://airpiv.com/en/reviews'));
  assert.ok(expected.includes('https://airpiv.com/tr/reviews'));
  for (const loc of expected) assert.match(loc, /^https:\/\/airpiv\.com\/(?:[a-z]{2}\/)?reviews$/);
});
