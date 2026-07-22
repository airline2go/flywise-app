// Tests for the honest blog hreflang set (blog-hreflang.js). The blog is
// German-source with an optional English translation; the other five site
// languages have no blog, so they must never be advertised, and a German-only
// post must not emit a broken /en/blog/<german-slug> alternate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { blogHreflangUrls } = require('../lib/legacy-render/blog-hreflang.js');

const deUrl = 'https://airpiv.com/blog/mein-post';
const enUrl = 'https://airpiv.com/en/blog/my-post';

test('German post with no English translation self-references (de) only', () => {
  assert.deepEqual(blogHreflangUrls({ slug: 'mein-post', slug_en: null }, true, deUrl, deUrl), { de: deUrl });
});

test('German post WITH an English translation links both, en via slug_en', () => {
  assert.deepEqual(
    blogHreflangUrls({ slug: 'mein-post', slug_en: 'my-post' }, true, deUrl, deUrl),
    { de: deUrl, en: 'https://airpiv.com/en/blog/my-post' },
  );
});

test('a German post never advertises the untranslated languages', () => {
  const urls = blogHreflangUrls({ slug: 'mein-post', slug_en: 'my-post' }, true, deUrl, deUrl);
  assert.deepEqual(Object.keys(urls).sort(), ['de', 'en']);
});

test('English page self-references (en) only', () => {
  assert.deepEqual(blogHreflangUrls({ slug: 'my-post' }, false, enUrl, deUrl), { en: enUrl });
});

test('slug_en is URL-encoded in the alternate', () => {
  const urls = blogHreflangUrls({ slug: 'x', slug_en: 'a b/c' }, true, deUrl, deUrl);
  assert.equal(urls.en, 'https://airpiv.com/en/blog/a%20b%2Fc');
});
