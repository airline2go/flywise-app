// Tests the server-rendered "average flight prices" section on route pages,
// built from the persisted price aggregates. The section is gated by the
// SHOW_ROUTE_PRICES flag (prices are hidden while the flight data comes from a
// Duffel TEST account), so each test sets the flag explicitly right before
// rendering — reliable regardless of test-file ordering in the shared process.
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

const routeRow = (over) => Object.assign(
  {
    slug: 'txl-muc', origin_iata: 'TXL', destination_iata: 'MUC',
    origin_city: 'Berlin', destination_city: 'München',
    origin_city_slug: 'berlin', destination_city_slug: 'muenchen',
    origin_country: 'DE', destination_country: 'DE', distance_km: 480, haul_type: 'short-haul',
  },
  over || {},
);
const emptyLinks = { fromOrigin: [], toDestination: [] };
const withPrices = () => { process.env.SHOW_ROUTE_PRICES = 'true'; };

test('renders average price, range and trend from persisted aggregates', () => {
  withPrices();
  const route = routeRow({ price_avg: 80, price_min: 60, price_max: 120, price_currency: 'EUR', price_trend: 'down', price_sample_count: 9, price_updated_at: '2026-07-20T00:00:00Z' });
  const { html } = renderFlightRoutePage(route, 'de', [], emptyLinks, []);
  assert.match(html, /Durchschnittliche Flugpreise/);
  assert.match(html, /80 €/);            // average
  assert.match(html, /60 € – 120 €/);    // typical range
  assert.match(html, /↓ Fallend/);        // trend
  assert.match(html, /9/);               // sample count in the note
  assert.match(html, /2026-07-20/);      // freshness date
});

test('omits the price section when there are too few samples', () => {
  withPrices();
  const route = routeRow({ price_avg: 80, price_currency: 'EUR', price_sample_count: 2 });
  const { html } = renderFlightRoutePage(route, 'de', [], emptyLinks, []);
  assert.doesNotMatch(html, /Durchschnittliche Flugpreise/);
});

test('omits the price section entirely when no price data exists', () => {
  withPrices();
  const { html } = renderFlightRoutePage(routeRow(), 'de', [], emptyLinks, []);
  assert.doesNotMatch(html, /Durchschnittliche Flugpreise/);
});

test('single-value price shows the average but no range', () => {
  withPrices();
  const route = routeRow({ price_avg: 75, price_min: 75, price_max: 75, price_currency: 'EUR', price_trend: 'stable', price_sample_count: 5 });
  const { html } = renderFlightRoutePage(route, 'en', [], emptyLinks, []);
  assert.match(html, /Average flight prices/);
  assert.match(html, /75 €/);
  assert.doesNotMatch(html, /Typical range/); // no range card when min === max
  assert.match(html, /→ Stable/);
});

test('SHOW_ROUTE_PRICES off hides EVERY price surface (section, box, meta, script)', () => {
  process.env.SHOW_ROUTE_PRICES = 'false';
  const route = routeRow({ price_avg: 80, price_min: 60, price_max: 120, price_currency: 'EUR', price_trend: 'down', price_sample_count: 9, cached_price: 58, cached_currency: 'EUR' });
  const { html } = renderFlightRoutePage(route, 'de', [], emptyLinks, []);
  assert.doesNotMatch(html, /Durchschnittliche Flugpreise/); // no average-price section
  assert.doesNotMatch(html, /id="route-price-box"/);         // no hero price box element (CSS class may still exist)
  assert.doesNotMatch(html, /\/route-price\?/);              // no live price fetch in the script
  assert.doesNotMatch(html, /58 €/);                         // no "from" price in the meta description
});
