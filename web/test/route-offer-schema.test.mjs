// [P0.3 DATA-TRUTH] The JSON-LD Offer with availability:InStock claims a fare is
// bookable right now. A price_min aggregate is a historically OBSERVED minimum,
// never a live bookable quote — so it must NOT emit an InStock Offer, even when
// the aggregate was recomputed recently (rule #8: no "historical price +
// InStock"). Only a genuinely live, fresh price may. The server render has no
// live price source today, so in practice no Offer is emitted from row data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const R = (over) => Object.assign(
  { slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO', origin_city: 'Amsterdam', destination_city: 'Rom', origin_city_slug: 'amsterdam', destination_city_slug: 'rom', origin_country: 'NL', destination_country: 'IT' },
  over || {},
);
const links = { fromOrigin: [], toDestination: [] };
const render = (over) => renderFlightRoutePage(R(over), 'de', [], links, []);
const nowIso = () => new Date().toISOString();
const daysAgoIso = (d) => new Date(Date.now() - d * 24 * 3600 * 1000).toISOString();

test('5. a STALE sample-backed aggregate min → no InStock Offer', () => {
  const { html } = render({ price_min: 60, price_avg: 90, price_max: 120, price_currency: 'EUR', price_sample_count: 9, price_updated_at: daysAgoIso(60) });
  assert.doesNotMatch(html, /"@type":"Offer"/);
  assert.doesNotMatch(html, /schema\.org\/InStock/);
});

test('6. a FRESH sample-backed aggregate min → STILL no InStock Offer (it is observed, not live)', () => {
  // The decisive strict-mode assertion: recency of the aggregate does not make
  // it a bookable quote, so freshness alone never unlocks an Offer.
  const { html } = render({ price_min: 60, price_avg: 90, price_max: 120, price_currency: 'EUR', price_sample_count: 9, price_updated_at: nowIso() });
  assert.doesNotMatch(html, /"@type":"Offer"/);
});

test('6b. a cached (timestamp-less) price → no Offer', () => {
  const { html } = render({ cached_price: 49, cached_currency: 'EUR' });
  assert.doesNotMatch(html, /"@type":"Offer"/);
});

test('8. no price anywhere → no Offer and no price claim in JSON-LD', () => {
  const { html } = render({ distance_km: 1297 });
  assert.doesNotMatch(html, /"@type":"Offer"/);
  assert.doesNotMatch(html, /"price":/);
});

test('a real observed distance still yields flightDistance, a real duration yields estimatedFlightDuration (both gated on real values)', () => {
  const { html } = render({ distance_km: 1297, avg_duration_min: 135 });
  assert.match(html, /"flightDistance":"1297 km"/);
  assert.match(html, /"estimatedFlightDuration":"PT2H15M"/);
});

test('a distance-only route emits NO estimatedFlightDuration (P0.1 parity on the frontend schema)', () => {
  const { html } = render({ distance_km: 1297 });
  assert.match(html, /"flightDistance":"1297 km"/);
  assert.doesNotMatch(html, /estimatedFlightDuration/);
});
