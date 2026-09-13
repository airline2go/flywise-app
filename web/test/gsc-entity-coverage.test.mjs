// [ALL-ENTITY-COVERAGE] The GSC opportunity pipeline used to recognize only
// /flights/<slug> pages, dropping every city / airport / airline / country /
// blog / home row — so the report ignored most of the site's ranking pages.
// These tests pin the extended behaviour: every entity page type is recognized
// and tagged with its pageType, language is derived from the /xx prefix
// (including a bare /ar home), and the legacy flights contract is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeGscRow, normalizeGscRows, entityFromUrl, slugFromUrl, languageFromUrl } = require('../lib/seo/normalize.js');
const { buildOpportunityReport } = require('../lib/seo/report.js');

test('entityFromUrl recognizes every entity page type, with and without a language prefix', () => {
  assert.deepEqual(entityFromUrl('/flights/ber-bud'), { type: 'flight-route', key: 'ber-bud' });
  assert.deepEqual(entityFromUrl('/ar/flights/ber-bud'), { type: 'flight-route', key: 'ber-bud' });
  assert.deepEqual(entityFromUrl('/ar/city/dresden'), { type: 'city', key: 'dresden' });
  assert.deepEqual(entityFromUrl('/ar/airport/BRE'), { type: 'airport', key: 'BRE' });
  assert.deepEqual(entityFromUrl('/ar/airline/EN'), { type: 'airline', key: 'EN' });
  assert.deepEqual(entityFromUrl('/ar/country/DE'), { type: 'country', key: 'DE' });
  assert.deepEqual(entityFromUrl('/ar/blog/some-guide'), { type: 'blog', key: 'some-guide' });
});

test('a bare root or bare language prefix is the localized home page', () => {
  assert.deepEqual(entityFromUrl('/'), { type: 'home', key: 'home' });
  assert.deepEqual(entityFromUrl('https://airpiv.com/'), { type: 'home', key: 'home' });
  assert.deepEqual(entityFromUrl('/ar'), { type: 'home', key: 'home' });
  assert.equal(languageFromUrl('/ar'), 'ar'); // bare prefix still yields the language
});

test('non-entity URLs are dropped (never guessed)', () => {
  assert.equal(entityFromUrl('/search/BER-BUD'), null);
  assert.equal(entityFromUrl('/about.html'), null);
  assert.equal(entityFromUrl('/ar/flights/ber/bud'), null); // extra segment ≠ a route slug
});

test('legacy slugFromUrl contract is unchanged (flights only)', () => {
  assert.equal(slugFromUrl('https://airpiv.com/flights/fra-hel'), 'fra-hel');
  assert.equal(slugFromUrl('/ar/flights/ber-bud'), 'ber-bud');
  assert.equal(slugFromUrl('/ar/city/dresden'), null); // not a flights URL
  assert.equal(slugFromUrl('/about.html'), null);
});

test('normalizeGscRow tags pageType and derives the language from the prefix', () => {
  const row = normalizeGscRow({ page: 'https://airpiv.com/ar/airline/EN', impressions: 24, position: 2.04 });
  assert.equal(row.pageType, 'airline');
  assert.equal(row.slug, 'EN');
  assert.equal(row.language, 'ar');
  assert.equal(row.impressions, 24);
});

test('same slug under different entity types never merges into one row', () => {
  // A route "bre-xxx" and an airport "BRE" must stay distinct rows even if their
  // keys collide after casing — the grouping key is scoped by page type.
  const rows = normalizeGscRows([
    { page: '/ar/airport/BRE', impressions: 20, position: 3.15 },
    { page: '/ar/city/bremen', impressions: 5, position: 8 },
  ]);
  assert.equal(rows.length, 2);
  const byType = Object.fromEntries(rows.map((r) => [r.pageType, r]));
  assert.equal(byType.airport.slug, 'BRE');
  assert.equal(byType.city.slug, 'bremen');
});

test('the full Arabic priority set classifies through the report end-to-end', () => {
  // The real GSC pages from the brief (01–12/09/2026), mixed entity types.
  const raw = [
    { page: '/ar', impressions: 12, clicks: 8, position: 1 },
    { page: '/ar/airline/EN', impressions: 24, position: 2.04 },
    { page: '/ar/airport/BRE', impressions: 20, position: 3.15 },
    { page: '/ar/flights/ber-bud', impressions: 13, clicks: 1, position: 4.08 },
    { page: '/ar/city/dresden', impressions: 16, position: 4 },
  ];
  const report = buildOpportunityReport(raw);
  assert.equal(report.length, 5); // ALL five kept — not just the one flights row
  const types = new Set(report.map((r) => r.pageType));
  for (const t of ['home', 'airline', 'airport', 'flight-route', 'city']) {
    assert.ok(types.has(t), `report missing pageType ${t}`);
  }
  // Every row carries the §3 fields including the new pageType.
  for (const r of report) {
    assert.ok('pageType' in r && 'category' in r && 'position' in r);
    assert.equal(r.language, 'ar');
  }
});
