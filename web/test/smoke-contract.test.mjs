// Unit tests for the P0-3 smoke-test contract (lib/seo/smoke-contract.mjs).
//
// The network driver (scripts/smoke-test.mjs) can only run against a live
// deploy, so the JUDGEMENT is factored into a pure function and pinned here
// with fixtures — this is what runs in the blocking `web` CI job and guards
// the contract against regressions. Fixtures mirror the real production markup
// verified against https://airpiv.com while building this suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePage, normalizeUrl, summarize } from '../lib/seo/smoke-contract.mjs';

const findCheck = (res, name) => res.checks.find((c) => c.name === name);
const failed = (res, name) => {
  const c = findCheck(res, name);
  return c && !c.ok;
};

// A healthy SSR route page (shape verified against a real airpiv.com route).
const goodSsr = (url = 'https://airpiv.com/en/flights/alicante-arrecife') => `<!doctype html>
<html lang="en">
<head>
  <title>Flights from Alicante to Arrecife – Prices, Time &amp; Airlines | Airpiv</title>
  <meta name="description" content="Compare live flight prices, flight time, distance and airlines from Alicante to Arrecife.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="en" href="https://airpiv.com/en/flights/alicante-arrecife">
  <link rel="alternate" hreflang="de" href="https://airpiv.com/flights/alicante-arrecife">
  <link rel="alternate" hreflang="x-default" href="https://airpiv.com/en/flights/alicante-arrecife">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage"}</script>
</head>
<body>
  <nav><a href="/en">Home</a> <a href="/en/city/alicante">Alicante</a> <a href="/en/country/ES">Spain</a></nav>
  <h1>Flights from Alicante to Arrecife</h1>
  <main>${'Real, substantial route content describing prices, airlines, duration and tips. '.repeat(60)}
    <a href="/en/flights/madrid-arrecife">Madrid to Arrecife</a>
    <a href="/en/airport/ALC">Alicante Airport</a>
  </main>
</body>
</html>`;

test('a healthy SSR page passes with no error-level failures', () => {
  const url = 'https://airpiv.com/en/flights/alicante-arrecife';
  const res = evaluatePage({ url, status: 200, contentType: 'text/html; charset=utf-8', html: goodSsr(url), profile: 'ssr' });
  assert.equal(res.ok, true, JSON.stringify(res.checks.filter((c) => !c.ok), null, 2));
  assert.equal(failed(res, 'title'), false);
  assert.equal(failed(res, 'canonical-self'), false);
  assert.equal(failed(res, 'h1-present'), false);
  assert.equal(failed(res, 'jsonld-valid'), false);
  assert.equal(failed(res, 'main-content'), false);
});

test('SSR: a 5xx/non-200 status is an error', () => {
  const res = evaluatePage({ url: 'https://airpiv.com/en/flights/x', status: 503, contentType: 'text/html', html: goodSsr(), profile: 'ssr' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'http-status'), true);
});

test('SSR: an empty 200 shell fails on size, content, title, canonical, h1', () => {
  const html = '<!doctype html><html><head></head><body></body></html>';
  const res = evaluatePage({ url: 'https://airpiv.com/en/city/ghost', status: 200, contentType: 'text/html', html, profile: 'ssr' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'html-size'), true);
  assert.equal(failed(res, 'title'), true);
  assert.equal(failed(res, 'meta-description'), true);
  assert.equal(failed(res, 'canonical-present'), true);
  assert.equal(failed(res, 'h1-present'), true);
  assert.equal(failed(res, 'main-content'), true);
});

test('SSR: a canonical pointing at a DIFFERENT indexable URL is an error', () => {
  const html = goodSsr().replace(
    '<link rel="canonical" href="https://airpiv.com/en/flights/alicante-arrecife">',
    '<link rel="canonical" href="https://airpiv.com/en/flights/some-other-route">',
  );
  const res = evaluatePage({ url: 'https://airpiv.com/en/flights/alicante-arrecife', status: 200, contentType: 'text/html', html, profile: 'ssr' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'canonical-self'), true);
});

test('SSR: a noindex page may cross-canonical (canonical-self downgraded to warn)', () => {
  const html = goodSsr()
    .replace('content="index, follow"', 'content="noindex, follow"')
    .replace('/en/flights/alicante-arrecife">\n  <link rel="alternate"', '/en/flights/other">\n  <link rel="alternate"');
  const res = evaluatePage({ url: 'https://airpiv.com/en/flights/alicante-arrecife', status: 200, contentType: 'text/html', html, profile: 'ssr' });
  const c = findCheck(res, 'canonical-self');
  assert.equal(c.level, 'warn'); // not an error when noindex
});

test('SSR: malformed JSON-LD is an error (silently dropped structured data)', () => {
  const html = goodSsr().replace('{"@context":"https://schema.org","@type":"FAQPage"}', '{"@context": bad json,,}');
  const res = evaluatePage({ url: 'https://airpiv.com/en/flights/alicante-arrecife', status: 200, contentType: 'text/html', html, profile: 'ssr' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'jsonld-valid'), true);
});

test('SSR: a non-HTML content-type (e.g. JSON error body) is an error', () => {
  const res = evaluatePage({ url: 'https://airpiv.com/en/flights/x', status: 200, contentType: 'application/json', html: '{"error":"upstream"}', profile: 'ssr' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'content-type'), true);
});

test('spa-home: client-localized homepage passes but records canonical/lang as warn/info, never error', () => {
  // The static index.html: raw canonical is the root, title is the default —
  // localization happens in app.js. The contract must NOT fail this by design.
  const html = `<!doctype html><html lang="de"><head>
    <title>Airpiv — Günstige Flüge vergleichen</title>
    <link rel="canonical" href="https://airpiv.com/">
    </head><body><h1>Flüge</h1><main>${'homepage content '.repeat(20)}</main></body></html>`;
  const res = evaluatePage({ url: 'https://airpiv.com/en', status: 200, contentType: 'text/html', html, profile: 'spa-home' });
  assert.equal(res.ok, true, 'spa-home must not error on client-localized metadata');
  // canonical mismatch is present but only a warning here
  const canon = findCheck(res, 'canonical-self');
  assert.equal(canon.level, 'warn');
});

test('normalizeUrl strips trailing slash and lowercases host but keeps root', () => {
  assert.equal(normalizeUrl('https://Airpiv.com/en/'), 'https://airpiv.com/en');
  assert.equal(normalizeUrl('https://airpiv.com/'), 'https://airpiv.com/');
  assert.equal(normalizeUrl('https://airpiv.com/en#frag'), 'https://airpiv.com/en');
});

test('summarize counts passed/failed and error vs warn checks', () => {
  const results = [
    evaluatePage({ url: 'https://airpiv.com/en/city/alicante', status: 200, contentType: 'text/html', html: goodSsr('https://airpiv.com/en/city/alicante'), profile: 'ssr' }),
    evaluatePage({ url: 'https://airpiv.com/en/city/ghost', status: 200, contentType: 'text/html', html: '<html><head></head><body></body></html>', profile: 'ssr' }),
  ];
  const s = summarize(results);
  assert.equal(s.total, 2);
  assert.equal(s.passed, 1);
  assert.equal(s.failed, 1);
  assert.ok(s.errorChecks >= 1);
});
