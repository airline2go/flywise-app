import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildRouteTitle, buildRouteMetaDescription, renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const R = (over) => Object.assign(
  {
    slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO',
    origin_city: 'Amsterdam', destination_city: 'Rome',
    origin_city_slug: 'amsterdam', destination_city_slug: 'rome',
    origin_country: 'NL', destination_country: 'IT',
  },
  over || {},
);

test('route titles ignore stored prices and keep stable non-price facets', () => {
  const t = buildRouteTitle(R({ cached_price: 83, price_min: 60, price_sample_count: 9, avg_duration_min: 90, distance_km: 1297, airline_count: 3 }), 'en');
  assert.equal(t, 'Flights from Amsterdam to Rome – Flight Time & Distance | Airpiv');
  assert.doesNotMatch(t, /Price|€|\b83\b|\b60\b/);
});

test('German title also ignores stored price data', () => {
  const t = buildRouteTitle(R({ cached_price: 83, price_min: 60, price_sample_count: 9, avg_duration_min: 90, distance_km: 1297, airline_count: 3 }), 'de');
  assert.equal(t, 'Flüge von Amsterdam nach Rome – Flugzeit & Entfernung | Airpiv');
  assert.doesNotMatch(t, /Preise|€|\b83\b|\b60\b/);
});

test('distance-only route uses the distance title', () => {
  assert.equal(
    buildRouteTitle(R({ distance_km: 1297, cached_price: 83 }), 'en'),
    'Flights from Amsterdam to Rome – Distance | Airpiv',
  );
});

test('direct route falls back to direct title when no duration/distance exists', () => {
  assert.equal(
    buildRouteTitle(R({ direct_flight_available: true, cached_price: 83 }), 'en'),
    'Direct Flights from Amsterdam to Rome | Airpiv',
  );
});

test('data-poor route uses plain base title', () => {
  assert.equal(buildRouteTitle(R({ cached_price: 83 }), 'en'), 'Flights from Amsterdam to Rome | Airpiv');
});

test('meta description ignores cached and aggregate prices', () => {
  const m = buildRouteMetaDescription(R({
    cached_price: 83, price_min: 60, price_sample_count: 9,
    distance_km: 1297, avg_duration_min: 90, airline_count: 3, direct_flight_available: true,
  }), 'en');
  assert.equal(m, 'Compare flight time, distance, airlines, and direct flights from Amsterdam to Rome on Airpiv.');
  assert.doesNotMatch(m, /price|€|\b83\b|\b60\b/i);
});

test('German meta ignores stored prices too', () => {
  const m = buildRouteMetaDescription(R({
    cached_price: 83, price_min: 60, price_sample_count: 9,
    distance_km: 1297, avg_duration_min: 90, airline_count: 3, direct_flight_available: true,
  }), 'de');
  assert.doesNotMatch(m, /Flugpreise|Preise|€|\b83\b|\b60\b/);
  assert.match(m, /Flugzeit/);
});

test('manual German title still wins', () => {
  const html = renderFlightRoutePage(R({ custom_title: 'MANUAL TITLE', distance_km: 202, cached_price: 83 }), 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>MANUAL TITLE<\/title>/);
});

test('engine-generated German title/meta/body still work when language matches', () => {
  const route = R({
    seo_lang: 'de',
    seo_title: 'ENGINE DE TITLE',
    seo_meta_description: 'ENGINE DE META',
    seo_intro_html: '<p>Einzigartiger Text.</p>',
    seo_faq: [{ question: 'Wie lange dauert der Flug?', answer: 'Rund 50 Min.' }],
    distance_km: 202,
  });
  const html = renderFlightRoutePage(route, 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>ENGINE DE TITLE<\/title>/);
  assert.match(html, /<meta name="description" content="ENGINE DE META">/);
  assert.match(html, /Einzigartiger Text/);
});

test('non-German page does not leak German generated content', () => {
  const route = R({
    seo_lang: 'de', seo_title: 'ENGINE DE TITLE', seo_meta_description: 'ENGINE DE META',
    seo_intro_html: '<p>Einzigartig.</p>', destination_city: 'Rome',
    distance_km: 1297, avg_duration_min: 90, airline_count: 3, cached_price: 83,
  });
  const html = renderFlightRoutePage(route, 'en', [], { fromOrigin: [], toDestination: [] }).html;
  assert.doesNotMatch(html, /ENGINE DE TITLE|Einzigartig/);
  assert.match(html, /<title>Flights from Amsterdam to Rome – Flight Time &amp; Distance \| Airpiv<\/title>/);
  assert.doesNotMatch(html, /Prices|route-price/);
});

test('visible h1 remains the clean route phrase', () => {
  const html = renderFlightRoutePage(R({ destination_city: 'Rome', cached_price: 83, distance_km: 1297 }), 'en', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<h1>Flights from Amsterdam to Rome<\/h1>/);
});
