// Temporary CI probe; no production code path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectPopularLinks } from '../scripts/prerender-popular-routes.mjs';

test('main regression guard: empty validated popular-routes slice stays hidden', () => {
  const html = '<section id="popular-routes-links-section" style="display:none"><div id="popular-routes-links"></div></section>';
  const out = injectPopularLinks(html, '');
  assert.match(out, /<section id="popular-routes-links-section" style="display:none">/);
});
