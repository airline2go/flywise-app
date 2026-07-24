// Tests the Speakable (SpeakableSpecification) JSON-LD added to the WebPage
// schema of the route/city/country pages — h1 + that page's FAQ questions.
// Exercises the real render path (setGeoData + render-*), like render-seo-guards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderCityPage } = require('../lib/legacy-render/render-city.js');
const { renderCountryPage } = require('../lib/legacy-render/render-country.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');

setGeoData(
  [
    { city_slug: 'berlin', name: 'Berlin', airport_codes: ['BER', 'TXL'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', name: 'München', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
    { city_slug: 'paris', name: 'Paris', airport_codes: ['CDG'], translations: { de: 'Paris', en: 'Paris' } },
  ],
  [
    { code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } },
    { code: 'FR', translations: { de: 'Frankreich', en: 'France' } },
  ],
);

const routeRow = (over) => Object.assign(
  {
    slug: 'txl-muc', origin_iata: 'TXL', destination_iata: 'MUC',
    origin_city: 'Berlin', destination_city: 'München',
    origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
    origin_country: 'DE', destination_country: 'DE',
  },
  over || {},
);

test('route page emits a SpeakableSpecification targeting h1 + .route-faq-q', () => {
  const { html } = renderFlightRoutePage(routeRow({ distance_km: 480, haul_type: 'short-haul' }), 'de', [], { fromOrigin: [], toDestination: [] });
  assert.match(html, /"@type":"SpeakableSpecification"/);
  assert.match(html, /"cssSelector":\["h1",".route-faq-q"\]/);
});

test('city page emits a SpeakableSpecification targeting .city-faq-q', () => {
  const city = { city_slug: 'berlin', name: 'Berlin', country_code: 'DE', airport_codes: ['BER', 'TXL'], updated_at: '2026-01-01T00:00:00Z' };
  const routes = [
    routeRow({ slug: 'ber-muc', origin_iata: 'BER' }),
    routeRow({ slug: 'ber-cdg', origin_iata: 'BER', destination_iata: 'CDG', destination_city: 'Paris', destination_city_slug: 'paris', destination_country: 'FR' }),
  ];
  const { html } = renderCityPage(city, routes, 'de', {});
  assert.match(html, /"cssSelector":\["h1",".city-faq-q"\]/);
});

test('country page emits a SpeakableSpecification targeting .country-faq-q', () => {
  const country = { code: 'DE', name: 'Deutschland', translations: { de: 'Deutschland', en: 'Germany' } };
  const routes = [
    routeRow({ slug: 'ber-muc', origin_iata: 'BER' }),
    routeRow({ slug: 'ber-cdg', origin_iata: 'BER', destination_iata: 'CDG', destination_city: 'Paris', destination_city_slug: 'paris', destination_country: 'FR' }),
  ];
  const { html } = renderCountryPage(country, routes, 'de', {});
  assert.match(html, /"cssSelector":\["h1",".country-faq-q"\]/);
});
