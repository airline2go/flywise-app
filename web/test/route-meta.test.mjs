// Tests for the data-driven route <title> and meta description.
// Key invariants (per the request):
//   • Titles use natural language ("Flights from X to Y"), never arrows, always
//     end in the brand "| Airpiv", and never contain a volatile price value.
//   • The "Prices" facet word appears only when a real cached price exists;
//     otherwise the title sheds that word (a data-gated fallback), never a
//     fabricated price.
//   • The meta description is one localized, per-city-pair-unique sentence.
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

// ─── Title: natural language, brand suffix, never a price value ────────────
test('title uses natural language, ends in the brand, and never contains a price value', () => {
  const t = buildRouteTitle(R({ cached_price: 83, cached_currency: 'EUR' }), 'de');
  assert.equal(t, 'Flüge von Amsterdam nach Rom – Preise, Flugzeit & Airlines | Airpiv');
  assert.doesNotMatch(t, /→/);
  assert.doesNotMatch(t, /€|\bab \d|\d+\s?€/);
  assert.match(t, /\| Airpiv$/);
});

test('title localizes (English primary, with price)', () => {
  assert.equal(
    buildRouteTitle(R({ destination_city: 'Rome', cached_price: 83 }), 'en'),
    'Flights from Amsterdam to Rome – Prices, Flight Time & Airlines | Airpiv',
  );
});

test('without a cached price the title sheds "Prices" and uses the distance/time fallback', () => {
  assert.equal(
    buildRouteTitle(R({ destination_city: 'Rome', distance_km: 1297 }), 'en'),
    'Flights from Amsterdam to Rome – Flight Time & Distance | Airpiv',
  );
});

test('with no price and no distance, a direct route uses the direct fallback', () => {
  assert.equal(
    buildRouteTitle(R({ destination_city: 'Rome', direct_flight_available: true }), 'en'),
    'Direct Flights from Amsterdam to Rome | Airpiv',
  );
});

test('a data-poor route falls back to the plain base title', () => {
  assert.equal(
    buildRouteTitle(R({ destination_city: 'Rome' }), 'en'),
    'Flights from Amsterdam to Rome | Airpiv',
  );
});

// ─── Meta: localized sentence + a REAL live price when one exists ─────────
test('meta appends the real live "from" price when a cached price exists (de)', () => {
  const m = buildRouteMetaDescription(R({ cached_price: 83, cached_currency: 'EUR', distance_km: 1297, direct_flight_available: true }), 'de');
  assert.equal(m, 'Vergleiche Live-Flugpreise, Flugzeit, Entfernung, Airlines und Direktflüge von Amsterdam nach Rom. Jetzt Flüge auf Airpiv finden. Flüge ab 83 €.');
});

test('meta omits the price clause entirely when there is no cached price', () => {
  const m = buildRouteMetaDescription(R({ distance_km: 1297, direct_flight_available: true }), 'de');
  assert.equal(m, 'Vergleiche Live-Flugpreise, Flugzeit, Entfernung, Airlines und Direktflüge von Amsterdam nach Rom. Jetzt Flüge auf Airpiv finden.');
  assert.doesNotMatch(m, /→/);
  assert.doesNotMatch(m, /\d+\s?€|ab \d/);
});

test('a zero/invalid cached price never produces a price clause (never fabricated)', () => {
  assert.doesNotMatch(buildRouteMetaDescription(R({ cached_price: 0 }), 'de'), /ab /);
  assert.doesNotMatch(buildRouteMetaDescription(R({ cached_price: null }), 'de'), /ab /);
});

test('meta localizes, with and without price (English)', () => {
  assert.equal(
    buildRouteMetaDescription(R({ destination_city: 'Rome' }), 'en'),
    'Compare live flight prices, flight time, distance, airlines and direct flights from Amsterdam to Rome on Airpiv.',
  );
  assert.equal(
    buildRouteMetaDescription(R({ destination_city: 'Rome', cached_price: 83, cached_currency: 'EUR' }), 'en'),
    'Compare live flight prices, flight time, distance, airlines and direct flights from Amsterdam to Rome on Airpiv. Flights from 83 €.',
  );
});

test('a non-EUR cached price renders with its currency symbol/code', () => {
  assert.match(buildRouteMetaDescription(R({ cached_price: 120, cached_currency: 'GBP' }), 'en'), /Flights from £120\.$/);
  assert.match(buildRouteMetaDescription(R({ cached_price: 120, cached_currency: 'CHF' }), 'en'), /Flights from 120 CHF\.$/);
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
  assert.match(html, /<title>Flights from Amsterdam to Rome – Prices, Flight Time &amp; Airlines \| Airpiv<\/title>/);
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
  assert.match(html, /<title>Flüge von Amsterdam nach Rom – Preise, Flugzeit &amp; Airlines \| Airpiv<\/title>/);
  assert.match(html, /<meta name="description" content="Vergleiche Live-Flugpreise, Flugzeit, Entfernung, Airlines und Direktflüge von Amsterdam nach Rom\. Jetzt Flüge auf Airpiv finden\. Flüge ab 83 €\.">/);
});

// ─── H1 heading: clean natural-language phrase (no facet clause, no brand) ─
test('the visible <h1> strips the facet clause and the brand', () => {
  const html = renderFlightRoutePage(R({ destination_city: 'Rome', cached_price: 83, cached_currency: 'EUR' }), 'en', [], { fromOrigin: [], toDestination: [] }).html;
  assert.match(html, /<h1>Flights from Amsterdam to Rome<\/h1>/);
});
