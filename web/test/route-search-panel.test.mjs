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
  assert.doesNotMatch(html, /<style\b/i);
});

test('injects panel markup and styles safely into the full route document', () => {
  const source = '<html><head><title>Route</title></head><body><div class="route-price-box" id="route-price-box">price</div></body></html>';
  const html = renderRouteSearchPanelHtml(source, route, 'en');

  assert.match(html, /<style id="route-search-panel-styles">/);
  assert.equal((html.match(/id="route-search-panel-styles"/g) || []).length, 1);
  assert.ok(html.indexOf('<style id="route-search-panel-styles">') < html.indexOf('<div class="route-search-panel"'));
  assert.ok(html.indexOf('<div class="route-search-panel"') < html.indexOf('<div class="route-price-box"'));
});
