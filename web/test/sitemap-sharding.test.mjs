// Automated sitemap validation (SEO spec requirement 11): valid XML structure,
// correct auto-sharding at Google's limits, no duplicate/parameter/insecure/
// wrong-host URLs, and index↔shard-name consistency. Pure functions only — no
// network — so this runs in CI with `node --test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkUrls,
  chunkLastmod,
  sitemapIndexXml,
  urlsetXml,
  validateSitemapUrls,
  MAX_URLS_PER_SITEMAP,
  shardLoc,
  pageUrls,
  airportLastmods,
} from '../lib/sitemap-serialize.mjs';

const mkUrls = (n, prefix = 'https://airpiv.com/x') =>
  Array.from({ length: n }, (_, i) => ({ loc: `${prefix}${i}`, lastmod: null }));

test('chunkUrls: empty input yields no shards (no orphan sitemap)', () => {
  assert.deepEqual(chunkUrls([]), []);
});

test('chunkUrls: splits at the URL-count limit', () => {
  const chunks = chunkUrls(mkUrls(5), 2);
  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks.map((c) => c.length), [2, 2, 1]);
});

test('chunkUrls: a single list under both limits stays one shard', () => {
  assert.equal(chunkUrls(mkUrls(100)).length, 1);
});

test('chunkUrls: splits on the byte budget even under the URL count', () => {
  // Tiny byte budget forces one URL per shard regardless of the 50k count cap.
  const chunks = chunkUrls(mkUrls(4), MAX_URLS_PER_SITEMAP, 200);
  assert.equal(chunks.length, 4);
});

test('chunkUrls: never exceeds the configured URL cap', () => {
  for (const chunk of chunkUrls(mkUrls(120000))) {
    assert.ok(chunk.length <= MAX_URLS_PER_SITEMAP);
  }
});

test('chunkLastmod: newest date wins, null when none known', () => {
  assert.equal(chunkLastmod([{ loc: 'a', lastmod: '2026-01-01' }, { loc: 'b', lastmod: '2026-05-09' }]), '2026-05-09');
  assert.equal(chunkLastmod([{ loc: 'a', lastmod: null }]), null);
});

test('sitemapIndexXml: well-formed <sitemapindex> with one child per entry', () => {
  const xml = sitemapIndexXml([
    { loc: 'https://airpiv.com/sitemap-routes.xml', lastmod: '2026-07-01' },
    { loc: 'https://airpiv.com/sitemap-cities.xml', lastmod: null },
  ]);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.equal((xml.match(/<sitemapindex/g) || []).length, 1);
  assert.equal((xml.match(/<\/sitemapindex>/g) || []).length, 1);
  assert.equal((xml.match(/<sitemap>/g) || []).length, 2);
  assert.equal((xml.match(/<\/sitemap>/g) || []).length, 2);
  assert.ok(xml.includes('<loc>https://airpiv.com/sitemap-routes.xml</loc>'));
  assert.ok(xml.includes('<lastmod>2026-07-01</lastmod>'));
  // The dateless child carries no <lastmod>.
  assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
});

test('urlsetXml: well-formed <urlset> with one <url> per entry', () => {
  const xml = urlsetXml(mkUrls(3));
  assert.equal((xml.match(/<urlset/g) || []).length, 1);
  assert.equal((xml.match(/<url>/g) || []).length, 3);
  assert.equal((xml.match(/<\/url>/g) || []).length, 3);
});

test('validateSitemapUrls: clean canonical https URLs pass', () => {
  assert.deepEqual(validateSitemapUrls([
    'https://airpiv.com/',
    'https://airpiv.com/city/berlin',
    'https://airpiv.com/en/flights/ber-cdg',
  ]), []);
});

test('validateSitemapUrls: flags every forbidden URL shape', () => {
  const problems = validateSitemapUrls([
    'http://airpiv.com/insecure',
    'https://www.airpiv.com/city/berlin',
    'https://api.airpiv.com/route-pages',
    'https://airpiv.com/search?q=x',
    'https://example.com/off-site',
    'https://airpiv.com/dup',
    'https://airpiv.com/dup',
  ]);
  assert.ok(problems.some((p) => p.includes('insecure http')));
  assert.ok(problems.some((p) => p.includes('www.')));
  assert.ok(problems.some((p) => p.includes('api.')));
  assert.ok(problems.some((p) => p.includes('parameter URL')));
  assert.ok(problems.some((p) => p.includes('non-canonical')));
  assert.ok(problems.some((p) => p.includes('duplicate URL')));
});

test('shardLoc: shard 1 keeps the flat name, overflow goes under /sitemap-shard/', () => {
  assert.equal(shardLoc('routes', 1), 'https://airpiv.com/sitemap-routes.xml');
  assert.equal(shardLoc('routes', 2), 'https://airpiv.com/sitemap-shard/routes-2.xml');
});

test('index↔overflow consistency: every overflow loc resolves back to (type, n≥2)', () => {
  // What the overflow route (app/sitemap-shard/[file]/route.js) accepts.
  const OVERFLOW_RE = /^([a-z]+)-(\d+)\.xml$/;
  for (const type of ['routes', 'cities', 'airports']) {
    for (let n = 2; n <= 4; n++) {
      const loc = shardLoc(type, n);
      const file = loc.split('/sitemap-shard/')[1];
      const m = OVERFLOW_RE.exec(file);
      assert.ok(m, `overflow file ${file} must match the route regex`);
      assert.equal(m[1], type);
      assert.equal(Number(m[2]), n);
      assert.ok(n >= 2);
    }
  }
});

test('airportLastmods: distinct codes from route items, newest date per code', () => {
  const m = airportLastmods([
    { o: 'BER', d: 'MUC', lastmod: '2026-01-01' },
    { o: 'BER', d: 'CDG', lastmod: '2026-05-09' }, // BER's newest, adds CDG
    { o: 'MUC', d: 'BER', lastmod: null },          // reverse pair, no date
  ]);
  assert.equal(m.get('BER'), '2026-05-09'); // newest across BER's routes
  assert.equal(m.get('MUC'), '2026-01-01');
  assert.equal(m.get('CDG'), '2026-05-09');
  assert.equal(m.size, 3); // BER, MUC, CDG — distinct
});

test('airportLastmods: skips missing IATA codes', () => {
  const m = airportLastmods([{ o: 'BER', d: null, lastmod: '2026-01-01' }]);
  assert.equal(m.size, 1);
  assert.ok(m.has('BER'));
});

test('pageUrls: only canonical https static pages, includes the home page', () => {
  const urls = pageUrls();
  assert.deepEqual(validateSitemapUrls(urls), []);
  assert.ok(urls.some((u) => u.loc === 'https://airpiv.com/'));
  // Home + the 9 named static pages in STATIC_PAGES (cheap-flights,
  // last-minute-flights, about, blog, contact, privacy, terms, refund-policy,
  // cookies) — all present under public/, so none is a 404 in the sitemap.
  assert.equal(urls.length, 10);
});
