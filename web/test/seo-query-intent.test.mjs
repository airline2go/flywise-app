// Tests for query intent classification, query→route matching, and coverage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { INTENT, classifyIntent, routeTokens, matchQueriesToRoutes, summarizeRouteQueries, queryPageMatch } = require('../lib/seo/query-intent.js');
const { parseGscQueriesCsv } = require('../lib/seo/parse-gsc-csv.js');

test('classifyIntent recognizes duration/direct/price/distance across languages', () => {
  assert.equal(classifyIntent('flugzeit hamburg barcelona'), INTENT.DURATION);
  assert.equal(classifyIntent('wie lange fliegt man nach ibiza'), INTENT.DURATION);
  assert.equal(classifyIntent('direktflug berlin kopenhagen'), INTENT.DIRECT);
  assert.equal(classifyIntent('günstige flüge madrid'), INTENT.PRICE);
  assert.equal(classifyIntent('entfernung hamburg barcelona'), INTENT.DISTANCE);
  assert.equal(classifyIntent('vuelos madrid ibiza'), INTENT.FLIGHT); // generic
});

test('routeTokens drops the -2 variant suffix and short connectors', () => {
  assert.deepEqual(routeTokens('hamburg-barcelona-2'), ['hamburg', 'barcelona']);
  assert.deepEqual(routeTokens('palma-de-mallorca-duesseldorf'), ['palma', 'mallorca', 'duesseldorf']);
});

test('matchQueriesToRoutes maps queries to routes by city tokens, incl. umlaut transliteration', () => {
  const queryRows = [
    { query: 'flugzeit hamburg barcelona', impressions: 20, clicks: 0, position: 10.5 },
    { query: 'ibiza frankfurt flug', impressions: 17, clicks: 1, position: 7.06 },
    { query: 'flüge nach düsseldorf von palma', impressions: 5, clicks: 0, position: 12 },
    { query: 'random unrelated query', impressions: 3, clicks: 0, position: 30 },
  ];
  const report = [
    { slug: 'hamburg-barcelona-2' },
    { slug: 'ibiza-frankfurt' },
    { slug: 'palma-de-mallorca-duesseldorf' },
  ];
  const m = matchQueriesToRoutes(queryRows, report);
  assert.equal(m['hamburg-barcelona-2'][0].query, 'flugzeit hamburg barcelona');
  assert.equal(m['hamburg-barcelona-2'][0].intent, INTENT.DURATION);
  assert.equal(m['ibiza-frankfurt'][0].query, 'ibiza frankfurt flug');
  assert.ok(m['palma-de-mallorca-duesseldorf'], 'düsseldorf → duesseldorf matched');
  assert.equal(m['palma-de-mallorca-duesseldorf'][0].ctr, 0); // clicks 0 → real 0%
  // The unrelated query matched nothing.
  assert.ok(!Object.values(m).some((qs) => qs.some((q) => q.query.includes('unrelated'))));
});

test('summarizeRouteQueries picks primary + dominant intent by impressions', () => {
  const s = summarizeRouteQueries([
    { query: 'flugzeit x y', impressions: 20, intent: INTENT.DURATION },
    { query: 'günstige x y', impressions: 8, intent: INTENT.PRICE },
    { query: 'flugdauer x y', impressions: 6, intent: INTENT.DURATION },
  ]);
  assert.equal(s.primary.query, 'flugzeit x y');
  assert.equal(s.dominantIntent, INTENT.DURATION); // 26 vs 8
  assert.equal(s.secondary.length, 2);
});

test('queryPageMatch reports covered vs gap from real content flags', () => {
  assert.equal(queryPageMatch(INTENT.DURATION, { hasFlightTime: true }).covered, true);
  assert.equal(queryPageMatch(INTENT.DIRECT, { hasDirectInfo: false }).covered, false);
  assert.match(queryPageMatch(INTENT.DIRECT, { hasDirectInfo: false }).recommendation, /not clearly covered/i);
  assert.equal(queryPageMatch(null, {}).covered, null); // no queries → no verdict
});

test('parseGscQueriesCsv reads an Arabic Queries export (query column, no page)', () => {
  const csv = [
    'أهم طلبات البحث,النقرات,عدد الظهور,نسبة النقر إلى الظهور,موضع',
    'flugzeit hamburg barcelona,0,20,0%,10.5',
    'flugzeit ibiza frankfurt,0,17,0%,7.06',
  ].join('\n');
  const { rows, meta } = parseGscQueriesCsv(csv);
  assert.equal(meta.rowCount, 2);
  assert.equal(rows[0].query, 'flugzeit hamburg barcelona');
  assert.equal(rows[0].impressions, 20);
  assert.equal(rows[0].position, 10.5);
});

test('parseGscQueriesCsv never throws on malformed input', () => {
  assert.deepEqual(parseGscQueriesCsv('').rows, []);
  assert.deepEqual(parseGscQueriesCsv(null).rows, []);
});
