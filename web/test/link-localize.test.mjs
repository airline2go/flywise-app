// Unit tests for localizeLinks (lib/link-localize.mjs). Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizeLinks } from '../lib/link-localize.mjs';

test('German (default) is never rewritten', () => {
  const html = '<a href="/flights/muc-pmi">Flug</a>';
  assert.equal(localizeLinks(html, 'de'), html);
});

test('entity links get the language prefix', () => {
  assert.equal(
    localizeLinks('<a href="/flights/muc-pmi">x</a>', 'tr'),
    '<a href="/tr/flights/muc-pmi">x</a>',
  );
  for (const seg of ['city/munich', 'country/ES', 'airport/MUC', 'airline/LH']) {
    assert.equal(
      localizeLinks(`<a href="/${seg}">x</a>`, 'fr'),
      `<a href="/fr/${seg}">x</a>`,
    );
  }
});

test('already-prefixed links are left untouched', () => {
  const html = '<a href="/tr/flights/muc-pmi">x</a>';
  assert.equal(localizeLinks(html, 'tr'), html);
  // different lang prefix present — still not double-prefixed
  assert.equal(localizeLinks('<a href="/en/city/munich">x</a>', 'tr'), '<a href="/en/city/munich">x</a>');
});

test('external, anchor, mailto and non-entity links are not touched', () => {
  const cases = [
    '<a href="https://example.com/flights/x">x</a>',
    '<a href="#section">x</a>',
    '<a href="mailto:a@b.com">x</a>',
    '<a href="/about">x</a>',
    '<a href="/">home</a>',
  ];
  for (const html of cases) assert.equal(localizeLinks(html, 'ar'), html);
});

test('blog links are intentionally left alone (per-language slugs differ)', () => {
  const html = '<a href="/blog/mein-post">x</a>';
  assert.equal(localizeLinks(html, 'tr'), html);
});

test('rewrites multiple links in a real content blob, preserving other attrs', () => {
  const html = '<p>See <a class="c" href="/flights/muc-pmi">route</a> and '
    + '<a href="/city/munich">Munich</a> or <a href="https://x.com">ext</a>.</p>';
  assert.equal(
    localizeLinks(html, 'es'),
    '<p>See <a class="c" href="/es/flights/muc-pmi">route</a> and '
    + '<a href="/es/city/munich">Munich</a> or <a href="https://x.com">ext</a>.</p>',
  );
});

test('empty/undefined content is returned unchanged', () => {
  assert.equal(localizeLinks('', 'tr'), '');
  assert.equal(localizeLinks(null, 'tr'), null);
  assert.equal(localizeLinks(undefined, 'tr'), undefined);
});
