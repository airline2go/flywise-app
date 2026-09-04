// P0-14 (safe fix) — every blog post must self-canonical in its own language
// with the correct <html lang>/og:locale, and must NOT canonical to the German
// URL. Before the fix the renderer treated every non-EN language as German
// (de = lang !== 'en'), so /it/blog/… /fr/blog/… etc. rendered lang="de" and a
// canonical pointing at the German path — de-indexing every translation. This
// guards against that regression while preserving the verified de↔en linking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderBlogPostPage } = require('../lib/legacy-render/render-blog-post.js');

setGeoData([], []);

const post = (over) => Object.assign({
  slug: 'roma-milano-guida',
  title: 'Roma-Milano guida',
  content: '<p>Contenuto italiano sufficientemente lungo per il rendering di prova.</p>',
  published_at: '2026-08-08T00:00:00Z',
}, over || {});

const htmlLang = (h) => (h.match(/<html lang="([^"]+)"/) || [])[1];
const canonical = (h) => (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
const ogLocale = (h) => (h.match(/og:locale" content="([^"]+)"/) || [])[1];
const hreflangs = (h) => [...h.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ lang: m[1], href: m[2] }));

test('each language self-canonicals to its OWN blog URL (not the German one)', () => {
  const cases = {
    de: 'https://airpiv.com/blog/roma-milano-guida',
    en: 'https://airpiv.com/en/blog/roma-milano-guida',
    it: 'https://airpiv.com/it/blog/roma-milano-guida',
    fr: 'https://airpiv.com/fr/blog/roma-milano-guida',
    ar: 'https://airpiv.com/ar/blog/roma-milano-guida',
  };
  for (const [lang, expected] of Object.entries(cases)) {
    const { html } = renderBlogPostPage(post(), [], [], lang);
    assert.equal(canonical(html), expected, `canonical for ${lang}`);
    assert.equal(htmlLang(html), lang, `<html lang> for ${lang}`);
  }
});

test('non-German translations no longer render lang="de" or a German canonical', () => {
  for (const lang of ['it', 'fr', 'es', 'nl', 'tr', 'ar']) {
    const { html } = renderBlogPostPage(post(), [], [], lang);
    assert.notEqual(htmlLang(html), 'de', `${lang} must not be lang=de`);
    assert.ok(!canonical(html).startsWith('https://airpiv.com/blog/'), `${lang} must not canonical to the German path`);
  }
});

test('og:locale follows the real language', () => {
  assert.equal(ogLocale(renderBlogPostPage(post(), [], [], 'it').html), 'it_IT');
  assert.equal(ogLocale(renderBlogPostPage(post(), [], [], 'ar').html), 'ar_AR');
});

test('a non-de/en page self-references in hreflang and never points at a sibling that may 404', () => {
  const { html } = renderBlogPostPage(post(), [], [], 'it');
  const alts = hreflangs(html).filter((h) => h.lang !== 'x-default');
  assert.deepEqual(alts, [{ lang: 'it', href: 'https://airpiv.com/it/blog/roma-milano-guida' }]);
});

test('de↔en cross-linking is preserved: a German post with slug_en advertises both', () => {
  const { html } = renderBlogPostPage(post({ slug: 'billige-fluege', slug_en: 'cheap-flights' }), [], [], 'de');
  const map = Object.fromEntries(hreflangs(html).map((h) => [h.lang, h.href]));
  assert.equal(map.de, 'https://airpiv.com/blog/billige-fluege');
  assert.equal(map.en, 'https://airpiv.com/en/blog/cheap-flights');
});
