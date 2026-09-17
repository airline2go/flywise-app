import assert from 'node:assert/strict';
import test from 'node:test';

import { removeLegacyRouteCta } from '../lib/legacy-render/route-search-legacy.js';

test('removes the legacy route CTA without touching the search panel submit button', () => {
  const html = [
    '<a href="/search/BER-BUD" class="route-cta">Search flights now →</a>',
    '<button class="route-search-submit" type="submit">Search flights →</button>',
  ].join('');

  const result = removeLegacyRouteCta(html);

  assert.equal(result.includes('route-cta'), false);
  assert.equal(result.includes('route-search-submit'), true);
});

test('preserves unrelated HTML and empty input safely', () => {
  const html = '<main id="route-main"><p>Route content</p></main>';
  assert.equal(removeLegacyRouteCta(html), html);
  assert.equal(removeLegacyRouteCta(''), '');
  assert.equal(removeLegacyRouteCta(null), null);
});
