// Tests for the homepage popular-routes SSG injector
// (scripts/prerender-popular-routes.mjs). Exercises the pure link-building and
// HTML-injection helpers — no network. The point of this feature is that the
// homepage's internal links to /flights/* live in the RAW HTML source (so
// Googlebot sees them without executing JS), in BOTH the "Top Strecken" card
// grid and the "Beliebte Flugstrecken" pill list — so these assertions check
// exactly that: real <a href> anchors present in both containers, and the pill
// section unhidden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLinksHtml,
  buildTopCardsHtml,
  injectIntoHtml,
  injectPopularLinks,
  injectTopStrecken,
  escHtml,
  GSC_ROUTES,
  TOP_STRECKEN_COUNT,
  topStreckenRoutes,
  beliebteRoutes,
} from '../scripts/prerender-popular-routes.mjs';

const TEMPLATE = `
<div class="sec-top"><h2 class="sec-title">Top Strecken <em>→</em></h2></div>
<div class="rgrid2 hscroll" id="top-strecken-grid"></div>
<section id="popular-routes-links-section" style="display:none">
  <h2 class="sec-title">Beliebte Flugstrecken</h2>
  <div id="popular-routes-links" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"></div>
</section>
`;

const routes = () => [
  { slug: 'berlin-london', origin_city: 'Berlin', destination_city: 'London' },
  { slug: 'berlin-rom', origin_city: 'Berlin', destination_city: 'Rom' },
];

test('buildLinksHtml emits real crawlable <a href="/flights/slug"> pill anchors', () => {
  const html = buildLinksHtml(routes());
  assert.match(html, /<a href="\/flights\/berlin-london"[^>]*>Berlin → London<\/a>/);
  assert.match(html, /<a href="\/flights\/berlin-rom"[^>]*>Berlin → Rom<\/a>/);
  // No onClick / JS-navigation — the whole point is href-based links.
  assert.doesNotMatch(html, /onclick|data-fn/i);
});

test('buildTopCardsHtml emits crawlable .rchip card anchors (no data-fn search chips)', () => {
  const html = buildTopCardsHtml(routes());
  assert.match(html, /<a class="rchip" href="\/flights\/berlin-london"[^>]*><span class="rname">Berlin → London<\/span><\/a>/);
  // No nested <div> in a card — injectTopStrecken relies on that.
  assert.doesNotMatch(html, /<div/);
  assert.doesNotMatch(html, /onclick|data-fn/i);
});

test('injectPopularLinks places the pills into the container and unhides the section', () => {
  const out = injectPopularLinks(TEMPLATE, buildLinksHtml(routes()));
  assert.match(out, /<section id="popular-routes-links-section">/);
  assert.doesNotMatch(out, /display:none/);
  assert.match(out, /<div id="popular-routes-links"[^>]*><a href="\/flights\/berlin-london"/);
});

test('injectTopStrecken places the cards into #top-strecken-grid', () => {
  const out = injectTopStrecken(TEMPLATE, buildTopCardsHtml(routes()));
  assert.match(out, /<div class="rgrid2 hscroll" id="top-strecken-grid"><a class="rchip" href="\/flights\/berlin-london"/);
});

test('injectIntoHtml fills BOTH containers from the real ranked slices', () => {
  const out = injectIntoHtml(TEMPLATE);
  // Top grid gets the first route (rank 1) as a card.
  assert.match(out, new RegExp(`id="top-strecken-grid"><a class="rchip" href="/flights/${GSC_ROUTES[0].slug}"`));
  // Pill list gets the first below-the-fold route (rank 31) as a pill.
  assert.match(out, new RegExp(`id="popular-routes-links"[^>]*><a href="/flights/${GSC_ROUTES[TOP_STRECKEN_COUNT].slug}"`));
  assert.doesNotMatch(out, /display:none/);
});

test('injectIntoHtml is idempotent — re-running does not duplicate links', () => {
  const once = injectIntoHtml(TEMPLATE);
  const twice = injectIntoHtml(once);
  const count = (twice.match(/<a[^>]*href="\/flights\//g) || []).length;
  assert.equal(count, GSC_ROUTES.length);
  assert.equal(once, twice);
});

test('escHtml escapes city names so a stray character cannot break markup', () => {
  const out = buildLinksHtml([{ slug: 's', origin_city: 'A & B', destination_city: '<x>' }]);
  assert.match(out, /A &amp; B → &lt;x&gt;/);
  assert.equal(escHtml('"\'<>&'), '&quot;&#39;&lt;&gt;&amp;');
});

test('injectPopularLinks throws if the container is missing (caller degrades gracefully)', () => {
  assert.throws(() => injectPopularLinks('<div>no container here</div>', '<a></a>'), /container not found/);
});

test('injectTopStrecken throws if the grid is missing (caller degrades gracefully)', () => {
  assert.throws(() => injectTopStrecken('<div>no grid here</div>', '<a></a>'), /container not found/);
});

test('GSC_ROUTES is well-formed, in opportunity order, split top-30 / rest', () => {
  assert.ok(GSC_ROUTES.length >= 30, 'need at least the top 30');
  assert.equal(TOP_STRECKEN_COUNT, 30);
  assert.equal(topStreckenRoutes().length, 30);
  assert.equal(beliebteRoutes().length, GSC_ROUTES.length - 30);
  // Every entry has a usable slug + both city names, and no duplicate slugs.
  const seen = new Set();
  for (const r of GSC_ROUTES) {
    assert.ok(r.slug && typeof r.slug === 'string', `missing slug: ${JSON.stringify(r)}`);
    assert.ok(r.origin_city && r.destination_city, `missing city: ${r.slug}`);
    assert.ok(!seen.has(r.slug), `duplicate slug: ${r.slug}`);
    seen.add(r.slug);
  }
  // Order is the deliverable: highest GSC opportunity first.
  assert.equal(GSC_ROUTES[0].slug, 'hamburg-barcelona-2');
});
