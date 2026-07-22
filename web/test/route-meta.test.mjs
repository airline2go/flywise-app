// Tests for the data-driven route <title> and meta description.
// Key invariant (per the request): the TITLE is stable and never contains a
// price; the volatile "from" price appears ONLY in the meta description, and
// every meta clause is data-gated (omitted when its data is missing).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildRouteTitle, buildRouteMetaDescription, renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []); // localizeCity falls back to raw names — fine for these fixtures

const R = (over) => Object.assign(
  { slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom', origin_city_slug: 'amsterdam', destination_city_slug: 'rom', origin_country: 'NL', destination_country: 'IT' },
  over || {},
);

// ─── Title: stable, no price ──────────────────────────────────────────────
test('title is data-descriptive and never contains a price', () => {
  const t = buildRouteTitle(R({}), 'de');
  assert.equal(t, 'Amsterdam → Rom Flüge | Flugzeit, Entfernung & Airlines');
  assert.doesNotMatch(t, /€|\bab \d|\d+\s?€/);
});

test('title localizes (English)', () => {
  assert.equal(buildRouteTitle(R({ destination_city: 'Rome' }), 'en'), 'Amsterdam → Rome Flights | Flight Time, Distance & Airlines');
});

// ─── Meta: price + distance + directness, all data-gated ──────────────────
test('meta includes from-price, distance and direct clause when present (de)', () => {
  const m = buildRouteMetaDescription(R({ cached_price: 83, cached_currency: 'EUR', distance_km: 1297, direct_flight_available: true }), 'de');
  assert.equal(m, 'Flüge Amsterdam nach Rom ab 83 €. Entfernung 1.297 km. Direktflüge verfügbar.');
});

test('meta omits the price clause when there is no cached price', () => {
  const m = buildRouteMetaDescription(R({ distance_km: 1297, direct_flight_available: true }), 'de');
  assert.equal(m, 'Flüge Amsterdam nach Rom. Entfernung 1.297 km. Direktflüge verfügbar.');
  assert.doesNotMatch(m, / ab /);
});

test('meta omits distance and directness when that data is absent', () => {
  assert.equal(buildRouteMetaDescription(R({ cached_price: 50, cached_currency: 'EUR' }), 'de'), 'Flüge Amsterdam nach Rom ab 50 €.');
});

test('all_direct yields the "only direct" clause', () => {
  const m = buildRouteMetaDescription(R({ distance_km: 400, all_direct: true, direct_flight_available: true }), 'de');
  assert.match(m, /nur Direktflüge\.$/);
});

test('meta localizes (English, comma thousands separator)', () => {
  const m = buildRouteMetaDescription(R({ destination_city: 'Rome', cached_price: 83, cached_currency: 'EUR', distance_km: 1297, direct_flight_available: true }), 'en');
  assert.equal(m, 'Flights from Amsterdam to Rome from 83 €. Distance 1,297 km. Direct flights available.');
});

test('non-EUR currency is rendered with its code', () => {
  const m = buildRouteMetaDescription(R({ cached_price: 120, cached_currency: 'CHF', distance_km: 500 }), 'de');
  assert.match(m, /ab 120 CHF\./);
});

// ─── Precedence: manual > engine (route.seo) > generated default ──────────
test('route.seo.title/metaDescription (engine output) is used when present', () => {
  const html = renderFlightRoutePage(R({ distance_km: 1297, direct_flight_available: true, seo: { title: 'ENGINE TITLE X', metaDescription: 'ENGINE META X' } }), 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>ENGINE TITLE X<\/title>/);
  assert.match(html, /<meta name="description" content="ENGINE META X">/);
});

test('an admin custom_title still wins over the engine and the default', () => {
  const html = renderFlightRoutePage(R({ distance_km: 1297, custom_title: 'MANUAL TITLE', seo: { title: 'ENGINE TITLE X' } }), 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>MANUAL TITLE<\/title>/);
});

test('with no manual/engine content, the generated default title+meta render', () => {
  const html = renderFlightRoutePage(R({ distance_km: 1297, cached_price: 83, cached_currency: 'EUR', direct_flight_available: true }), 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>Amsterdam → Rom Flüge \| Flugzeit, Entfernung &amp; Airlines<\/title>/);
  assert.match(html, /<meta name="description" content="Flüge Amsterdam nach Rom ab 83 €\. Entfernung 1\.297 km\. Direktflüge verfügbar\.">/);
});
