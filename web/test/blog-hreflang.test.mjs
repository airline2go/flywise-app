// [P0-6] Tests for the blog hreflang set built from the post's REAL published
// siblings (backend post.alternates). A language is advertised only when a real
// alternate slug exists, entries use per-language slugs (reciprocal, never a
// 404), and x-default is left to renderShell (derived from the German entry).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { blogHreflangUrls } = require('../lib/legacy-render/blog-hreflang.js');

// Mirror of languages.js urlFor: German unprefixed, the rest under /xx/.
const urlFor = (code, rel) => `https://airpiv.com/${code === 'de' ? '' : code + '/'}${rel}`;

test('German-only post → de alternate only (no untranslated languages)', () => {
  const urls = blogHreflangUrls([{ language: 'de', slug: 'mein-post' }], urlFor);
  assert.deepEqual(urls, { de: 'https://airpiv.com/blog/mein-post' });
});

test('German + English → both, each at its own slug', () => {
  const urls = blogHreflangUrls([
    { language: 'de', slug: 'mein-post' },
    { language: 'en', slug: 'my-post' },
  ], urlFor);
  assert.deepEqual(urls, {
    de: 'https://airpiv.com/blog/mein-post',
    en: 'https://airpiv.com/en/blog/my-post',
  });
});

test('German + Arabic + English → exactly those three, no others', () => {
  const urls = blogHreflangUrls([
    { language: 'de', slug: 'p-de' },
    { language: 'ar', slug: 'p-ar' },
    { language: 'en', slug: 'p-en' },
  ], urlFor);
  assert.deepEqual(Object.keys(urls).sort(), ['ar', 'de', 'en']);
  assert.equal(urls.ar, 'https://airpiv.com/ar/blog/p-ar');
});

test('all 8 languages present → all 8 emitted, each at its own slug', () => {
  const langs = ['de', 'en', 'ar', 'es', 'fr', 'it', 'nl', 'tr'];
  const urls = blogHreflangUrls(langs.map((l) => ({ language: l, slug: `p-${l}` })), urlFor);
  assert.deepEqual(Object.keys(urls).sort(), [...langs].sort());
});

test('an alternate with a missing slug is dropped (never a 404 entry)', () => {
  const urls = blogHreflangUrls([
    { language: 'de', slug: 'p-de' },
    { language: 'fr', slug: null },
    { language: 'it' },
  ], urlFor);
  assert.deepEqual(Object.keys(urls), ['de']);
});

test('slugs are URL-encoded', () => {
  const urls = blogHreflangUrls([{ language: 'en', slug: 'a b/c' }], urlFor);
  assert.equal(urls.en, 'https://airpiv.com/en/blog/a%20b%2Fc');
});

test('empty/absent alternates → empty set (renderer falls back to self-only)', () => {
  assert.deepEqual(blogHreflangUrls([], urlFor), {});
  assert.deepEqual(blogHreflangUrls(null, urlFor), {});
});
