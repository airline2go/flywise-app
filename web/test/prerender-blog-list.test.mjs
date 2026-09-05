// [P0-5 / P2-5] The German blog listing must ship crawlable article links + a
// populated ItemList in its RAW HTML (not only via client JS). These pin the
// pure inject helpers used by scripts/prerender-blog-list.mjs — no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ticketHtml, featuredHtml, buildGridHtml, buildItemListJson,
  injectBlogGrid, injectItemList, injectBlogList, escHtml,
} from '../scripts/prerender-blog-list.mjs';

const TEMPLATE = `
<main>
  <div class="jrn-count" id="jrn-count"></div>
  <div class="blog-grid" id="blog-grid" aria-busy="true">
    <div class="post-skel" aria-hidden="true"></div>
    <div class="post-skel" aria-hidden="true"></div>
  </div>
</main>
<script type="application/ld+json" id="itemlist-schema">{"@context":"https://schema.org","@type":"ItemList","itemListElement":[]}</script>`;

const posts = () => [
  { slug: 'billige-fluege-2026', title: 'Billige Flüge 2026', excerpt: 'Tipps', author: 'Airpiv Team', published_at: '2026-08-01T00:00:00Z' },
  { slug: 'last-minute', title: 'Last-Minute-Deals', excerpt: 'Sparen', published_at: '2026-07-01T00:00:00Z' },
];

test('buildGridHtml emits crawlable <a href="/blog/slug"> cards (featured + tickets)', () => {
  const html = buildGridHtml(posts());
  assert.match(html, /<a class="post-ticket post-featured" href="\/blog\/billige-fluege-2026">/);
  assert.match(html, /<a class="post-ticket" href="\/blog\/last-minute">/);
  assert.doesNotMatch(html, /onclick|data-fn/i);
});

test('single post → one plain ticket, no featured', () => {
  const html = buildGridHtml([posts()[0]]);
  assert.match(html, /<a class="post-ticket" href="\/blog\/billige-fluege-2026">/);
  assert.doesNotMatch(html, /post-featured/);
});

test('injectBlogGrid replaces skeletons, clears aria-busy, keeps </main>', () => {
  const out = injectBlogGrid(TEMPLATE, buildGridHtml(posts()));
  assert.match(out, /id="blog-grid">[\s\S]*post-ticket/);
  assert.doesNotMatch(out, /aria-busy="true"/);
  assert.doesNotMatch(out, /post-skel/);
  assert.match(out, /<\/div>\s*<\/main>/);
});

test('injectItemList fills the ItemList with real post URLs', () => {
  const out = injectItemList(TEMPLATE, buildItemListJson(posts()));
  const m = out.match(/id="itemlist-schema">([\s\S]*?)<\/script>/);
  const data = JSON.parse(m[1]);
  assert.equal(data.itemListElement.length, 2);
  assert.equal(data.itemListElement[0].url, 'https://airpiv.com/blog/billige-fluege-2026');
});

test('injectBlogList is idempotent-safe and escapes titles', () => {
  const dirty = [{ slug: 's', title: 'A & B <x>', published_at: '2026-01-01T00:00:00Z' }];
  const out = injectBlogList(TEMPLATE, dirty);
  assert.match(out, /A &amp; B &lt;x&gt;/);
  assert.equal(escHtml('"\'<>&'), '&quot;&#39;&lt;&gt;&amp;');
});

test('injectBlogGrid throws if the container is missing (caller degrades gracefully)', () => {
  assert.throws(() => injectBlogGrid('<main>no grid</main>', '<a></a>'), /not found/);
});
