// P0-29 — distinct-airport title disambiguation. Pins which endpoint(s) get
// airport-qualified when two routes share a city-name title but differ by
// airport, and that P0-28 duplicates / unique titles are left alone. Also
// checks the renderer emits the qualified, unique title/H1 for a tagged route.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildTitleDisambiguationMap } from '../lib/seo/route-title.mjs';

const row = (slug, o, d, oc, dc) => ({ slug, origin_iata: o, destination_iata: d, origin_city: oc, destination_city: dc });

// ─── which endpoint varies ─────────────────────────────────────────────────
test('qualifies only the DESTINATION when just the destination airport varies', () => {
  const m = buildTitleDisambiguationMap([
    row('frankfurt-hamburg', 'FRA', 'HAM', 'Frankfurt', 'Hamburg'),
    row('frankfurt-hamburg-2', 'FRA', 'XFW', 'Frankfurt', 'Hamburg'),
  ]);
  assert.deepEqual(m.get('frankfurt-hamburg'), { origin: false, destination: true });
  assert.deepEqual(m.get('frankfurt-hamburg-2'), { origin: false, destination: true });
});

test('qualifies only the ORIGIN when just the origin airport varies', () => {
  const m = buildTitleDisambiguationMap([
    row('brussels-warsaw', 'BRU', 'WAW', 'Brussels', 'Warsaw'),
    row('brussels-warsaw-2', 'CRL', 'WAW', 'Brussels', 'Warsaw'),
  ]);
  assert.deepEqual(m.get('brussels-warsaw'), { origin: true, destination: false });
  assert.deepEqual(m.get('brussels-warsaw-2'), { origin: true, destination: false });
});

test('qualifies BOTH when both endpoints vary across the group', () => {
  const m = buildTitleDisambiguationMap([
    row('a', 'FRA', 'HAM', 'Frankfurt', 'Hamburg'),
    row('b', 'HHN', 'XFW', 'Frankfurt', 'Hamburg'),
  ]);
  assert.deepEqual(m.get('a'), { origin: true, destination: true });
  assert.deepEqual(m.get('b'), { origin: true, destination: true });
});

// ─── what is left alone ────────────────────────────────────────────────────
test('a route with a unique city-pair title is absent (no qualification)', () => {
  const m = buildTitleDisambiguationMap([
    row('frankfurt-hamburg', 'FRA', 'HAM', 'Frankfurt', 'Hamburg'),
    row('berlin-munich', 'BER', 'MUC', 'Berlin', 'Munich'),
  ]);
  assert.equal(m.get('berlin-munich'), undefined);
  assert.equal(m.get('frankfurt-hamburg'), undefined);
});

test('P0-28 exact-duplicate LOSERS are excluded (they canonical to the winner)', () => {
  // Same airport pair under two slugs is a P0-28 duplicate, not a title
  // collision — neither survives here as a distinct route to qualify.
  const m = buildTitleDisambiguationMap([
    row('ams-vie', 'AMS', 'VIE', 'Amsterdam', 'Vienna'),
    row('amsterdam-vienna', 'AMS', 'VIE', 'Amsterdam', 'Vienna'),
  ]);
  assert.equal(m.size, 0);
});

test('the surviving winner of a duplicate is NOT qualified when its title is otherwise unique', () => {
  // ams-vie/amsterdam-vienna collapse to one winner; a second, distinct-airport
  // Amsterdam→Vienna would qualify, but with only the duplicate present the
  // winner keeps its clean title.
  const m = buildTitleDisambiguationMap([
    row('ams-vie', 'AMS', 'VIE', 'Amsterdam', 'Vienna'),
    row('amsterdam-vienna', 'AMS', 'VIE', 'Amsterdam', 'Vienna'),
    row('berlin-munich', 'BER', 'MUC', 'Berlin', 'Munich'),
  ]);
  assert.equal(m.get('amsterdam-vienna'), undefined);
});

test('rows missing a city name are skipped safely (sitemap-shape { id, o, d })', () => {
  const m = buildTitleDisambiguationMap([
    { id: 'fra-ham', o: 'FRA', d: 'HAM' },
    { id: 'fra-xfw', o: 'FRA', d: 'XFW' },
  ]);
  assert.equal(m.size, 0);
});

// ─── renderer emits the unique, qualified title ────────────────────────────
const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
setGeoData(
  [{ city_slug: 'frankfurt', airport_codes: ['FRA'], translations: { de: 'Frankfurt', en: 'Frankfurt' } },
    { city_slug: 'hamburg', airport_codes: ['HAM', 'XFW'], translations: { de: 'Hamburg', en: 'Hamburg' } }],
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }],
);
const route = (over) => Object.assign({
  origin_iata: 'FRA', destination_iata: 'XFW', origin_city: 'Frankfurt', destination_city: 'Hamburg',
  origin_city_slug: 'frankfurt', destination_city_slug: 'hamburg', origin_country: 'DE', destination_country: 'DE',
  distance_km: 399, airline_count: 0, slug: 'frankfurt-hamburg-2',
}, over);
const titleOf = (h) => (h.match(/<title>([^<]*)<\/title>/) || [])[1];
const h1Of = (h) => (h.match(/<h1>([^<]*)<\/h1>/) || [])[1];

test('a tagged route renders an airport-qualified, unique title and H1', () => {
  const { html } = renderFlightRoutePage(route({ titleQualify: { origin: false, destination: true } }), 'en', [], [], []);
  assert.match(titleOf(html), /Hamburg \(XFW\)/, 'destination is airport-qualified in <title>');
  assert.match(h1Of(html), /Hamburg \(XFW\)/, 'H1 inherits the qualification');
  assert.ok(!/Frankfurt \(/.test(h1Of(html)), 'the non-varying origin stays a clean city name');
});

test('an untagged route keeps the clean city-name title (no regression)', () => {
  const { html } = renderFlightRoutePage(route({ destination_iata: 'HAM', slug: 'frankfurt-hamburg' }), 'en', [], [], []);
  assert.ok(!/\(XFW\)|\(HAM\)/.test(titleOf(html)), 'no airport code leaks into a normal title');
  assert.match(h1Of(html), /Frankfurt/);
});
