import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { setGeoData } = require('../lib/legacy-render/data.js');
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');

setGeoData(
  [
    { city_slug: 'berlin', name: 'Berlin', airport_codes: ['TXL'], translations: { de: 'Berlin', en: 'Berlin' } },
    { city_slug: 'muenchen', name: 'München', airport_codes: ['MUC'], translations: { de: 'München', en: 'Munich' } },
  ],
  [{ code: 'DE', translations: { de: 'Deutschland', en: 'Germany' } }],
);

const route = {
  slug: 'txl-muc', origin_iata: 'TXL', destination_iata: 'MUC',
  origin_city: 'Berlin', destination_city: 'München',
  origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
  origin_country: 'DE', destination_country: 'DE', distance_km: 480, haul_type: 'short-haul',
  price_avg: 80, price_min: 60, price_max: 120, price_currency: 'EUR',
  price_trend: 'down', price_sample_count: 9, price_updated_at: '2026-07-20T00:00:00Z',
  cached_price: 83, cached_currency: 'EUR',
};
const emptyLinks = { fromOrigin: [], toDestination: [] };

test('stored route prices are never rendered after pricing retirement', () => {
  for (const lang of ['de', 'en']) {
    const { html, seo } = renderFlightRoutePage(route, lang, [], emptyLinks, []);
    assert.doesNotMatch(html, /route-price-box|Average flight prices|Durchschnittliche Flugpreise|60 €|80 €|120 €|83 €/);
    assert.doesNotMatch(html, /\/route-price/);
    assert.doesNotMatch(seo.title, /Prices|Preise/);
    assert.doesNotMatch(seo.description, /Flights from \d|Flüge ab \d|flight prices|Flugpreise/);
  }
});
