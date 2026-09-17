// Regression test for the empty validated popular-routes slice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectPopularLinks } from '../scripts/prerender-popular-routes.mjs';

const TEMPLATE = `
<section id="popular-routes-links-section" style="display:none">
  <h2>Beliebte Flugstrecken</h2>
  <div id="popular-routes-links" style="display:flex"></div>
</section>
`;

test('injectPopularLinks keeps the section hidden when the validated pill slice is empty', () => {
  const out = injectPopularLinks(TEMPLATE, '');
  assert.match(out, /<section id="popular-routes-links-section" style="display:none">/);
  assert.match(out, /<div id="popular-routes-links" style="display:flex"><\/div>/);
});

test('injectPopularLinks unhides the section when validated pill links exist', () => {
  const out = injectPopularLinks(TEMPLATE, '<a href="/flights/example">Example</a>');
  assert.match(out, /<section id="popular-routes-links-section">/);
  assert.doesNotMatch(out, /<section id="popular-routes-links-section"[^>]*display:none/);
  assert.match(out, /<a href="\/flights\/example">Example<\/a>/);
});
