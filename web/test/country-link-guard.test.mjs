// [COUNTRY-LINK-GUARD] P0-32 — a country code is linked ONLY when it has a real
// country page (present in the /countries list). ~7 of the ~27 linked codes
// (SA, AE, FI, …) have none, so an unguarded link 404s. This pins: a
// page-having country (DE) is linked; a page-less country (SA) is NEVER emitted
// as a country/ href — in the breadcrumb, the chip lists, or the JSON-LD — but
// its NAME still shows as plain text where a breadcrumb crumb existed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData, hasCountry } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');

// DE has a page; SA does not (absent from the /countries list handed to setGeoData).
setGeoData(
  [{ city_slug: 'berlin', airport_codes: ['BER'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'jeddah', airport_codes: ['JED'], translations: { de: 'Dschidda', en: 'Jeddah' } }],
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }],
);

test('hasCountry is true only for a country present in the loaded list', () => {
  assert.equal(hasCountry('DE'), true);
  assert.equal(hasCountry('SA'), false);
  assert.equal(hasCountry(undefined), false);
});

const route = (over) => Object.assign({
  origin_iata: 'BER', destination_iata: 'JED', origin_city: 'Berlin', destination_city: 'Jeddah',
  origin_city_slug: 'berlin', destination_city_slug: 'jeddah', origin_country: 'DE', destination_country: 'SA',
  distance_km: 4000, airline_count: 3, slug: 'berlin-jeddah',
}, over);

test('a route to a page-LESS country emits no country/ link and no JSON-LD country item', () => {
  const { html } = renderFlightRoutePage(route(), 'en', [], [], []);
  assert.ok(!/href="[^"]*country\/SA"/.test(html), 'no href to the page-less country');
  assert.ok(!/"country\/SA"/.test(html), 'no JSON-LD item for the page-less country');
  // the country NAME still appears as plain text in the visible breadcrumb
  assert.ok(html.includes('<span>SA</span>'), 'page-less country shown as plain text in the trail');
});

test('a route to a page-HAVING country still links it', () => {
  const { html } = renderFlightRoutePage(route({ destination_country: 'DE', destination_city: 'Munich', destination_city_slug: 'munich' }), 'en', [], [], []);
  assert.ok(/href="[^"]*country\/DE"/.test(html), 'the page-having country is linked');
});
