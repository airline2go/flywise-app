// Pins the hreflang cluster invariants: self return-tag, canonical ∈ alternates,
// x-default presence, duplicate detection, and a clean valid cluster.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHreflang, auditHreflangCluster } from '../lib/seo/hreflang-audit.mjs';

const cluster = (self, canonical, extra = '') => `
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="de" href="https://airpiv.com/flights/x">
<link rel="alternate" hreflang="en" href="https://airpiv.com/en/flights/x">
<link rel="alternate" hreflang="fr" href="https://airpiv.com/fr/flights/x">
<link rel="alternate" hreflang="x-default" href="https://airpiv.com/flights/x">
${extra}`;

test('parseHreflang extracts canonical + all alternates', () => {
  const { canonical, alternates } = parseHreflang(cluster('en', 'https://airpiv.com/en/flights/x'));
  assert.equal(canonical, 'https://airpiv.com/en/flights/x');
  assert.equal(alternates.get('de'), 'https://airpiv.com/flights/x');
  assert.equal(alternates.get('x-default'), 'https://airpiv.com/flights/x');
  assert.equal(alternates.size, 4);
});

test('a valid English cluster has no errors', () => {
  const errors = auditHreflangCluster({
    html: cluster('en', 'https://airpiv.com/en/flights/x'),
    pageUrl: 'https://airpiv.com/en/flights/x', expectedLang: 'en',
  });
  assert.deepEqual(errors, []);
});

test('the German (root) page self-references via de, canonical = root', () => {
  const errors = auditHreflangCluster({
    html: cluster('de', 'https://airpiv.com/flights/x'),
    pageUrl: 'https://airpiv.com/flights/x', expectedLang: 'de',
  });
  assert.deepEqual(errors, []);
});

test('flags a canonical pointing OUTSIDE the hreflang set', () => {
  const errors = auditHreflangCluster({
    html: cluster('en', 'https://airpiv.com/en/flights/OTHER'),
    pageUrl: 'https://airpiv.com/en/flights/x', expectedLang: 'en',
  });
  assert.ok(errors.some((e) => /canonical .* not among/.test(e)), errors.join('; '));
});

test('flags a missing self return-tag', () => {
  const html = `
<link rel="canonical" href="https://airpiv.com/it/flights/x">
<link rel="alternate" hreflang="de" href="https://airpiv.com/flights/x">
<link rel="alternate" hreflang="x-default" href="https://airpiv.com/flights/x">`;
  const errors = auditHreflangCluster({ html, pageUrl: 'https://airpiv.com/it/flights/x', expectedLang: 'it' });
  assert.ok(errors.some((e) => /self hreflang "it" absent/.test(e)), errors.join('; '));
});

test('flags a missing x-default', () => {
  const html = `
<link rel="canonical" href="https://airpiv.com/en/flights/x">
<link rel="alternate" hreflang="en" href="https://airpiv.com/en/flights/x">
<link rel="alternate" hreflang="de" href="https://airpiv.com/flights/x">`;
  const errors = auditHreflangCluster({ html, pageUrl: 'https://airpiv.com/en/flights/x', expectedLang: 'en' });
  assert.ok(errors.some((e) => /x-default/.test(e)), errors.join('; '));
});

test('flags a duplicate hreflang mapping to two URLs', () => {
  const errors = auditHreflangCluster({
    html: cluster('en', 'https://airpiv.com/en/flights/x',
      '<link rel="alternate" hreflang="fr" href="https://airpiv.com/fr/flights/DIFFERENT">'),
    pageUrl: 'https://airpiv.com/en/flights/x', expectedLang: 'en',
  });
  assert.ok(errors.some((e) => /duplicate hreflang "fr"/.test(e)), errors.join('; '));
});

test('a single-language page with self-canonical and NO hreflang is valid when allowed', () => {
  const html = `<link rel="canonical" href="https://airpiv.com/about.html">
<meta name="robots" content="index, follow">`;
  const errors = auditHreflangCluster({
    html, pageUrl: 'https://airpiv.com/about.html', expectedLang: 'de', allowSingleLanguage: true,
  });
  assert.deepEqual(errors, []);
});

test('a single-language page canonicalizing ELSEWHERE is still flagged', () => {
  const html = `<link rel="canonical" href="https://airpiv.com/other.html">`;
  const errors = auditHreflangCluster({
    html, pageUrl: 'https://airpiv.com/about.html', expectedLang: 'de', allowSingleLanguage: true,
  });
  assert.ok(errors.some((e) => /≠ self/.test(e)), errors.join('; '));
});

test('a dynamic page with no hreflang is flagged (allowSingleLanguage off)', () => {
  const html = `<link rel="canonical" href="https://airpiv.com/en/flights/x">`;
  const errors = auditHreflangCluster({
    html, pageUrl: 'https://airpiv.com/en/flights/x', expectedLang: 'en',
  });
  assert.ok(errors.some((e) => /no hreflang alternates/.test(e)), errors.join('; '));
});

test('a trailing slash on the self URL does not cause a false mismatch', () => {
  const errors = auditHreflangCluster({
    html: cluster('en', 'https://airpiv.com/en/flights/x'),
    pageUrl: 'https://airpiv.com/en/flights/x/', expectedLang: 'en',
  });
  assert.deepEqual(errors, []);
});
