// P0-7 — sitemap ↔ indexability audit: unit tests for the pure structural
// checks (lib/seo/sitemap-membership.mjs) and the smoke-contract 'sitemap'
// profile (a sitemap URL must be 200, NOT noindex, and self-canonical). The
// live network run is scripts/audit-sitemap.mjs; this pins the judgement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { structuralAudit, spreadSample, classifyChildSitemap } from '../lib/seo/sitemap-membership.mjs';
import { evaluatePage } from '../lib/seo/smoke-contract.mjs';

const findCheck = (r, n) => r.checks.find((c) => c.name === n);
const failed = (r, n) => { const c = findCheck(r, n); return c && !c.ok; };

// ─── structuralAudit ─────────────────────────────────────────────────────
test('structuralAudit: a clean set of absolute https canonical-host URLs passes', () => {
  const res = structuralAudit([
    { loc: 'https://airpiv.com/en/flights/a-b' },
    { loc: 'https://airpiv.com/flights/a-b' },
    { loc: 'https://airpiv.com/en/city/berlin' },
  ]);
  assert.equal(res.ok, true);
  assert.equal(res.total, 3);
  assert.equal(res.unique, 3);
});

test('structuralAudit: duplicate URLs across sitemaps are flagged', () => {
  const res = structuralAudit([
    { loc: 'https://airpiv.com/en/city/berlin', sitemap: 'cities' },
    { loc: 'https://airpiv.com/en/city/berlin', sitemap: 'popular' },
  ]);
  assert.equal(res.ok, false);
  assert.equal(res.duplicates.length, 1);
  assert.equal(res.duplicates[0].count, 2);
});

test('structuralAudit: non-https and wrong-host locs are flagged', () => {
  const res = structuralAudit([
    { loc: 'http://airpiv.com/en/city/berlin' },
    { loc: 'https://www.other.com/en/city/berlin' },
  ]);
  assert.equal(res.ok, false);
  assert.equal(res.nonHttps.length, 1);
  assert.equal(res.wrongHost.length, 1);
});

test('structuralAudit: forbidden path shapes (asset, query, 404) are flagged', () => {
  const res = structuralAudit([
    { loc: 'https://airpiv.com/404.html' },
    { loc: 'https://airpiv.com/styles.css' },
    { loc: 'https://airpiv.com/en/city/berlin?utm=x' },
  ]);
  assert.equal(res.ok, false);
  assert.equal(res.forbidden.length, 3);
});

// ─── spreadSample ────────────────────────────────────────────────────────
test('spreadSample: returns the whole list when n >= length', () => {
  assert.deepEqual(spreadSample(['a', 'b'], 5), ['a', 'b']);
});

test('spreadSample: samples first, last and spread middles', () => {
  const list = Array.from({ length: 100 }, (_, i) => i);
  const s = spreadSample(list, 5);
  assert.equal(s[0], 0);
  assert.equal(s[s.length - 1], 99);
  assert.ok(s.length <= 5);
});

// ─── smoke-contract 'sitemap' profile ────────────────────────────────────
const page = ({ robots = 'index, follow', canonical, url }) => `<!doctype html><html lang="en"><head>
  <title>Flights from A to B – prices | Airpiv</title>
  <meta name="description" content="Compare flight prices from A to B in detail across airlines and dates today.">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${url}">
  <script type="application/ld+json">{"@type":"FAQPage"}</script>
  </head><body><h1>Flights from A to B</h1><main>${'route content '.repeat(320)}<a href="/en/x">x</a><a href="/en/y">y</a><a href="/en/z">z</a></main></body></html>`;

test('sitemap profile: a 200 self-canonical indexable page passes', () => {
  const url = 'https://airpiv.com/en/flights/a-b';
  const res = evaluatePage({ url, status: 200, contentType: 'text/html', html: page({ canonical: url, url }), profile: 'sitemap' });
  assert.equal(res.ok, true, JSON.stringify(res.checks.filter((c) => !c.ok)));
});

test('sitemap profile: a NOINDEX page in a sitemap is an ERROR (backend↔renderer drift)', () => {
  const url = 'https://airpiv.com/en/flights/thin';
  const res = evaluatePage({ url, status: 200, contentType: 'text/html', html: page({ robots: 'noindex, follow', canonical: url, url }), profile: 'sitemap' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'sitemap-indexable'), true);
});

test('sitemap profile: a cross-canonical page in a sitemap is an ERROR (the real /it/blog finding)', () => {
  const url = 'https://airpiv.com/it/blog/some-post';
  const res = evaluatePage({ url, status: 200, contentType: 'text/html', html: page({ canonical: 'https://airpiv.com/blog/some-post', url }), profile: 'sitemap' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'canonical-self'), true);
});

test('sitemap profile: a non-200 URL in a sitemap is an ERROR', () => {
  const res = evaluatePage({ url: 'https://airpiv.com/en/city/gone', status: 404, contentType: 'text/html', html: '<html><body>x</body></html>', profile: 'sitemap' });
  assert.equal(res.ok, false);
  assert.equal(failed(res, 'http-status'), true);
});

// ── [P1-6] child-sitemap fetch/parse must FAIL, never coerce to empty ──────
test('classifyChildSitemap: a failed fetch (null) is "unreachable", not empty', () => {
  assert.equal(classifyChildSitemap(null), 'unreachable');
});
test('classifyChildSitemap: a non-sitemap body is "malformed"', () => {
  assert.equal(classifyChildSitemap('<html><body>404 Not Found</body></html>'), 'malformed');
  assert.equal(classifyChildSitemap(''), 'malformed');
});
test('classifyChildSitemap: a valid urlset / sitemapindex is "ok" (even if empty of <loc>)', () => {
  assert.equal(classifyChildSitemap('<?xml version="1.0"?><urlset xmlns="x"></urlset>'), 'ok');
  assert.equal(classifyChildSitemap('<sitemapindex><sitemap><loc>https://airpiv.com/s.xml</loc></sitemap></sitemapindex>'), 'ok');
});
