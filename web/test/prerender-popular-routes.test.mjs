// Tests for the homepage popular-routes SSG injector
// (scripts/prerender-popular-routes.mjs). Exercises the pure link-building and
// HTML-injection helpers — no network. The point of this feature is that the
// homepage's internal links to /flights/* live in the RAW HTML source (so
// Googlebot sees them without executing JS), so these assertions check exactly
// that: real <a href> anchors present, and the SEO section unhidden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLinksHtml, injectIntoHtml, escHtml } from '../scripts/prerender-popular-routes.mjs';

const TEMPLATE = `
<section id="popular-routes-links-section" style="display:none">
  <h2 class="sec-title">Beliebte Flugstrecken</h2>
  <div id="popular-routes-links" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"></div>
</section>
`;

const routes = () => [
  { slug: 'berlin-london', origin_city: 'Berlin', destination_city: 'London' },
  { slug: 'berlin-rom', origin_city: 'Berlin', destination_city: 'Rom' },
];

test('buildLinksHtml emits real crawlable <a href="/flights/slug"> anchors', () => {
  const html = buildLinksHtml(routes());
  assert.match(html, /<a href="\/flights\/berlin-london"[^>]*>Berlin → London<\/a>/);
  assert.match(html, /<a href="\/flights\/berlin-rom"[^>]*>Berlin → Rom<\/a>/);
  // No onClick / JS-navigation — the whole point is href-based links.
  assert.doesNotMatch(html, /onclick|data-fn/i);
});

test('injectIntoHtml places the anchors into the container and unhides the section', () => {
  const out = injectIntoHtml(TEMPLATE, buildLinksHtml(routes()));
  // Section is no longer display:none.
  assert.match(out, /<section id="popular-routes-links-section">/);
  assert.doesNotMatch(out, /display:none/);
  // Anchors live inside the source HTML (not injected at runtime).
  assert.match(out, /<div id="popular-routes-links"[^>]*><a href="\/flights\/berlin-london"/);
});

test('injectIntoHtml is idempotent — re-running does not duplicate links', () => {
  const once = injectIntoHtml(TEMPLATE, buildLinksHtml(routes()));
  const twice = injectIntoHtml(once, buildLinksHtml(routes()));
  const count = (twice.match(/<a href="\/flights\//g) || []).length;
  assert.equal(count, 2);
  assert.equal(once, twice);
});

test('escHtml escapes city names so a stray character cannot break markup', () => {
  const out = buildLinksHtml([{ slug: 's', origin_city: 'A & B', destination_city: '<x>' }]);
  assert.match(out, /A &amp; B → &lt;x&gt;/);
  assert.equal(escHtml('"\'<>&'), '&quot;&#39;&lt;&gt;&amp;');
});

test('injectIntoHtml throws if the container is missing (caller degrades gracefully)', () => {
  assert.throws(() => injectIntoHtml('<div>no container here</div>', '<a></a>'), /container not found/);
});
