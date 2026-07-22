// Tests for the real-lastmod sitemap helpers (sitemap-serialize.mjs). The old
// behavior stamped every URL with today's date on every request, which trains
// crawlers to ignore <lastmod>; these assert real per-entity dates and clean
// omission when no date is known.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toLastmod, routeLastmod, airportEntriesFromRoutes, urlsetXml } from '../lib/sitemap-serialize.mjs';

test('toLastmod normalizes ISO timestamps to YYYY-MM-DD', () => {
  assert.equal(toLastmod('2026-06-13T18:39:09.260Z'), '2026-06-13');
});

test('toLastmod returns null for missing/invalid values', () => {
  assert.equal(toLastmod(null), null);
  assert.equal(toLastmod(undefined), null);
  assert.equal(toLastmod(''), null);
  assert.equal(toLastmod('not-a-date'), null);
});

test('routeLastmod prefers updated_at, then insights_updated_at, then created_at', () => {
  assert.equal(routeLastmod({ updated_at: '2026-05-02T00:00:00Z', insights_updated_at: '2026-04-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }), '2026-05-02');
  assert.equal(routeLastmod({ insights_updated_at: '2026-04-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }), '2026-04-01');
  assert.equal(routeLastmod({ created_at: '2026-01-01T00:00:00Z' }), '2026-01-01');
  assert.equal(routeLastmod({}), null);
});

test('airportEntriesFromRoutes keeps the newest date per code, in first-seen order', () => {
  const routes = [
    { origin_iata: 'BER', destination_iata: 'MUC', updated_at: '2026-01-01T00:00:00Z' },
    { origin_iata: 'BER', destination_iata: 'CDG', updated_at: '2026-03-01T00:00:00Z' },
  ];
  const m = airportEntriesFromRoutes(routes);
  assert.deepEqual([...m.keys()], ['BER', 'MUC', 'CDG']);
  assert.equal(m.get('BER'), '2026-03-01'); // newest among BER's two routes
  assert.equal(m.get('MUC'), '2026-01-01');
  assert.equal(m.get('CDG'), '2026-03-01');
});

test('urlsetXml emits <lastmod> when present and omits it when null', () => {
  const xml = urlsetXml([
    { loc: 'https://airpiv.com/flights/ber-muc', lastmod: '2026-03-01' },
    { loc: 'https://airpiv.com/airport/ZZZ', lastmod: null },
  ]);
  assert.match(xml, /<loc>https:\/\/airpiv\.com\/flights\/ber-muc<\/loc>\n\s*<lastmod>2026-03-01<\/lastmod>/);
  // exactly one <lastmod> total — the null-date entry has none
  assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
});

test('urlsetXml never stamps a hardcoded "today" on a dateless URL', () => {
  const today = new Date().toISOString().slice(0, 10);
  const xml = urlsetXml([{ loc: 'https://airpiv.com/x', lastmod: null }]);
  assert.doesNotMatch(xml, new RegExp('<lastmod>' + today + '</lastmod>'));
});

test('urlsetXml accepts bare URL strings (back-compat, no lastmod)', () => {
  const xml = urlsetXml(['https://airpiv.com/x']);
  assert.match(xml, /<loc>https:\/\/airpiv\.com\/x<\/loc>/);
  assert.doesNotMatch(xml, /<lastmod>/);
});
