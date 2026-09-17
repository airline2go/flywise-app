import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderPanel, renderRouteSearchPanelHtml } = require('../lib/legacy-render/route-search-panel');

const route = {
  slug: 'alicante-barcelona',
  origin_city: 'Alicante',
  destination_city: 'Barcelona',
  origin_iata: 'ALC',
  destination_iata: 'BCN',
  price_min: 30,
  price_currency: 'EUR',
  price_sample_count: 1,
  avg_duration_min: 94,
  distance_km: 406,
  direct_flight_available: true,
  airline_count: 2,
};

test('renders a connected route search form using the existing search contract', () => {
  const html = renderPanel(route, 'en');

  assert.match(html, /action="\/search\/ALC-BCN"/);
  assert.match(html, /name="depart"/);
  assert.match(html, /type="date"/);
  assert.match(html, /Alicante/);
  assert.match(html, /Barcelona/);
  assert.match(html, /30 €/);
  assert.match(html, /1h 34m/);
  assert.match(html, /<style\b/i);
});

test('renders a data-backed route snapshot brief without inventing fields', () => {
  const html = renderPanel(route, 'en');

  assert.match(html, /route-search-snapshot/);
  assert.match(html, /Route snapshot/);
  assert.match(html, /Alicante → Barcelona/);
  assert.match(html, /30 €/);
  assert.match(html, /1h 34m/);
  assert.match(html, /406 km/);
  assert.match(html, /Direct flights/);
  assert.match(html, /2/);
  assert.doesNotMatch(html, /live price/i);
});

test('injects route search into the main route document and removes the legacy price block', () => {
  const source = '<html><head><title>Route</title></head><body><main id="route-main"><div class="route-price-box" id="route-price-box">price</div></main></body></html>';
  const html = renderRouteSearchPanelHtml(source, route, 'en');

  assert.match(html, /<style id="route-search-panel-styles">/);
  assert.equal((html.match(/id="route-search-panel-styles"/g) || []).length, 1);
  assert.match(html, /<div class="route-search-panel"/);
  assert.doesNotMatch(html, /id="route-price-box"/);
  assert.doesNotMatch(html, /Search flights now/i);
  assert.doesNotMatch(html, /Last checked/i);
  assert.ok(html.indexOf('<div class="route-search-panel"') < html.indexOf('</main>'));
});
