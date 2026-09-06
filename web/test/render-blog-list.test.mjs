// [P0-5 Option A] The server-rendered /blog listing must ship the article list +
// links in the RAW HTML (crawlable, no JS): self-canonical https://airpiv.com/blog,
// index,follow, an ItemList with real post URLs, and article <a href="/blog/slug">
// cards. Pure render; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { renderBlogListPage, buildGridHtml } = require('../lib/legacy-render/render-blog-list.js');

const posts = () => [
  { slug: 'billige-fluege-2026', title: 'Billige Flüge 2026', excerpt: 'Tipps', author: 'Airpiv Team', published_at: '2026-08-01T00:00:00Z' },
  { slug: 'last-minute', title: 'Last-Minute-Deals', excerpt: 'Sparen', published_at: '2026-07-01T00:00:00Z' },
];

test('raw HTML has self-canonical /blog + index,follow + de/x-default self hreflang', () => {
  const { html } = renderBlogListPage(posts(), 'de');
  assert.match(html, /<html lang="de"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/airpiv\.com\/blog">/);
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.match(html, /hreflang="de" href="https:\/\/airpiv\.com\/blog"/);
  assert.match(html, /hreflang="x-default" href="https:\/\/airpiv\.com\/blog"/);
  // No stray per-language blog listing hreflang (only German listing exists).
  assert.doesNotMatch(html, /hreflang="en" href="https:\/\/airpiv\.com\/en\/blog"/);
});

test('article links + titles are in the raw HTML (crawlable, no JS)', () => {
  const { html } = renderBlogListPage(posts(), 'de');
  assert.match(html, /<a class="post-ticket post-featured" href="\/blog\/billige-fluege-2026">/);
  assert.match(html, /<a class="post-ticket" href="\/blog\/last-minute">/);
  assert.match(html, /Billige Flüge 2026/);
  assert.match(html, /Last-Minute-Deals/);
  // No client skeleton / aria-busy placeholder in the shipped grid.
  assert.doesNotMatch(html, /post-skel/);
  assert.doesNotMatch(html, /aria-busy="true"/);
});

test('ItemList JSON-LD is populated with absolute post URLs', () => {
  const { html } = renderBlogListPage(posts(), 'de');
  const m = html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"ItemList"[\s\S]*?)<\/script>/);
  assert.ok(m, 'ItemList script present');
  const data = JSON.parse(m[1]);
  assert.equal(data.itemListElement.length, 2);
  assert.equal(data.itemListElement[0].url, 'https://airpiv.com/blog/billige-fluege-2026');
  assert.equal(data.itemListElement[0].position, 1);
});

test('single post → one plain ticket, no featured', () => {
  const html = buildGridHtml([posts()[0]]);
  assert.match(html, /<a class="post-ticket" href="\/blog\/billige-fluege-2026">/);
  assert.doesNotMatch(html, /post-featured/);
});

test('empty list still renders a valid indexable page (no crash, no skeleton)', () => {
  const { html } = renderBlogListPage([], 'de');
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.match(html, /jrn-empty/);
  assert.doesNotMatch(html, /post-skel/);
});

test('titles/excerpts are HTML-escaped', () => {
  const { html } = renderBlogListPage([{ slug: 's', title: 'A & B <x>', published_at: '2026-01-01T00:00:00Z' }], 'de');
  assert.match(html, /A &amp; B &lt;x&gt;/);
});

test('loads blog.css + fonts and the shared chrome', () => {
  const { html } = renderBlogListPage(posts(), 'de');
  assert.match(html, /<link rel="stylesheet" href="\/blog\.css">/);
  assert.match(html, /fonts\.googleapis\.com/);
  assert.match(html, /class="jrn-hero"/);
});
