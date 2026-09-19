import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderFlightRoutePage } = require('../lib/legacy-render/render-flight-route.js');
const { setGeoData } = require('../lib/legacy-render/data.js');
setGeoData([], []);

const base = {
  slug: 'ams-fco', origin_iata: 'AMS', destination_iata: 'FCO',
  origin_city: 'Amsterdam', destination_city: 'Rome',
  origin_city_slug: 'amsterdam', destination_city_slug: 'rome',
  origin_country: 'NL', destination_country: 'IT',
  distance_km: 1297, avg_duration_min: 135, airline_count: 3,
};
const links = { fromOrigin: [], toDestination: [] };

test('aggregate and cached route prices are ignored on every public route surface', () => {
  const route = { ...base, price_min: 60, price_avg: 90, price_max: 120, price_currency: 'EUR', price_sample_count: 9, price_updated_at: '2026-07-20T00:00:00Z', cached_price: 83, cached_currency: 'EUR' };
  const { html, seo } = renderFlightRoutePage(route, 'en', [], links, []);
  assert.doesNotMatch(html, /60 €|83 €|90 €|120 €|\/route-price|route-price-box/);
  assert.doesNotMatch(html, /"@type":"Offer"/);
  assert.doesNotMatch(seo.title, /Prices/);
  assert.doesNotMatch(seo.description, /flight prices|Flights from \d/i);
});

test('non-price route facts remain available', () => {
  const { html, seo } = renderFlightRoutePage(base, 'en', [], links, []);
  assert.match(seo.title, /Flight Time & Distance|Distance/);
  assert.match(html, /1297|1,297/);
  assert.doesNotMatch(html, /\/route-price/);
});
