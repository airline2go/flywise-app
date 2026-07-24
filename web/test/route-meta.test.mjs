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

// ─── Precedence: manual > engine-generated (matching language) > default ──
test('German page uses the engine-generated title/meta/body/FAQ when seo_lang matches', () => {
  const route = R({ seo_lang: 'de', seo_title: 'ENGINE DE TITLE', seo_meta_description: 'ENGINE DE META', seo_intro_html: '<p>Einzigartiger Text.</p><h2>Preisanalyse</h2><p>Ab 29 €.</p>', seo_faq: [{ question: 'Wie lange dauert der Flug?', answer: 'Rund 50 Min.' }], distance_km: 202, direct_flight_available: true });
  const html = renderFlightRoutePage(route, 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>ENGINE DE TITLE<\/title>/);
  assert.match(html, /<meta name="description" content="ENGINE DE META">/);
  assert.match(html, /<section class="route-generated-body"><p>Einzigartiger Text\.<\/p><h2>Preisanalyse<\/h2>/); // body rendered as raw HTML
  assert.match(html, /Wie lange dauert der Flug\?/); // generated FAQ, visible
  assert.match(html, /"name":"Wie lange dauert der Flug\?"/); // and in the FAQPage JSON-LD
  // templated best-time prose suppressed (the body already covers it) — check the
  // actual <section> tag, not the class name (which is always present in the
  // inlined static CSS regardless of whether the section renders)
  assert.doesNotMatch(html, /<section class="route-besttime-section">/);
});

test('a non-German page does NOT use German generated content — localized default instead', () => {
  const route = R({ seo_lang: 'de', seo_title: 'ENGINE DE TITLE', seo_meta_description: 'ENGINE DE META', seo_intro_html: '<p>Einzigartig.</p>', seo_faq: [{ question: 'X', answer: 'Y' }], destination_city: 'Rome', distance_km: 1297, direct_flight_available: true, cached_price: 83, cached_currency: 'EUR' });
  const html = renderFlightRoutePage(route, 'en', [], { fromOrigin: [], toDestination: [] }).html;
  assert.doesNotMatch(html, /ENGINE DE TITLE/);
  // the actual <section> tag, not the class name (always present in the
  // inlined static CSS regardless of whether the section renders)
  assert.doesNotMatch(html, /<section class="route-generated-body">/);
  assert.match(html, /<title>Amsterdam → Rome Flights \| Flight Time, Distance &amp; Airlines<\/title>/);
});

test('an admin custom_title still wins over the engine on the matching language', () => {
  const html = renderFlightRoutePage(R({ seo_lang: 'de', seo_title: 'ENGINE DE TITLE', custom_title: 'MANUAL TITLE', distance_km: 202 }), 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>MANUAL TITLE<\/title>/);
});

test('a manual intro_text suppresses the generated body (manual wins)', () => {
  const html = renderFlightRoutePage(R({ seo_lang: 'de', seo_intro_html: '<p>GENERATED</p>', intro_text: 'Handgeschriebene Einleitung.', distance_km: 202 }), 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.doesNotMatch(html, /<section class="route-generated-body">/);
  assert.doesNotMatch(html, /GENERATED<\/p>/);
  assert.match(html, /Handgeschriebene Einleitung\./);
});

test('with no manual/engine content, the generated default title+meta render', () => {
  const html = renderFlightRoutePage(R({ distance_km: 1297, cached_price: 83, cached_currency: 'EUR', direct_flight_available: true }), 'de', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<title>Amsterdam → Rom Flüge \| Flugzeit, Entfernung &amp; Airlines<\/title>/);
  assert.match(html, /<meta name="description" content="Flüge Amsterdam nach Rom ab 83 €\. Entfernung 1\.297 km\. Direktflüge verfügbar\.">/);
});
